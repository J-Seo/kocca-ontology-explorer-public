'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { getCategories, getEntriesByCategory } from '@/lib/ontology/loader';

export default function TreePage() {
  const categories = useMemo(() => getCategories(), []);
  const [selected, setSelected] = useState<string>(categories[0]?.id ?? 'spelling');
  const [filter, setFilter] = useState('');

  const entries = useMemo(() => {
    const all = getEntriesByCategory(selected);
    if (!filter) return all;
    const q = filter.toLowerCase();
    return all.filter(
      (e) =>
        e.title?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.keywords?.some((k) => k.toLowerCase().includes(q)),
    );
  }, [selected, filter]);

  const selectedCat = categories.find((c) => c.id === selected);

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <h1 className="text-2xl font-bold text-white mb-6">카테고리 트리</h1>
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* 좌: 카테고리 목록 */}
        <aside className="border border-neutral-800 rounded-lg bg-neutral-900 p-2 h-fit sticky top-20">
          {categories
            .sort((a, b) => b.count - a.count)
            .map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c.id)}
                className={`w-full text-left px-3 py-2 rounded-md mb-1 transition-colors flex items-center justify-between ${
                  selected === c.id
                    ? 'bg-neutral-800 text-white'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: c.color }}
                  />
                  <span className="text-sm">{c.label}</span>
                </span>
                <span className="text-xs font-mono text-neutral-500">{c.count}</span>
              </button>
            ))}
        </aside>

        {/* 우: 엔트리 목록 */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: selectedCat?.color }}
                />
                {selectedCat?.label}
              </h2>
              <p className="text-sm text-neutral-500 mt-1">
                {entries.length}건 / 전체 {selectedCat?.count}건
              </p>
            </div>
            <input
              type="text"
              placeholder="카테고리 내 검색..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded-md text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 w-64"
            />
          </div>

          <div className="space-y-2">
            {entries.slice(0, 100).map((e) => (
              <Link
                key={e.id}
                href={`/entry/${encodeURIComponent(e.id)}`}
                className="block p-4 border border-neutral-800 rounded-lg bg-neutral-900 hover:bg-neutral-800 hover:border-neutral-600 transition-all"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h3 className="font-semibold text-white text-sm">{e.title}</h3>
                  {e.rule_number && (
                    <span className="text-xs font-mono text-blue-400 whitespace-nowrap">
                      {e.rule_number}
                    </span>
                  )}
                </div>
                <p className="text-sm text-neutral-400 line-clamp-2">
                  {e.description?.slice(0, 200)}
                  {(e.description?.length ?? 0) > 200 ? '…' : ''}
                </p>
                {e.examples && e.examples.length > 0 && (
                  <div className="mt-2 text-xs text-neutral-500">
                    예시 {e.examples.length}건 · {e.examples[0]?.correct?.slice(0, 30)}
                  </div>
                )}
              </Link>
            ))}
            {entries.length > 100 && (
              <p className="text-center text-sm text-neutral-500 py-4">
                100건까지만 표시 — 더 좁히려면 검색하세요
              </p>
            )}
            {entries.length === 0 && (
              <p className="text-center text-sm text-neutral-500 py-12">
                일치하는 엔트리가 없습니다
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
