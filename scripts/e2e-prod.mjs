#!/usr/bin/env node
/**
 * 20개 시나리오 병렬 e2e — prod 검증.
 *   node scripts/e2e-prod.mjs [base_url]
 */
const BASE = process.argv[2] ?? 'https://kocca-ontology-explorer.vercel.app';

/** @typedef {{name: string, url: string, expect: (body: string, status: number) => string | null, json?: boolean}} Scenario */

/** @type {Scenario[]} */
const scenarios = [
  // ─── 페이지 로드 (5) ────────────────────────────────────────────────
  {
    name: '[Page] 대시보드',
    url: '/',
    expect: (b, s) =>
      s !== 200 ? `HTTP ${s}` :
      !b.includes('국어지식 온톨로지 탐색기') ? '타이틀 누락' :
      !b.includes('1,694,805') ? 'Tier B 카운트 누락' :
      !b.includes('국립국어원') ? '라이선스 표기 누락' :
      null,
  },
  {
    name: '[Page] 카테고리 트리',
    url: '/tree',
    expect: (b, s) =>
      s !== 200 ? `HTTP ${s}` :
      !b.includes('카테고리 트리') ? '제목 누락' :
      !b.includes('맞춤법') ? '카테고리 누락' :
      null,
  },
  {
    name: '[Page] 지식 그래프',
    url: '/graph',
    expect: (b, s) =>
      s !== 200 ? `HTTP ${s}` :
      !b.includes('지식 그래프') ? '제목 누락' :
      !b.includes('호출하는 에이전트') && !b.includes('노드를 클릭하세요') ? '사이드 패널 누락' :
      null,
  },
  {
    name: '[Page] 어문 규범',
    url: '/norms',
    expect: (b, s) =>
      s !== 200 ? `HTTP ${s}` :
      !b.includes('어문 규범') ? '제목 누락' :
      !b.includes('한글맞춤법') ? '규정 누락' :
      null,
  },
  {
    name: '[Page] 통합 검색',
    url: '/search',
    expect: (b, s) =>
      s !== 200 ? `HTTP ${s}` :
      !b.includes('통합 검색') ? '제목 누락' :
      null,
  },

  // ─── Tier A 검색 (8) ────────────────────────────────────────────────
  {
    name: '[Search-A] 사이시옷',
    url: '/api/search?q=' + encodeURIComponent('사이시옷'),
    json: true,
    expect: (b) => {
      const d = JSON.parse(b);
      if (!d.tier_a?.length) return 'tier_a 비어있음';
      const has = d.tier_a.some((r) => r.entry.id === 'spelling-001');
      return has ? null : 'spelling-001 매칭 실패';
    },
  },
  {
    name: '[Search-A] 띄어쓰기',
    url: '/api/search?q=' + encodeURIComponent('띄어쓰기'),
    json: true,
    expect: (b) => {
      const d = JSON.parse(b);
      if (!d.tier_a?.length) return 'tier_a 비어있음';
      return d.tier_a.length >= 5 ? null : `결과 ${d.tier_a.length}건 (5건 이상 기대)`;
    },
  },
  {
    name: '[Search-A] 높임법',
    url: '/api/search?q=' + encodeURIComponent('높임법'),
    json: true,
    expect: (b) => JSON.parse(b).tier_a?.length > 0 ? null : 'tier_a 비어있음',
  },
  {
    name: '[Search-A] 외래어 카테고리',
    url: '/api/search?q=' + encodeURIComponent('외래어') + '&category=foreign',
    json: true,
    expect: (b) => {
      const d = JSON.parse(b);
      if (!d.tier_a?.length) return 'foreign 카테고리 결과 비어있음';
      const offCat = d.tier_a.find((r) => r.entry.category !== 'foreign');
      return offCat ? `다른 카테고리 섞임: ${offCat.entry.category}` : null;
    },
  },
  {
    name: '[Search-A] 방언',
    url: '/api/search?q=' + encodeURIComponent('방언'),
    json: true,
    expect: (b) => JSON.parse(b).tier_a?.length > 0 ? null : '방언 결과 0건',
  },
  {
    name: '[Search-A] 로마자',
    url: '/api/search?q=' + encodeURIComponent('로마자'),
    json: true,
    expect: (b) => JSON.parse(b).tier_a?.length > 0 ? null : '로마자 결과 0건',
  },
  {
    name: '[Search-A] 한글맞춤법 제30항',
    url: '/api/search?q=' + encodeURIComponent('한글 맞춤법 제30항'),
    json: true,
    expect: (b) => {
      const d = JSON.parse(b);
      const has = d.tier_a?.some((r) =>
        r.entry.rule_number?.includes('제30항') || r.entry.id?.includes('30'),
      );
      return has ? null : '제30항 매칭 실패';
    },
  },
  {
    name: '[Search-A] tier=a만',
    url: '/api/search?q=' + encodeURIComponent('사이시옷') + '&tier=a',
    json: true,
    expect: (b) => {
      const d = JSON.parse(b);
      return d.tier_b_lex.length === 0 && d.tier_b_foreign.length === 0
        ? (d.tier_a.length > 0 ? null : 'tier_a 비어있음')
        : `tier=a인데 Tier B 결과 있음`;
    },
  },

  // ─── Tier B 검색 (5) ─────────────────────────────────────────────────
  {
    name: '[Search-B] 카페 lex',
    url: '/api/search?q=' + encodeURIComponent('카페'),
    json: true,
    expect: (b) => {
      const d = JSON.parse(b);
      if (!d.turso) return 'turso=false (Tier B 미연결)';
      if (d.tier_b_lex.length < 5) return `lex ${d.tier_b_lex.length}건 (5건 이상 기대)`;
      return d.tier_b_lex.some((l) => l.headword === '카페') ? null : '카페 표제어 매칭 실패';
    },
  },
  {
    name: '[Search-B] coffee 역방향',
    url: '/api/search?q=coffee',
    json: true,
    expect: (b) => {
      const d = JSON.parse(b);
      if (!d.turso) return 'turso=false';
      return d.tier_b_foreign.length >= 3 ? null : `foreign ${d.tier_b_foreign.length}건`;
    },
  },
  {
    name: '[Search-B] 사이시옷 우리말샘',
    url: '/api/search?q=' + encodeURIComponent('사이시옷'),
    json: true,
    expect: (b) => {
      const d = JSON.parse(b);
      if (!d.tier_b_lex.length) return 'lex 비어있음 (사이시옷^삽입 등 기대)';
      return d.tier_b_lex.some((l) => l.source === 'urimalsam') ? null : '우리말샘 매칭 실패';
    },
  },
  {
    name: '[Search-B] 도서관',
    url: '/api/search?q=' + encodeURIComponent('도서관'),
    json: true,
    expect: (b) => {
      const d = JSON.parse(b);
      if (!d.turso) return 'turso=false';
      return d.tier_b_lex.length >= 3 ? null : `lex ${d.tier_b_lex.length}건 (3건 이상 기대)`;
    },
  },
  {
    name: '[Search-B] tier=b만',
    url: '/api/search?q=' + encodeURIComponent('카페') + '&tier=b',
    json: true,
    expect: (b) => {
      const d = JSON.parse(b);
      return d.tier_a.length === 0 && d.tier_b_lex.length > 0 ? null : 'tier=b 분리 실패';
    },
  },

  // ─── 엔트리 상세 (2) ────────────────────────────────────────────────
  {
    name: '[Entry] spelling-001 (사이시옷)',
    url: '/entry/' + encodeURIComponent('spelling-001'),
    expect: (b, s) =>
      s !== 200 ? `HTTP ${s}` :
      !b.includes('사이시옷') ? '제목 누락' :
      !b.includes('한글 맞춤법 제30항') ? '규칙번호 누락' :
      null,
  },
  {
    name: '[Entry] kornorms-0001-030 (어문 규범 본문)',
    url: '/entry/' + encodeURIComponent('kornorms-0001-030'),
    expect: (b, s) =>
      s !== 200 ? `HTTP ${s}` :
      !b.includes('한글맞춤법') ? '규정 누락' :
      null,
  },
];

console.log(`▶ ${BASE} 에 ${scenarios.length}개 시나리오 병렬 실행\n`);

const results = await Promise.all(
  scenarios.map(async (s, idx) => {
    const url = BASE + s.url;
    const startedAt = Date.now();
    try {
      const r = await fetch(url, {
        signal: AbortSignal.timeout(30000),
        headers: { 'User-Agent': `e2e-bot-${idx + 1}/1.0` },
      });
      const body = await r.text();
      const elapsed = Date.now() - startedAt;
      const err = s.expect(body, r.status);
      return { idx, name: s.name, ok: err === null, error: err, status: r.status, elapsed, size: body.length };
    } catch (e) {
      return {
        idx,
        name: s.name,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
        status: 0,
        elapsed: Date.now() - startedAt,
        size: 0,
      };
    }
  }),
);

results.sort((a, b) => a.idx - b.idx);

const pass = results.filter((r) => r.ok);
const fail = results.filter((r) => !r.ok);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
for (const r of results) {
  const mark = r.ok ? '✅' : '❌';
  const status = String(r.status).padStart(3);
  const elapsed = (r.elapsed + 'ms').padStart(6);
  const size = (Math.round(r.size / 1024) + 'KB').padStart(5);
  console.log(`${mark} #${String(r.idx + 1).padStart(2)} ${r.name.padEnd(40)} ${status} ${elapsed} ${size}${r.error ? `  ⚠ ${r.error}` : ''}`);
}
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`\n총 ${results.length}건 — ✅ 통과 ${pass.length} / ❌ 실패 ${fail.length}`);

// 통계
const sortedTime = [...results].map((r) => r.elapsed).sort((a, b) => a - b);
const p50 = sortedTime[Math.floor(sortedTime.length * 0.5)];
const p95 = sortedTime[Math.floor(sortedTime.length * 0.95)];
const max = sortedTime[sortedTime.length - 1];
console.log(`응답 시간: p50=${p50}ms / p95=${p95}ms / max=${max}ms`);

if (fail.length > 0) {
  console.log('\n❌ 실패 상세:');
  for (const f of fail) console.log(`  - #${f.idx + 1} ${f.name}: ${f.error}`);
  process.exit(1);
}
console.log('\n✅ 모든 시나리오 통과');
