/** 온톨로지 엔트리 — Tier A (인메모리 JSON) */
export interface OntologyEntry {
  id: string;
  category: string;
  subcategory?: string;
  title: string;
  rule_number?: string;
  description: string;
  /** 온라인가나다 출처 항목의 사용자 질의 원문 */
  question?: string;
  /** 온라인가나다 출처 항목의 답변 원문 */
  answer?: string;
  examples: Array<{
    correct: string;
    incorrect: string;
    explanation: string;
  }>;
  keywords?: string[];
  tags?: string[];
  source: string;
  source_date?: string | null;
  difficulty?: string;
  frequency?: string;
  related_entries?: string[];
  related_rules?: string[];
  history?: Array<{
    effective_date: string;
    notice: string;
    description: string;
    path?: string;
  }>;
  norm_id?: string;
}

/** 그래프 노드 / 엣지 */
export interface GraphNode {
  id: string;
  label: string;
  type: 'category' | 'rule' | 'principle' | 'example';
}

export interface GraphEdge {
  source: string;
  target: string;
  label: string;
}

export interface GraphRelations {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/** Tier B — 표제어 (Turso) */
export interface LexEntry {
  source: 'stdict' | 'urimalsam' | 'krdict';
  target_code: string;
  headword: string;
  homonym_no: number;
  pos: string;
  definition: string;
  register: string | null;
  word_grade: string | null;
  related_norms: string[];
  pronunciation: string;
  original_language: string;
  origin: string;
}

/** Tier B — 외래어/로마자 용례 */
export interface NormExampleRow {
  regulation: string;
  korean: string;
  original: string;
  country: string;
  language: string;
  meaning: string;
}

export interface SearchResult {
  source: 'tier_a' | 'tier_b_lex' | 'tier_b_norm';
  entry: OntologyEntry | LexEntry | NormExampleRow;
  score: number;
}

export interface CategoryMeta {
  id: string;
  label: string;
  color: string;
  count: number;
}
