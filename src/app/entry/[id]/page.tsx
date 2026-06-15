import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getEntry, getCategories } from '@/lib/ontology/loader';

interface Props { params: Promise<{ id: string }> }

export default async function EntryPage({ params }: Props) {
  const { id } = await params;
  // 잘못된 퍼센트 인코딩(예: /entry/%)은 decodeURIComponent가 URIError를 던진다.
  // 그대로 두면 500이 나므로 404로 처리한다.
  let decoded = id;
  try {
    decoded = decodeURIComponent(id);
  } catch {
    notFound();
  }
  const entry = getEntry(decoded);
  if (!entry) notFound();

  const cat = getCategories().find((c) => c.id === entry.category);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <Link href="/tree" className="text-sm text-neutral-400 hover:text-white mb-4 inline-block">
        ← 트리로 돌아가기
      </Link>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          {cat && (
            <span
              className="px-2 py-0.5 rounded text-xs font-medium"
              style={{ backgroundColor: cat.color + '33', color: cat.color }}
            >
              {cat.label}
            </span>
          )}
          {entry.subcategory && (
            <span className="text-xs text-neutral-500">{entry.subcategory}</span>
          )}
          {entry.rule_number && (
            <span className="text-xs font-mono text-blue-400 ml-auto">
              {entry.rule_number}
            </span>
          )}
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">{entry.title}</h1>
        <p className="text-xs text-neutral-500 font-mono">{entry.id}</p>
      </div>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide mb-3">
          설명
        </h2>
        <div className="text-neutral-200 leading-relaxed whitespace-pre-wrap">
          {entry.description}
        </div>
      </section>

      {entry.examples && entry.examples.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide mb-3">
            예시 ({entry.examples.length}건)
          </h2>
          <div className="space-y-3">
            {entry.examples.slice(0, 50).map((ex, i) => (
              <div key={i} className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg">
                {ex.correct && (
                  <div className="text-sm">
                    <span className="text-emerald-500">○</span>{' '}
                    <span className="text-white font-medium">{ex.correct}</span>
                  </div>
                )}
                {ex.incorrect && (
                  <div className="text-sm mt-1">
                    <span className="text-rose-500">×</span>{' '}
                    <span className="text-neutral-400">{ex.incorrect}</span>
                  </div>
                )}
                {ex.explanation && (
                  <p className="text-xs text-neutral-500 mt-2">{ex.explanation}</p>
                )}
              </div>
            ))}
            {entry.examples.length > 50 && (
              <p className="text-center text-xs text-neutral-500">
                50건까지 표시 (총 {entry.examples.length}건)
              </p>
            )}
          </div>
        </section>
      )}

      {entry.keywords && entry.keywords.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide mb-3">
            키워드
          </h2>
          <div className="flex flex-wrap gap-2">
            {entry.keywords.map((k) => (
              <span
                key={k}
                className="px-2 py-1 bg-neutral-900 border border-neutral-800 rounded text-xs text-neutral-300"
              >
                {k}
              </span>
            ))}
          </div>
        </section>
      )}

      {entry.history && entry.history.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide mb-3">
            개정 이력 ({entry.history.length}건)
          </h2>
          <div className="space-y-2">
            {entry.history.map((h, i) => (
              <div key={i} className="p-3 bg-neutral-900 border border-neutral-800 rounded text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-blue-400">{h.effective_date}</span>
                  {h.path && <span className="text-xs text-neutral-500">{h.path}</span>}
                </div>
                <p className="text-neutral-300">{h.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="text-sm text-neutral-500 pt-6 border-t border-neutral-800">
        출처: {entry.source}
        {entry.source_date && <span className="ml-2">({entry.source_date})</span>}
      </section>
    </div>
  );
}
