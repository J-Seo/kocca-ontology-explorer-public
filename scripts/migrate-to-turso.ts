/**
 * lexicon.sqlite (로컬 810MB) → Turso 마이그레이션.
 *
 * 사전 준비:
 *   1. .env.local에 TURSO_DATABASE_URL + TURSO_AUTH_TOKEN 설정
 *   2. demo/src/data/lexicon/lexicon.sqlite 존재 확인
 *
 * 실행:
 *   npm run migrate:turso
 *
 * 동작:
 *   - 로컬 sqlite 열기 → 스키마 추출 → Turso에 동일 스키마 생성
 *   - 표제어/규범/용례 청크 단위로 INSERT (batch=500)
 *   - 진행률을 실시간 표시
 *
 * 약 8-15분 소요 (170만 표제어 + 80k 용례).
 */
import { createClient } from '@libsql/client';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const LOCAL_DB = process.env.LEXICON_SQLITE_PATH
  ?? path.resolve(process.cwd(), '../demo/src/data/lexicon/lexicon.sqlite');

async function main() {
  // 환경변수 확인
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    console.error('❌ TURSO_DATABASE_URL과 TURSO_AUTH_TOKEN 환경변수가 필요합니다.');
    console.error('   .env.local 또는 셸 환경에 설정하세요:');
    console.error('     TURSO_DATABASE_URL=libsql://<db>-<org>.turso.io');
    console.error('     TURSO_AUTH_TOKEN=<turso db tokens create <db> 결과>');
    process.exit(1);
  }

  if (!fs.existsSync(LOCAL_DB)) {
    console.error(`❌ 로컬 SQLite 파일이 없습니다: ${LOCAL_DB}`);
    console.error('   LEXICON_SQLITE_PATH 환경변수로 경로를 지정할 수 있습니다.');
    process.exit(1);
  }

  console.log(`📂 로컬 DB: ${LOCAL_DB}`);
  console.log(`☁️  Turso: ${url}`);
  console.log('');

  const local = new DatabaseSync(LOCAL_DB, { readOnly: true });
  const turso = createClient({ url, authToken });

  // 1. 스키마 추출
  const schemaRows = local
    .prepare(`SELECT sql FROM sqlite_master WHERE type IN ('table','index') AND sql IS NOT NULL`)
    .all() as Array<{ sql: string }>;

  console.log(`📋 스키마 ${schemaRows.length}건 가져옴`);
  const tableSqls = schemaRows
    .map((r) => r.sql)
    .filter((sql) => sql && !sql.includes('sqlite_'))
    // FTS5 가상테이블은 Turso 호환성 위해 제외 (필요 시 별도 트리거로 재생성)
    .filter((sql) => !/USING\s+fts5/i.test(sql));

  // 2. Turso에 스키마 생성 (idempotent)
  for (const sql of tableSqls) {
    const isIndex = /CREATE\s+INDEX/i.test(sql);
    const fixed = isIndex
      ? sql.replace(/CREATE\s+INDEX/i, 'CREATE INDEX IF NOT EXISTS')
      : sql.replace(/CREATE\s+TABLE/i, 'CREATE TABLE IF NOT EXISTS');
    try {
      await turso.execute(fixed);
      console.log(`  ✓ ${fixed.slice(0, 80).replace(/\s+/g, ' ')}...`);
    } catch (err) {
      console.warn(`  ⚠ ${fixed.slice(0, 80)} — ${err instanceof Error ? err.message : err}`);
    }
  }
  console.log('');

  // 3. 테이블 목록 가져오기
  const tables = (local
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '%_fts%'`)
    .all() as Array<{ name: string }>)
    .map((r) => r.name);

  console.log(`📦 ${tables.length}개 테이블 마이그레이션: ${tables.join(', ')}`);
  console.log('');

  // 4. 각 테이블 데이터 복사
  for (const table of tables) {
    const countRow = local.prepare(`SELECT count(*) as c FROM ${table}`).get() as { c: number };
    const total = countRow.c;
    if (total === 0) {
      console.log(`  ${table}: 빈 테이블 — 스킵`);
      continue;
    }

    // 기존 Turso 데이터 확인
    const existingRow = await turso.execute(`SELECT count(*) as c FROM ${table}`);
    const existing = Number(existingRow.rows[0]?.c ?? 0);
    if (existing >= total) {
      console.log(`  ${table}: 이미 ${existing}/${total} 마이그레이션됨 — 스킵`);
      continue;
    }

    // 컬럼 목록
    const cols = (local.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>)
      .map((c) => c.name);

    console.log(`  ${table}: ${existing}/${total} → 마이그레이션 시작 (컬럼 ${cols.length}개)`);
    const BATCH = 200;        // Turso 게이트웨이 안정성 위해 축소 (500 → 200)
    const MAX_RETRIES = 6;
    let offset = existing;
    const startedAt = Date.now();
    let lastLog = startedAt;

    while (offset < total) {
      const rows = local
        .prepare(`SELECT ${cols.join(',')} FROM ${table} LIMIT ${BATCH} OFFSET ${offset}`)
        .all() as Array<Record<string, unknown>>;
      if (rows.length === 0) break;

      const stmts = rows.map((row) => ({
        sql: `INSERT OR IGNORE INTO ${table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`,
        args: cols.map((c) => {
          const v = row[c];
          if (v === null || v === undefined) return null;
          if (typeof v === 'bigint') return Number(v);
          if (typeof v === 'string' || typeof v === 'number' || v instanceof Uint8Array) return v;
          return String(v);
        }),
      }));

      // 자동 재시도 — 502/503/network 에러는 일시적, exponential backoff
      let attempt = 0;
      while (true) {
        try {
          await turso.batch(stmts, 'write');
          break;
        } catch (err) {
          attempt++;
          const msg = err instanceof Error ? err.message : String(err);
          const retriable = /502|503|504|bad gateway|gateway timeout|ECONNRESET|ETIMEDOUT|fetch failed|SERVER_ERROR/i.test(msg);
          if (!retriable || attempt >= MAX_RETRIES) throw err;
          const wait = Math.min(30000, 1000 * 2 ** (attempt - 1));
          console.log(`    ⚠ batch 실패 (${attempt}/${MAX_RETRIES}) ${msg.slice(0, 80)} — ${wait}ms 후 재시도`);
          await new Promise((r) => setTimeout(r, wait));
        }
      }
      offset += rows.length;

      const now = Date.now();
      if (now - lastLog > 2000) {
        const elapsed = (now - startedAt) / 1000;
        const rate = (offset - existing) / elapsed;
        const eta = (total - offset) / rate;
        console.log(
          `    ${offset}/${total} (${((offset / total) * 100).toFixed(1)}%, ${rate.toFixed(0)} rows/s, ETA ${eta.toFixed(0)}s)`,
        );
        lastLog = now;
      }
    }
    console.log(`  ${table}: 완료 (${total} rows, ${((Date.now() - startedAt) / 1000).toFixed(1)}s)`);
  }

  local.close();
  console.log('\n✅ 마이그레이션 완료');
}

main().catch((err) => {
  console.error('❌ 마이그레이션 실패:', err);
  process.exit(1);
});
