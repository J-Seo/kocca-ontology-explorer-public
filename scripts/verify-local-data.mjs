#!/usr/bin/env node
/**
 * Tier A 번들 데이터 점검 (네트워크·Turso 불필요).
 *   node scripts/verify-local-data.mjs
 *
 * - src/data/ontology/ 의 모든 JSON이 유효한지 파싱
 * - loader.ts의 17개 카테고리 합계(ONTOLOGY_TOTAL)와 어문 규범·그래프 수치 검증
 * 기대값이 어긋나면 비정상 종료(1). CI나 배포 전 빠른 가드로 쓰세요.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'src/data/ontology');

// loader.ts CATEGORIES와 동일한 17개 카테고리 (kornorms-articles 포함, appendix 제외)
const CATEGORY_FILES = [
  'spelling-rules.json', 'grammar-rules.json', 'vocabulary.json', 'spacing-rules.json',
  'pronunciation-rules.json', 'expression-rules.json', 'punctuation-rules.json',
  'foreign-rules.json', 'honorific-rules.json', 'standard-rules.json',
  'romanization-rules.json', 'terminology-rules.json', 'spacing-advanced-rules.json',
  'dialect-rules.json', 'education-rules.json', 'purification-rules.json',
  'kornorms-articles.json',
];

const EXPECT = {
  ontologyTotal: 4545,   // 17개 카테고리 엔트리 합계
  categories: 17,
  kornormsArticles: 110,
  appendixHistory: 380,
  graphNodes: 259,
  graphEdges: 269,
};

let failed = 0;
const check = (label, got, want) => {
  const ok = got === want;
  if (!ok) failed++;
  console.log(`${ok ? '✅' : '❌'} ${label}: ${got}${ok ? '' : ` (기대 ${want})`}`);
};

// 1. 모든 JSON 파싱
const load = (name) => {
  const p = path.join(DIR, name);
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    console.log(`❌ JSON 파싱 실패: ${name} — ${e.message}`);
    failed++;
    return null;
  }
};

let total = 0;
for (const f of CATEGORY_FILES) {
  const j = load(f);
  if (Array.isArray(j)) total += j.length;
}
const appendix = load('kornorms-appendix-history.json');
const graph = load('graph-relations.json');
const articles = load('kornorms-articles.json');

// 2. 수치 검증
check('Tier A 카테고리 수', CATEGORY_FILES.length, EXPECT.categories);
check('Tier A 엔트리 합계 (ONTOLOGY_TOTAL)', total, EXPECT.ontologyTotal);
check('어문 규범 핵심 조항', Array.isArray(articles) ? articles.length : -1, EXPECT.kornormsArticles);
check('부록 변경 이력', Array.isArray(appendix) ? appendix.length : -1, EXPECT.appendixHistory);
check('그래프 노드', graph?.nodes?.length ?? -1, EXPECT.graphNodes);
check('그래프 엣지', graph?.edges?.length ?? -1, EXPECT.graphEdges);

console.log('');
if (failed > 0) {
  console.log(`❌ ${failed}건 불일치 — Tier A 데이터 또는 기대값을 확인하세요.`);
  process.exit(1);
}
console.log('✅ Tier A 데이터 점검 통과');
