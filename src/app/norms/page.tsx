'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { getKornormsArticles, getKornormsAppendixHistory } from '@/lib/ontology/loader';

const REGULATIONS = ['전체', '한글맞춤법', '표준어규정', '외래어표기법', '로마자표기법'];

export default function NormsPage() {
  const articles = useMemo(() => getKornormsArticles(), []);
  const appendices = useMemo(() => getKornormsAppendixHistory(), []);
  const [regulation, setRegulation] = useState('전체');
  const [showAppendix, setShowAppendix] = useState(false);
  const [filter, setFilter] = useState('');

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return articles.filter((a) => {
      const subcat = a.subcategory ?? '';
      const matchReg = regulation === '전체' || (a as unknown as { tags?: string[] }).tags?.includes(regulation) || subcat.includes(regulation);
      if (!matchReg) return false;
      if (!q) return true;
      return (
        a.title?.toLowerCase().includes(q) ||
        a.rule_number?.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q)
      );
    });
  }, [articles, regulation, filter]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">어문 규범</h1>
        <p className="text-sm text-neutral-400">
          국립국어원 어문 규범 110개 조항 + 부록 변경 이력 {appendices.length}건
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-1">
          {REGULATIONS.map((r) => (
            <button
              key={r}
              onClick={() => setRegulation(r)}
              className={`px-3 py-1.5 text-sm rounded ${
                regulation === r
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-900 border border-neutral-700 text-neutral-400 hover:text-white'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="조항 번호·제목·본문 검색..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 flex-1 min-w-[200px]"
        />
        <button
          onClick={() => setShowAppendix((v) => !v)}
          className="px-3 py-1.5 text-sm border border-neutral-700 rounded text-neutral-300 hover:text-white"
        >
          {showAppendix ? '본문만' : `부록 ${appendices.length}건 보기`}
        </button>
      </div>

      {!showAppendix && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {filtered.map((a) => (
            <Link
              key={a.id}
              href={`/entry/${encodeURIComponent(a.id)}`}
              className="block p-3 bg-neutral-900 border border-neutral-800 hover:border-blue-500 rounded-lg transition-all"
            >
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <h3 className="font-semibold text-white text-sm line-clamp-1">{a.title}</h3>
                <span className="text-xs font-mono text-blue-400 whitespace-nowrap">
                  {a.rule_number}
                </span>
              </div>
              <p className="text-xs text-neutral-400 line-clamp-2">
                {a.description?.slice(0, 150)}
              </p>
              <div className="flex gap-2 mt-2 text-xs text-neutral-500">
                {a.examples && a.examples.length > 0 && (
                  <span>예시 {a.examples.length}건</span>
                )}
                {a.history && a.history.length > 0 && (
                  <span>이력 {a.history.length}건</span>
                )}
              </div>
            </Link>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-2 text-center text-sm text-neutral-500 py-12">
              일치하는 조항이 없습니다
            </p>
          )}
        </div>
      )}

      {showAppendix && (
        <div className="space-y-2">
          {appendices.slice(0, 200).map((ap) => (
            <div key={ap.id} className="p-3 bg-neutral-900 border border-neutral-800 rounded">
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <h3 className="text-sm text-white">{ap.title}</h3>
                <span className="text-xs text-neutral-500">{ap.regulation}</span>
              </div>
              <p className="text-xs text-neutral-500 font-mono">{ap.path}</p>
              {ap.history?.[0] && (
                <p className="text-xs text-neutral-400 mt-1">
                  {ap.history[0].effective_date}: {ap.history[0].description}
                </p>
              )}
            </div>
          ))}
          {appendices.length > 200 && (
            <p className="text-center text-xs text-neutral-500 py-4">
              200건까지 표시 (총 {appendices.length}건)
            </p>
          )}
        </div>
      )}
    </div>
  );
}
