/**
 * Turso (libSQL) 클라이언트 — Tier B 표제어·어문 규범 검색.
 *
 * 환경변수:
 *   TURSO_DATABASE_URL    libsql://<db>-<org>.turso.io
 *   TURSO_AUTH_TOKEN      turso db tokens create <db> 결과물
 *
 * 환경변수가 없으면 isTursoConfigured()가 false를 반환하고, 모든 호출은
 * 빈 결과를 반환한다 (UI는 Tier B 미설정 배너 표시).
 */
import { createClient, type Client } from '@libsql/client';
import type { LexEntry, NormExampleRow } from '../types';

let _client: Client | null = null;

function getClient(): Client | null {
  if (_client) return _client;
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) return null;
  _client = createClient({ url, authToken });
  return _client;
}

export function isTursoConfigured(): boolean {
  return Boolean(process.env.TURSO_DATABASE_URL);
}

// Turso가 느리거나 응답이 없을 때 무한 대기하지 않도록 쿼리에 상한 시간을 둔다.
// 초과 시 reject → 각 함수의 try/catch가 빈 결과를 반환 → 검색은 Tier A로 graceful degrade.
const QUERY_TIMEOUT_MS = 8000;
function withTimeout<T>(p: Promise<T>, ms = QUERY_TIMEOUT_MS): Promise<T> {
  let t: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    t = setTimeout(() => reject(new Error('turso query timeout')), ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(t));
}

// libsql URL에서 호스트만 노출 (토큰은 authToken에 있고 URL 자체는 비밀이 아니지만 최소 노출).
function maskUrl(u?: string): string | undefined {
  if (!u) return undefined;
  try { return new URL(u).host; } catch { return undefined; }
}

// 오류 메시지에 libsql:// URL이 섞여 클라이언트(대시보드)로 노출되지 않도록 제거.
function sanitizeError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.replace(/libsql:\/\/\S+/gi, 'libsql://<redacted>').slice(0, 200);
}

// LIKE 패턴에서 사용자 입력의 %, _, \ 를 이스케이프 (와일드카드 오작동 방지).
function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => '\\' + c);
}

export interface TursoStatus {
  configured: boolean;
  url?: string;
  counts?: {
    lex: number;
    norm: number;
    example: number;
  };
  error?: string;
}

export async function getTursoStatus(): Promise<TursoStatus> {
  const client = getClient();
  if (!client) return { configured: false };
  try {
    // counts는 마이그레이션 시 meta 테이블에 복사돼 있다. COUNT(*)는 170만 행
    // 풀스캔이라 대시보드가 매 요청 10초 이상 걸리므로 meta를 우선 읽는다.
    const metaRow = await withTimeout(
      client.execute("SELECT value FROM meta WHERE key = 'counts'"),
    );
    const raw = metaRow.rows[0]?.value;
    if (typeof raw === 'string') {
      const c = JSON.parse(raw) as {
        total_lex?: number; norm_articles?: number; examples?: number;
      };
      return {
        configured: true,
        url: maskUrl(process.env.TURSO_DATABASE_URL),
        counts: {
          lex: Number(c.total_lex ?? 0),
          norm: Number(c.norm_articles ?? 0),
          example: Number(c.examples ?? 0),
        },
      };
    }
    // meta가 없는 구버전 마이그레이션이면 COUNT로 폴백.
    const [lex, norm, example] = await withTimeout(Promise.all([
      client.execute('SELECT count(*) as c FROM lex'),
      client.execute('SELECT count(*) as c FROM norm'),
      client.execute('SELECT count(*) as c FROM example'),
    ]));
    return {
      configured: true,
      url: maskUrl(process.env.TURSO_DATABASE_URL),
      counts: {
        lex: Number(lex.rows[0]?.c ?? 0),
        norm: Number(norm.rows[0]?.c ?? 0),
        example: Number(example.rows[0]?.c ?? 0),
      },
    };
  } catch (err) {
    return {
      configured: true,
      error: sanitizeError(err),
    };
  }
}

// ─── 검색 ─────────────────────────────────────────────────────────────

/** 표제어 검색 — 정확/접두 2단계 + offset 지원 */
export async function searchLex(
  query: string,
  opts: { limit?: number; offset?: number } = {},
): Promise<LexEntry[]> {
  const client = getClient();
  if (!client) return [];
  // NFC 정규화 — 저장된 표제어는 NFC(완성형)라 NFD 입력은 그대로면 매칭 실패한다.
  const q = query.normalize('NFC').trim();
  if (!q) return [];
  const limit = opts.limit ?? 8;
  const offset = opts.offset ?? 0;
  // 접두 검색의 상한 경계. "q로 시작하는 모든 문자열" = [q, q + U+FFFF) 범위.
  const prefixUpper = q + String.fromCodePoint(0xffff);
  try {
    // 단일 UNION 쿼리 — 정확 일치 우선 + 접두 일치, 한 번의 round-trip.
    // 접두 일치는 LIKE 'q%' 대신 범위 비교(headword >= q AND headword < q+U+FFFF)를 쓴다.
    // SQLite 기본 LIKE는 대소문자 무시라 idx_lex_headword 인덱스를 못 타고 170만 행
    // 풀스캔(원격 Turso에서 15~34초)이 된다. 범위 비교는 인덱스를 타며, 한글 표제어
    // 기준으로 LIKE와 동일한 결과를 반환함을 검증했다.
    const r = await withTimeout(client.execute({
      sql: `
        SELECT * FROM (
          SELECT *, 0 as _rank FROM lex WHERE headword = ?
          UNION ALL
          SELECT *, 1 as _rank FROM lex WHERE headword >= ? AND headword < ? AND headword != ?
        )
        ORDER BY _rank, length(headword),
          CASE source WHEN 'stdict' THEN 0 WHEN 'urimalsam' THEN 1 ELSE 2 END,
          homonym_no, target_code
        LIMIT ? OFFSET ?
      `,
      args: [q, q, prefixUpper, q, limit, offset],
    }));
    return r.rows.map(rowToLex);
  } catch (err) {
    console.warn('[turso] searchLex error:', err);
    return [];
  }
}

/** 어문 규범 조항 조회 */
export async function getNormById(id: string) {
  const client = getClient();
  if (!client) return null;
  try {
    const r = await client.execute({
      sql: 'SELECT * FROM norm WHERE id = ? LIMIT 1',
      args: [id],
    });
    return r.rows[0] ?? null;
  } catch {
    return null;
  }
}

/** 외래어/로마자 표기 검색 */
export async function searchForeignNotation(
  query: string,
  opts: { limit?: number; offset?: number } = {},
): Promise<NormExampleRow[]> {
  const client = getClient();
  if (!client) return [];
  const q = query.normalize('NFC').trim();
  if (!q) return [];
  const limit = opts.limit ?? 6;
  const offset = opts.offset ?? 0;
  try {
    // example(약 8만 행)은 작아 LIKE 풀스캔이 허용 범위다. 또한 original은 로마자라
    // 대소문자 무시 LIKE가 오히려 바람직하므로 범위 비교로 바꾸지 않는다.
    // 사용자 입력의 %·_ 는 이스케이프, 정렬은 rowid로 안정화(페이지네이션 일관성).
    const likeQ = escapeLike(q);
    const r = await withTimeout(client.execute({
      sql: `SELECT * FROM example
            WHERE korean = ? OR korean LIKE ? ESCAPE '\\'
               OR original = ? OR original LIKE ? ESCAPE '\\'
            ORDER BY length(korean), rowid LIMIT ? OFFSET ?`,
      args: [q, `${likeQ}%`, q, `${likeQ}%`, limit, offset],
    }));
    return r.rows.map((row): NormExampleRow => ({
      regulation: String(row.regulation ?? ''),
      korean: String(row.korean ?? ''),
      original: String(row.original ?? ''),
      country: String(row.country ?? ''),
      language: String(row.language ?? ''),
      meaning: String(row.meaning ?? ''),
    }));
  } catch (err) {
    console.warn('[turso] searchForeignNotation error:', err);
    return [];
  }
}

function rowToLex(row: Record<string, unknown>): LexEntry {
  // SQLite 컬럼명은 related_norms_json (related_norms 아님). 이전엔 잘못된 키를
  // 읽어 Tier B 결과의 관련 규범이 항상 비어 있었다.
  const relatedNormsRaw = row.related_norms_json;
  let relatedNorms: string[] = [];
  if (typeof relatedNormsRaw === 'string' && relatedNormsRaw) {
    try { relatedNorms = JSON.parse(relatedNormsRaw); }
    catch { relatedNorms = []; }
  }
  return {
    source: row.source as LexEntry['source'],
    target_code: String(row.target_code ?? ''),
    headword: String(row.headword ?? ''),
    homonym_no: Number(row.homonym_no ?? 0),
    pos: String(row.pos ?? ''),
    definition: String(row.definition ?? ''),
    register: row.register as string | null,
    word_grade: row.word_grade as string | null,
    related_norms: relatedNorms,
    pronunciation: String(row.pronunciation ?? ''),
    original_language: String(row.original_language ?? ''),
    origin: String(row.origin ?? ''),
  };
}
