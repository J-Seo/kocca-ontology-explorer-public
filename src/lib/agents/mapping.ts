/**
 * 멀티에이전트 시스템과 온톨로지의 매핑.
 *
 * 이 사이트는 단순 시각화가 아니라 **멀티에이전트 시스템의 Tool Calling +
 * Graph RAG 근거 추적용** 도구이다. 각 노드/카테고리가 어떤 에이전트에서
 * 어떻게 호출되는지 명시한다.
 *
 * 출처: demo/src/lib/agents/ontology-orchestrator.ts의 determineCategories()
 *      + 각 에이전트의 시스템 프롬프트
 */

export type AgentType = 'knowledge' | 'correction' | 'scoring';

export interface AgentInfo {
  id: AgentType;
  label: string;
  color: string;
  description: string;
  /** 어떤 ontology 카테고리를 사용하는지 */
  categories: string[];
  /** 이 에이전트의 행동 유형 (TaskNotification.actionType) */
  actionType: 'apply' | 'validate' | 'reference';
  /** 인용 가중치 (이 에이전트가 이 카테고리를 얼마나 신뢰하는지) */
}

export const AGENTS: AgentInfo[] = [
  {
    id: 'knowledge',
    label: '지식·상담 에이전트',
    color: '#7C3AED',
    description: '맞춤법·문법·어휘·표현 등 규칙·원리 질의에 답변. ontology를 인용·참조',
    categories: ['spelling', 'grammar', 'vocabulary', 'expression', 'pronunciation', 'kornorms'],
    actionType: 'reference',
  },
  {
    id: 'correction',
    label: '교정·첨삭 에이전트',
    color: '#059669',
    description: '문장의 맞춤법/띄어쓰기/문법 오류를 진단·수정. ontology 규칙을 직접 적용',
    categories: ['spelling', 'grammar', 'spacing', 'expression', 'punctuation', 'kornorms'],
    actionType: 'apply',
  },
  {
    id: 'scoring',
    label: '채점·진단 에이전트',
    color: '#D97706',
    description: '글의 품질을 다차원 루브릭으로 평가·진단. ontology로 검증',
    categories: ['grammar', 'expression'],
    actionType: 'validate',
  },
];

/** 카테고리 id로 이 카테고리를 사용하는 에이전트 목록 반환 */
export function agentsByCategory(categoryId: string): AgentInfo[] {
  // graph-relations의 카테고리 노드 id는 "cat-spelling" 형태이고
  // ontology JSON의 category 필드는 "spelling" 형태. 둘 다 지원
  const normalized = categoryId.startsWith('cat-') ? categoryId.slice(4) : categoryId;
  return AGENTS.filter((a) => a.categories.includes(normalized));
}

/** 노드 id로부터 카테고리 추론 + 사용 에이전트 반환 */
export function agentsForNode(
  nodeId: string,
  nodeType: string,
  parentCategoryId?: string,
): AgentInfo[] {
  if (nodeType === 'category') return agentsByCategory(nodeId);
  if (parentCategoryId) return agentsByCategory(parentCategoryId);
  // rule/principle/example은 부모 카테고리 없으면 보수적으로 빈 배열
  return [];
}
