'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { getCategories } from '@/lib/ontology/loader';
import type { OntologyEntry, LexEntry, NormExampleRow } from '@/lib/types';

interface SearchResponse {
  query: string;
  tier_a: Array<{ entry: OntologyEntry; score: number }>;
  tier_b_lex: LexEntry[];
  tier_b_foreign: NormExampleRow[];
  turso: boolean;
  page: number;
  has_more: boolean;
  has_more_lex?: boolean;
  has_more_foreign?: boolean;
}

export default function SearchPage() {
  const categories = getCategories();
  const [q, setQ] = useState('');
  const [tier, setTier] = useState<'both' | 'a' | 'b'>('both');
  const [category, setCategory] = useState<string>('');
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!q.trim()) { setData(null); setPage(0); return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      setPage(0);
      try {
        const params = new URLSearchParams({ q, tier });
        if (category) params.set('category', category);
        const r = await fetch(`/api/search?${params}`);
        setData(await r.json());
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [q, tier, category]);

  async function loadMore() {
    if (!data || !data.has_more || loadingMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const params = new URLSearchParams({ q, tier, page: String(nextPage) });
      if (category) params.set('category', category);
      const r = await fetch(`/api/search?${params}`);
      const more: SearchResponse = await r.json();
      setData((prev) =>
        prev
          ? {
              ...more,
              tier_a: prev.tier_a,
              tier_b_lex: [...prev.tier_b_lex, ...more.tier_b_lex],
              tier_b_foreign: [...prev.tier_b_foreign, ...more.tier_b_foreign],
            }
          : more,
      );
      setPage(nextPage);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">통합 검색</h1>

      <div className="mb-6 space-y-3">
        <input
          type="text"
          autoFocus
          placeholder="키워드, 규칙 번호, 표제어 등을 입력하세요 (예: 사이시옷, 한글 맞춤법 제30항, 카페)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-white text-base placeholder-neutral-500 focus:outline-none focus:border-blue-500"
        />
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-neutral-500">검색 범위:</span>
          {(['both', 'a', 'b'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTier(t)}
              className={`px-3 py-1 rounded text-xs ${
                tier === t
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-900 border border-neutral-700 text-neutral-400 hover:text-white'
              }`}
            >
              {t === 'both' ? '전체' : t === 'a' ? 'Tier A' : 'Tier B'}
            </button>
          ))}
          <span className="text-xs text-neutral-500 ml-4">카테고리:</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-2 py-1 bg-neutral-900 border border-neutral-700 rounded text-xs text-white"
          >
            <option value="">전체</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label} ({c.count})
              </option>
            ))}
          </select>
          {loading && <span className="text-xs text-neutral-500 ml-auto">검색 중...</span>}
        </div>
      </div>

      {!q.trim() && (
        <div className="text-neutral-500 text-sm py-8 text-center">
          검색어를 입력하면 Tier A 인메모리(즉시) + Tier B Turso(설정 시)에서 결과를 가져옵니다.
        </div>
      )}

      {data && (
        <div className="space-y-8">
          {/* Tier A */}
          {data.tier_a.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide mb-3">
                Tier A — 인메모리 ({data.tier_a.length}건)
              </h2>
              <div className="space-y-2">
                {data.tier_a.map(({ entry, score }) => (
                  <Link
                    key={entry.id}
                    href={`/entry/${encodeURIComponent(entry.id)}`}
                    className="block p-4 bg-neutral-900 border border-neutral-800 hover:border-neutral-600 rounded-lg transition-all"
                  >
                    <div className="flex items-center justify-between gap-4 mb-1">
                      <h3 className="font-semibold text-white text-sm">{entry.title}</h3>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-neutral-500">{entry.category}</span>
                        {entry.rule_number && (
                          <span className="font-mono text-blue-400">{entry.rule_number}</span>
                        )}
                        <span className="font-mono text-neutral-600">score {score}</span>
                      </div>
                    </div>
                    <p className="text-sm text-neutral-400 line-clamp-2">
                      {entry.description?.slice(0, 200)}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Tier B 표제어 */}
          {data.tier_b_lex.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide mb-3">
                Tier B — 표제어 ({data.tier_b_lex.length}건)
              </h2>
              <div className="space-y-2">
                {data.tier_b_lex.map((lex) => (
                  <div
                    key={`${lex.source}-${lex.target_code}`}
                    className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-white">
                        {lex.headword}
                        {lex.homonym_no > 0 && <sup>{lex.homonym_no}</sup>}
                      </span>
                      <span className="text-xs text-neutral-500">{lex.pos}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">
                        {lex.source === 'stdict' ? '표준' : lex.source === 'urimalsam' ? '우리말샘' : '기초'}
                      </span>
                      {lex.register && (
                        <span className="text-xs text-emerald-400">{lex.register}</span>
                      )}
                      {lex.word_grade && (
                        <span className="text-xs text-amber-400">{lex.word_grade}</span>
                      )}
                    </div>
                    <p className="text-sm text-neutral-300">{lex.definition.slice(0, 200)}</p>
                    {lex.related_norms.length > 0 && (
                      <div className="text-xs text-blue-400 mt-1">
                        ↔ {lex.related_norms.slice(0, 3).join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Tier B 외래어/로마자 */}
          {data.tier_b_foreign.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide mb-3">
                Tier B — 외래어/로마자 표기 ({data.tier_b_foreign.length}건)
              </h2>
              <div className="space-y-2">
                {data.tier_b_foreign.map((fn, i) => (
                  <div key={i} className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg flex items-center gap-3">
                    <span className="font-semibold text-white">{fn.korean}</span>
                    <span className="text-neutral-500">⇔</span>
                    <span className="text-neutral-300">{fn.original}</span>
                    {fn.country && (
                      <span className="text-xs text-neutral-500 ml-auto">{fn.country}</span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {data.tier_a.length === 0 && data.tier_b_lex.length === 0 && data.tier_b_foreign.length === 0 && (
            <div className="text-center text-neutral-500 py-12">
              <p>일치하는 결과가 없습니다.</p>
              {!data.turso && tier !== 'a' && (
                <p className="text-xs mt-2">Tier B (Turso)가 설정되지 않아 표제어 검색이 비활성화되었습니다.</p>
              )}
            </div>
          )}

          {/* Tier B 더 보기 */}
          {data.has_more && (
            <div className="text-center pt-4">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-5 py-2 bg-neutral-900 border border-neutral-700 hover:border-blue-500 rounded-lg text-sm text-neutral-300 hover:text-white transition-all disabled:opacity-50"
              >
                {loadingMore ? '불러오는 중...' : 'Tier B 표제어 더 보기 →'}
              </button>
              <p className="text-xs text-neutral-500 mt-2">
                현재 {data.tier_b_lex.length}건 · 추가로 표제어를 가져옵니다
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
