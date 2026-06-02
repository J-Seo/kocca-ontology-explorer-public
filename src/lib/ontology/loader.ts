/**
 * Tier A 인메모리 로더 — 17개 JSON을 일괄 import해 카테고리별/단일 검색을 제공한다.
 */
import type { OntologyEntry, GraphRelations, CategoryMeta } from '../types';

import spellingRules from '@/data/ontology/spelling-rules.json';
import grammarRules from '@/data/ontology/grammar-rules.json';
import vocabularyRules from '@/data/ontology/vocabulary.json';
import spacingRules from '@/data/ontology/spacing-rules.json';
import pronunciationRules from '@/data/ontology/pronunciation-rules.json';
import foreignRules from '@/data/ontology/foreign-rules.json';
import honorificRules from '@/data/ontology/honorific-rules.json';
import expressionRules from '@/data/ontology/expression-rules.json';
import standardRules from '@/data/ontology/standard-rules.json';
import romanizationRules from '@/data/ontology/romanization-rules.json';
import purificationRules from '@/data/ontology/purification-rules.json';
import terminologyRules from '@/data/ontology/terminology-rules.json';
import spacingAdvancedRules from '@/data/ontology/spacing-advanced-rules.json';
import punctuationRules from '@/data/ontology/punctuation-rules.json';
import dialectRules from '@/data/ontology/dialect-rules.json';
import educationRules from '@/data/ontology/education-rules.json';
import kornormsArticles from '@/data/ontology/kornorms-articles.json';
import kornormsAppendix from '@/data/ontology/kornorms-appendix-history.json';
import graphRelationsRaw from '@/data/ontology/graph-relations.json';

interface CategoryDef {
  id: string;
  label: string;
  data: unknown[];
}

const CATEGORIES: CategoryDef[] = [
  { id: 'spelling', label: '맞춤법', data: spellingRules },
  { id: 'grammar', label: '문법', data: grammarRules },
  { id: 'vocabulary', label: '혼동 어휘', data: vocabularyRules },
  { id: 'spacing', label: '띄어쓰기', data: spacingRules },
  { id: 'pronunciation', label: '발음·표기', data: pronunciationRules },
  { id: 'expression', label: '표현·문체', data: expressionRules },
  { id: 'punctuation', label: '문장부호', data: punctuationRules },
  { id: 'foreign', label: '외래어', data: foreignRules },
  { id: 'honorific', label: '높임법', data: honorificRules },
  { id: 'standard', label: '표준어', data: standardRules },
  { id: 'romanization', label: '로마자', data: romanizationRules },
  { id: 'terminology', label: '전문용어', data: terminologyRules },
  { id: 'spacing-advanced', label: '띄어쓰기 심화', data: spacingAdvancedRules },
  { id: 'dialect', label: '방언', data: dialectRules },
  { id: 'education', label: '한국어 교육', data: educationRules },
  { id: 'purification', label: '순화어', data: purificationRules },
  { id: 'kornorms', label: '어문 규범 (110조항)', data: kornormsArticles },
];

const CATEGORY_COLORS: Record<string, string> = {
  spelling: '#7C3AED',
  grammar: '#059669',
  vocabulary: '#D97706',
  spacing: '#0891B2',
  pronunciation: '#9333EA',
  expression: '#DC2626',
  punctuation: '#EA580C',
  foreign: '#65A30D',
  honorific: '#4F46E5',
  standard: '#0D9488',
  romanization: '#BE185D',
  terminology: '#7C2D12',
  'spacing-advanced': '#0EA5E9',
  dialect: '#84CC16',
  education: '#06B6D4',
  purification: '#15803D',
  kornorms: '#1E40AF',
};

const ALL_ENTRIES: OntologyEntry[] = CATEGORIES.flatMap((c) => c.data as OntologyEntry[]);
const BY_ID = new Map<string, OntologyEntry>(ALL_ENTRIES.map((e) => [e.id, e]));

export const ONTOLOGY_TOTAL = ALL_ENTRIES.length;

export function getAllEntries(): OntologyEntry[] {
  return ALL_ENTRIES;
}

export function getEntry(id: string): OntologyEntry | undefined {
  return BY_ID.get(id);
}

export function getCategories(): CategoryMeta[] {
  return CATEGORIES.map((c) => ({
    id: c.id,
    label: c.label,
    color: CATEGORY_COLORS[c.id] ?? '#6B7280',
    count: (c.data as OntologyEntry[]).length,
  }));
}

export function getEntriesByCategory(categoryId: string): OntologyEntry[] {
  const cat = CATEGORIES.find((c) => c.id === categoryId);
  if (!cat) return [];
  return cat.data as OntologyEntry[];
}

export function getKornormsArticles(): OntologyEntry[] {
  return kornormsArticles as unknown as OntologyEntry[];
}

export function getKornormsAppendixHistory() {
  return kornormsAppendix as unknown as Array<{
    id: string;
    regulation: string;
    title: string;
    path: string;
    history: Array<{ effective_date: string; description: string; path: string }>;
  }>;
}

export function getGraphRelations(): GraphRelations {
  return graphRelationsRaw as GraphRelations;
}

// ─── 단순 검색 (Tier A) — 키워드·태그·제목 가중 점수 ──

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^가-힯a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

function scoreEntry(entry: OntologyEntry, tokens: string[]): number {
  let score = 0;
  const keywords = entry.keywords ?? [];
  const tags = entry.tags ?? [];
  const title = (entry.title ?? '').toLowerCase();
  const desc = (entry.description ?? '').toLowerCase();

  for (const t of tokens) {
    for (const k of keywords) {
      const kl = k.toLowerCase();
      if (kl === t) score += 5;
      else if (kl.includes(t) || t.includes(kl)) score += 3;
    }
    for (const tag of tags) {
      if (tag.toLowerCase().includes(t)) score += 2;
    }
    if (title.includes(t)) score += 4;
    if (desc.includes(t)) score += 1;
  }
  return score;
}

export function searchOntology(query: string, opts?: {
  limit?: number;
  category?: string;
}): { entry: OntologyEntry; score: number }[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];
  const pool = opts?.category ? getEntriesByCategory(opts.category) : ALL_ENTRIES;
  const scored = pool
    .map((e) => ({ entry: e, score: scoreEntry(e, tokens) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, opts?.limit ?? 20);
}
