'use client';
import { useMemo, useState, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { getGraphRelations, getCategories } from '@/lib/ontology/loader';
import { analyzeNeighborhood, findParentCategoryId, searchGraphNodes } from '@/lib/graph/analyze';
import { AGENTS, agentsForNode } from '@/lib/agents/mapping';

const TYPE_COLORS = {
  category: '#1E40AF',
  rule: '#7C3AED',
  principle: '#D97706',
  example: '#059669',
} as const;

type FilterMode = 'all' | `cat-${string}` | `agent-${string}`;

export default function GraphPage() {
  const graph = useMemo(() => getGraphRelations(), []);
  const categories = useMemo(() => getCategories(), []);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [searchQ, setSearchQ] = useState('');

  // 검색 매칭 노드 id
  const searchHits = useMemo(
    () => new Set(searchGraphNodes(searchQ, graph).map((n) => n.id)),
    [searchQ, graph],
  );

  // 선택된 노드의 분석 결과
  const selectedNode = selectedNodeId ? graph.nodes.find((n) => n.id === selectedNodeId) : null;
  const neighborhood = useMemo(
    () => (selectedNodeId ? analyzeNeighborhood(selectedNodeId, graph) : null),
    [selectedNodeId, graph],
  );

  // 그래프 노드/엣지 빌드
  const { nodes, edges, stats } = useMemo(() => {
    // 정적 원형 배치
    const catNodes = graph.nodes.filter((n) => n.type === 'category');
    const positions = new Map<string, { x: number; y: number }>();
    const radius = 450;
    catNodes.forEach((c, i) => {
      const angle = (i / catNodes.length) * 2 * Math.PI - Math.PI / 2;
      positions.set(c.id, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
    });

    const childrenByParent = new Map<string, string[]>();
    for (const e of graph.edges) {
      if (e.label === '포함') {
        const arr = childrenByParent.get(e.source) ?? [];
        arr.push(e.target);
        childrenByParent.set(e.source, arr);
      }
    }
    for (const [parentId, kids] of childrenByParent.entries()) {
      const p = positions.get(parentId);
      if (!p) continue;
      const childR = 170;
      kids.forEach((id, i) => {
        const ang = (i / kids.length) * 2 * Math.PI;
        positions.set(id, { x: p.x + Math.cos(ang) * childR, y: p.y + Math.sin(ang) * childR });
      });
    }
    graph.nodes.forEach((n, i) => {
      if (!positions.has(n.id)) {
        positions.set(n.id, { x: -600 + (i % 10) * 110, y: 700 + Math.floor(i / 10) * 80 });
      }
    });

    // 필터링 결정 — 카테고리/에이전트별
    let includedIds: Set<string>;
    if (filter === 'all') {
      includedIds = new Set(graph.nodes.map((n) => n.id));
    } else if (filter.startsWith('cat-')) {
      includedIds = new Set([filter]);
      for (const e of graph.edges) {
        if (e.source === filter) includedIds.add(e.target);
        if (e.target === filter) includedIds.add(e.source);
      }
    } else if (filter.startsWith('agent-')) {
      const agentId = filter.slice(6);
      const agent = AGENTS.find((a) => a.id === agentId);
      includedIds = new Set();
      if (agent) {
        for (const c of categories) {
          if (agent.categories.includes(c.id)) {
            const catId = `cat-${c.id}`;
            includedIds.add(catId);
            for (const e of graph.edges) {
              if (e.source === catId) includedIds.add(e.target);
              if (e.target === catId) includedIds.add(e.source);
            }
          }
        }
      }
    } else {
      includedIds = new Set(graph.nodes.map((n) => n.id));
    }

    // 강조 결정 — 선택 노드 + 1-hop / 검색 매칭
    const oneHop = neighborhood?.oneHopIds ?? null;
    const isHighlighted = (id: string): boolean => {
      if (selectedNodeId === null && searchHits.size === 0) return true;
      if (id === selectedNodeId) return true;
      if (oneHop?.has(id)) return true;
      if (searchHits.has(id)) return true;
      return false;
    };
    const isSearchHit = (id: string) => searchHits.has(id) && id !== selectedNodeId;

    const filteredNodes: Node[] = graph.nodes
      .filter((n) => includedIds.has(n.id))
      .map((n) => {
        const highlighted = isHighlighted(n.id);
        const isSelected = n.id === selectedNodeId;
        const isHit = isSearchHit(n.id);
        const baseColor = TYPE_COLORS[n.type];
        return {
          id: n.id,
          position: positions.get(n.id) ?? { x: 0, y: 0 },
          data: { label: n.label },
          style: {
            background: highlighted ? baseColor + '55' : baseColor + '11',
            color: highlighted ? '#fff' : '#737373',
            border: isSelected
              ? `2px solid #FBBF24`
              : isHit
                ? `2px solid #10B981`
                : `1px solid ${highlighted ? baseColor : '#374151'}`,
            fontSize: n.type === 'category' ? 14 : 11,
            fontWeight: n.type === 'category' ? 600 : 400,
            padding: n.type === 'category' ? '8px 14px' : '4px 8px',
            borderRadius: 8,
            width: n.type === 'category' ? 140 : 'auto',
            textAlign: 'center' as const,
            opacity: highlighted ? 1 : 0.25,
            transition: 'opacity 0.2s, background 0.2s, border 0.2s',
            cursor: 'pointer',
            boxShadow: isSelected ? '0 0 0 4px rgba(251, 191, 36, 0.3)' : undefined,
          },
        };
      });

    const filteredEdges: Edge[] = graph.edges
      .filter((e) => includedIds.has(e.source) && includedIds.has(e.target))
      .map((e, i) => {
        const isAdjacent = selectedNodeId && (e.source === selectedNodeId || e.target === selectedNodeId);
        return {
          id: `e-${i}`,
          source: e.source,
          target: e.target,
          label: e.label === '포함' ? undefined : e.label,
          labelStyle: { fontSize: 9, fill: isAdjacent ? '#FBBF24' : '#9CA3AF' },
          style: {
            stroke: isAdjacent ? '#FBBF24' : e.label === '포함' ? '#404040' : '#525252',
            strokeWidth: isAdjacent ? 2.5 : e.label === '포함' ? 1 : 1.5,
            opacity: selectedNodeId && !isAdjacent ? 0.2 : 1,
          },
          animated: !!isAdjacent || e.label !== '포함',
        };
      });

    return {
      nodes: filteredNodes,
      edges: filteredEdges,
      stats: { nodes: filteredNodes.length, edges: filteredEdges.length },
    };
  }, [graph, filter, selectedNodeId, searchHits, neighborhood, categories]);

  const onNodeClick: NodeMouseHandler = useCallback((_e, node) => {
    setSelectedNodeId((prev) => (prev === node.id ? null : node.id));
  }, []);

  const onPaneClick = useCallback(() => setSelectedNodeId(null), []);

  // 선택 노드의 카테고리 → 사용 에이전트
  const selectedAgents = useMemo(() => {
    if (!selectedNode) return [];
    const parentCatId = findParentCategoryId(selectedNode.id, graph);
    return agentsForNode(selectedNode.id, selectedNode.type, parentCatId);
  }, [selectedNode, graph]);

  return (
    <div className="h-[calc(100vh-64px)] flex">
      {/* 좌측: 그래프 + 헤더 */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="px-4 py-3 border-b border-neutral-800 bg-neutral-950 space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-base font-bold text-white">지식 그래프</h1>
            <span className="text-xs text-neutral-500">
              {stats.nodes} / {graph.nodes.length} 노드 · {stats.edges} 엣지
            </span>
            <input
              type="search"
              aria-label="그래프 노드 검색"
              placeholder="그래프 내 검색 (노드 라벨)..."
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              className="ml-auto px-3 py-1 bg-neutral-900 border border-neutral-700 rounded text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 w-64"
            />
            {searchHits.size > 0 && (
              <span className="text-xs text-emerald-400">{searchHits.size}건 매칭</span>
            )}
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-xs text-neutral-500 mr-1">필터:</span>
            <button
              onClick={() => setFilter('all')}
              className={`px-2 py-1 rounded text-xs ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-900 border border-neutral-700 text-neutral-400 hover:text-white'
              }`}
            >
              전체
            </button>
            <span className="text-xs text-neutral-500 mx-1">에이전트:</span>
            {AGENTS.map((a) => (
              <button
                key={a.id}
                onClick={() => setFilter(`agent-${a.id}` as FilterMode)}
                className={`px-2 py-1 rounded text-xs border ${
                  filter === `agent-${a.id}`
                    ? 'text-white border-transparent'
                    : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:text-white'
                }`}
                style={filter === `agent-${a.id}` ? { backgroundColor: a.color } : {}}
                title={a.description}
              >
                {a.label.replace(' 에이전트', '')}
              </button>
            ))}
            <span className="text-xs text-neutral-500 mx-1">카테고리:</span>
            {categories.slice(0, 6).map((c) => (
              <button
                key={c.id}
                onClick={() => setFilter(`cat-${c.id}` as FilterMode)}
                className={`px-2 py-1 rounded text-xs border ${
                  filter === `cat-${c.id}`
                    ? 'text-white border-transparent'
                    : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:text-white'
                }`}
                style={filter === `cat-${c.id}` ? { backgroundColor: c.color } : {}}
              >
                {c.label}
              </button>
            ))}
          </div>
        </header>
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            fitView
            minZoom={0.1}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#262626" />
            <Controls />
            <MiniMap
              nodeColor={(n) => {
                const node = graph.nodes.find((x) => x.id === n.id);
                return node ? TYPE_COLORS[node.type] : '#737373';
              }}
              maskColor="rgba(0,0,0,0.7)"
              pannable
              zoomable
            />
          </ReactFlow>
        </div>
      </div>

      {/* 우측: 상세 패널 (선택된 노드 정보) */}
      <aside className="w-[380px] border-l border-neutral-800 bg-neutral-950 overflow-y-auto">
        {!selectedNode ? (
          <EmptyPanel />
        ) : (
          <DetailPanel
            node={selectedNode}
            neighborhood={neighborhood!}
            agents={selectedAgents}
            onSelectNode={setSelectedNodeId}
          />
        )}
      </aside>
    </div>
  );
}

function EmptyPanel() {
  return (
    <div className="p-6 text-sm text-neutral-400 space-y-4">
      <div>
        <h2 className="text-white font-semibold mb-2">노드를 클릭하세요</h2>
        <p className="text-xs leading-relaxed">
          그래프의 노드를 클릭하면 해당 노드의 <strong className="text-white">부모·자식·형제·관련</strong> 노드와
          어떤 에이전트가 이 지식을 호출하는지 표시됩니다.
        </p>
      </div>

      <div className="pt-4 border-t border-neutral-800">
        <h3 className="text-xs font-semibold text-neutral-300 uppercase tracking-wide mb-2">
          이 그래프의 목적
        </h3>
        <p className="text-xs leading-relaxed text-neutral-400">
          멀티에이전트 시스템(지식·교정·채점 3 에이전트 + 온톨로지 오케스트레이터)이
          질의에 답할 때 어떤 ontology 노드를 <strong className="text-white">Tool Calling</strong>처럼
          가져오고, 응답의 근거가 어떤 규칙에서 비롯됐는지 추적하기 위한 시각화 도구입니다.
        </p>
        <p className="text-[11px] leading-relaxed text-neutral-500 mt-2">
          ※ 이 매핑은 <strong className="text-neutral-300">개념도</strong>입니다.
          실제 에이전트 런타임(LLM·오케스트레이터)은 이 저장소에 포함되어 있지 않습니다.
        </p>
      </div>

      <div className="pt-4 border-t border-neutral-800">
        <h3 className="text-xs font-semibold text-neutral-300 uppercase tracking-wide mb-2">
          에이전트 ↔ 카테고리
        </h3>
        <div className="space-y-2">
          {AGENTS.map((a) => (
            <div key={a.id} className="text-xs">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: a.color }} />
                <span className="text-white font-medium">{a.label}</span>
                <span className="text-neutral-500">({a.actionType})</span>
              </div>
              <div className="text-neutral-500 ml-4">{a.categories.join(' · ')}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-neutral-800">
        <h3 className="text-xs font-semibold text-neutral-300 uppercase tracking-wide mb-2">
          노드 유형 범례
        </h3>
        <div className="space-y-1 text-xs">
          {Object.entries(TYPE_COLORS).map(([k, c]) => (
            <div key={k} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: c }} />
              <span className="text-neutral-300">{k}</span>
              <span className="text-neutral-500 ml-auto">
                {k === 'category' ? '카테고리 (16)'
                  : k === 'rule' ? '규칙 (232)'
                    : k === 'principle' ? '원리 (6)'
                      : '예시 (5)'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DetailPanel({
  node,
  neighborhood,
  agents,
  onSelectNode,
}: {
  node: import('@/lib/types').GraphNode;
  neighborhood: import('@/lib/graph/analyze').NodeNeighborhood;
  agents: import('@/lib/agents/mapping').AgentInfo[];
  onSelectNode: (id: string) => void;
}) {
  const typeLabel: Record<string, string> = {
    category: '카테고리', rule: '규칙', principle: '원리', example: '예시',
  };

  return (
    <div className="p-5 space-y-5 text-sm">
      <header>
        <div className="flex items-center gap-2 mb-2">
          <span
            className="px-2 py-0.5 rounded text-xs font-medium"
            style={{
              backgroundColor: TYPE_COLORS[node.type] + '33',
              color: TYPE_COLORS[node.type],
            }}
          >
            {typeLabel[node.type] ?? node.type}
          </span>
          <span className="text-xs text-neutral-500 font-mono ml-auto">{node.id}</span>
        </div>
        <h2 className="text-base font-semibold text-white leading-tight">{node.label}</h2>
      </header>

      {/* 에이전트 매핑 — Tool Calling 핵심 정보 */}
      {agents.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-neutral-300 uppercase tracking-wide mb-2">
            호출하는 에이전트 ({agents.length})
          </h3>
          <div className="space-y-2">
            {agents.map((a) => (
              <div
                key={a.id}
                className="p-2 rounded border bg-neutral-900"
                style={{ borderColor: a.color + '55' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: a.color }} />
                  <span className="text-white text-xs font-medium">{a.label}</span>
                  <span className="ml-auto text-[10px] uppercase tracking-wider text-neutral-500">
                    {a.actionType}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 leading-snug">{a.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 부모 — 계층적 상위 */}
      <RelationGroup
        title={`부모 — 이 노드를 포함하는 (${neighborhood.parents.length})`}
        items={neighborhood.parents.map((p) => ({ node: p.node, label: '포함' }))}
        onSelect={onSelectNode}
        empty="이 노드는 최상위 또는 부모 정보 없음"
      />

      {/* 자식 — 계층적 하위 */}
      <RelationGroup
        title={`자식 — 이 노드가 포함하는 (${neighborhood.children.length})`}
        items={neighborhood.children.map((c) => ({ node: c.node, label: '포함' }))}
        onSelect={onSelectNode}
        showAll={neighborhood.children.length <= 20}
        empty="하위 노드 없음 (단말 노드)"
      />

      {/* 형제 — 같은 부모를 공유 */}
      {neighborhood.siblings.length > 0 && (
        <RelationGroup
          title={`형제 — 같은 부모 (${neighborhood.siblings.length})`}
          items={neighborhood.siblings.map((s) => ({ node: s, label: '형제' }))}
          onSelect={onSelectNode}
          showAll={neighborhood.siblings.length <= 20}
        />
      )}

      {/* 관련 — 의미적 연결 */}
      {neighborhood.related.length > 0 && (
        <RelationGroup
          title={`관련 (${neighborhood.related.length})`}
          items={neighborhood.related.map((r) => ({
            node: r.node,
            label: `${r.edge.label}${r.direction === 'out' ? ' →' : ' ←'}`,
          }))}
          onSelect={onSelectNode}
          showAll
        />
      )}

      {/* 빈 상태 */}
      {neighborhood.parents.length === 0 &&
        neighborhood.children.length === 0 &&
        neighborhood.related.length === 0 && (
          <p className="text-xs text-neutral-500 italic">
            이 노드는 그래프에서 고립되어 있습니다 (관계 없음).
          </p>
      )}
    </div>
  );
}

function RelationGroup({
  title,
  items,
  onSelect,
  empty,
  showAll = false,
}: {
  title: string;
  items: { node: import('@/lib/types').GraphNode; label: string }[];
  onSelect: (id: string) => void;
  empty?: string;
  showAll?: boolean;
}) {
  if (items.length === 0 && !empty) return null;
  const visible = showAll ? items : items.slice(0, 8);
  return (
    <section>
      <h3 className="text-xs font-semibold text-neutral-300 uppercase tracking-wide mb-2">
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-xs text-neutral-500 italic">{empty}</p>
      ) : (
        <div className="space-y-1">
          {visible.map((it) => (
            <button
              key={`${it.node.id}-${it.label}`}
              onClick={() => onSelect(it.node.id)}
              className="w-full text-left flex items-center gap-2 p-1.5 rounded hover:bg-neutral-800 transition-colors group"
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: TYPE_COLORS[it.node.type] }}
              />
              <span className="text-xs text-neutral-200 group-hover:text-white flex-1 truncate">
                {it.node.label}
              </span>
              <span className="text-[10px] text-neutral-500 font-mono">{it.label}</span>
            </button>
          ))}
          {!showAll && items.length > visible.length && (
            <div className="text-[11px] text-neutral-500 px-1.5 pt-1">
              … 그 외 {items.length - visible.length}건
            </div>
          )}
        </div>
      )}
    </section>
  );
}
