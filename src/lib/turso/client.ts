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
    const [lex, norm, example] = await Promise.all([
      client.execute('SELECT count(*) as c FROM lex'),
      client.execute('SELECT count(*) as c FROM norm'),
      client.execute('SELECT count(*) as c FROM example'),
    ]);
    return {
      configured: true,
      url: process.env.TURSO_DATABASE_URL?.replace(/auth.*$/, '...'),
      counts: {
        lex: Number(lex.rows[0]?.c ?? 0),
        norm: Number(norm.rows[0]?.c ?? 0),
        example: Number(example.rows[0]?.c ?? 0),
      },
    };
  } catch (err) {
    return {
      configured: true,
      error: err instanceof Error ? err.message : String(err),
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
  const q = query.trim();
  if (!q) return [];
  const limit = opts.limit ?? 8;
  const offset = opts.offset ?? 0;
  try {
    // 단일 UNION 쿼리 — 정확 일치 우선 + 접두 일치, 한 번의 round-trip
    const r = await client.execute({
      sql: `
        SELECT * FROM (
          SELECT *, 0 as _rank FROM lex WHERE headword = ?
          UNION ALL
          SELECT *, 1 as _rank FROM lex WHERE headword LIKE ? AND headword != ?
        )
        ORDER BY _rank, length(headword),
          CASE source WHEN 'stdict' THEN 0 WHEN 'urimalsam' THEN 1 ELSE 2 END,
          homonym_no
        LIMIT ? OFFSET ?
      `,
      args: [q, `${q}%`, q, limit, offset],
    });
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
  const q = query.trim();
  if (!q) return [];
  const limit = opts.limit ?? 6;
  const offset = opts.offset ?? 0;
  try {
    const r = await client.execute({
      sql: `SELECT * FROM example WHERE korean = ? OR korean LIKE ? OR original = ? OR original LIKE ?
            ORDER BY length(korean) LIMIT ? OFFSET ?`,
      args: [q, `${q}%`, q, `${q}%`, limit, offset],
    });
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
  const relatedNormsRaw = row.related_norms;
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
