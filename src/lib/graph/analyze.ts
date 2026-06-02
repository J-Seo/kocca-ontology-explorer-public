/**
 * 그래프 인접성·계층 분석 유틸.
 *
 * graph-relations.json의 edges는 방향성이 있지만 라벨에 따라 의미가 다름:
 *   "포함" (source: category, target: rule) — 계층적 부모→자식
 *   기타 라벨 ("관련 규칙", "어휘 연계" 등) — 의미적 관계 (방향 무관)
 */

import type { GraphNode, GraphEdge, GraphRelations } from '../types';

export interface NodeNeighborhood {
  /** 부모 (이 노드를 "포함"하는 source 노드들) */
  parents: { node: GraphNode; edge: GraphEdge }[];
  /** 자식 (이 노드가 "포함"하는 target 노드들) */
  children: { node: GraphNode; edge: GraphEdge }[];
  /** 형제 (같은 부모를 공유하는 다른 자식들) */
  siblings: GraphNode[];
  /** 관련 (포함 외 라벨, 방향 무관) */
  related: { node: GraphNode; edge: GraphEdge; direction: 'in' | 'out' }[];
  /** 1-hop 이웃 노드 id 전체 (강조용) */
  oneHopIds: Set<string>;
}

export function analyzeNeighborhood(
  nodeId: string,
  graph: GraphRelations,
): NodeNeighborhood {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const parents: NodeNeighborhood['parents'] = [];
  const children: NodeNeighborhood['children'] = [];
  const related: NodeNeighborhood['related'] = [];
  const parentIds = new Set<string>();

  for (const e of graph.edges) {
    if (e.target === nodeId && e.label === '포함') {
      const src = byId.get(e.source);
      if (src) { parents.push({ node: src, edge: e }); parentIds.add(src.id); }
    } else if (e.source === nodeId && e.label === '포함') {
      const tgt = byId.get(e.target);
      if (tgt) children.push({ node: tgt, edge: e });
    } else if (e.source === nodeId || e.target === nodeId) {
      const otherId = e.source === nodeId ? e.target : e.source;
      const other = byId.get(otherId);
      if (other) {
        related.push({
          node: other,
          edge: e,
          direction: e.source === nodeId ? 'out' : 'in',
        });
      }
    }
  }

  // 형제 — 부모를 공유하는 자식들 중 본인 제외
  const siblingIds = new Set<string>();
  for (const p of parents) {
    for (const e of graph.edges) {
      if (e.source === p.node.id && e.label === '포함' && e.target !== nodeId) {
        siblingIds.add(e.target);
      }
    }
  }
  const siblings = Array.from(siblingIds)
    .map((id) => byId.get(id))
    .filter((n): n is GraphNode => Boolean(n));

  const oneHopIds = new Set<string>([
    ...parents.map((p) => p.node.id),
    ...children.map((c) => c.node.id),
    ...related.map((r) => r.node.id),
  ]);

  return { parents, children, siblings, related, oneHopIds };
}

/** 부모 카테고리 id 추론 — 노드의 첫 번째 "포함" parent */
export function findParentCategoryId(
  nodeId: string,
  graph: GraphRelations,
): string | undefined {
  for (const e of graph.edges) {
    if (e.target === nodeId && e.label === '포함') {
      const src = graph.nodes.find((n) => n.id === e.source);
      if (src?.type === 'category') return src.id;
    }
  }
  return undefined;
}

/** 쿼리로 그래프 노드 검색 — label 부분 매칭 (대소문자 무시) */
export function searchGraphNodes(query: string, graph: GraphRelations): GraphNode[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return graph.nodes.filter((n) => n.label.toLowerCase().includes(q));
}
