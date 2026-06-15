import Link from 'next/link';
import { ONTOLOGY_TOTAL, getCategories, getKornormsArticles } from '@/lib/ontology/loader';
import { getTursoStatus } from '@/lib/turso/client';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const categories = getCategories();
  const kornorms = getKornormsArticles();
  const turso = await getTursoStatus();

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <header className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-white mb-3">
          국어지식 온톨로지 탐색기
        </h1>
        <p className="text-neutral-400 max-w-3xl">
          국립국어원 4자원을 통합한 온톨로지를 검색·탐색하는 도구입니다.
          Tier A 인메모리 {ONTOLOGY_TOTAL.toLocaleString()}건 + Tier B SQLite/Turso 170만 표제어.
        </p>
        <p className="text-neutral-500 text-sm max-w-3xl mt-2">
          비공식 프로젝트입니다 · Unofficial — 국립국어원/KOCCA의 공식 서비스가 아니며,
          공개 언어자원을 가공한 것입니다. (멀티에이전트 시스템과의 연계를 상정해 설계했으나
          에이전트 런타임은 이 저장소에 포함되지 않습니다.)
        </p>
      </header>

      {/* 통계 카드 */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
        <StatCard
          title="Tier A 인메모리"
          value={ONTOLOGY_TOTAL.toLocaleString()}
          subtitle={`${categories.length}개 카테고리 · 즉시 검색`}
          accent="#7C3AED"
        />
        <StatCard
          title="어문 규범 조항"
          value={kornorms.length.toString()}
          subtitle="한글맞춤법·표준어·외래어·로마자"
          accent="#1E40AF"
        />
        <StatCard
          title="Tier B 표제어"
          value={
            turso.configured && turso.counts
              ? turso.counts.lex.toLocaleString()
              : turso.configured
                ? '연결 오류'
                : '미설정'
          }
          subtitle={
            turso.configured && turso.counts
              ? `Turso libSQL · ${turso.counts.example.toLocaleString()} 용례`
              : turso.error ?? 'Turso 환경변수 설정 필요'
          }
          accent={turso.configured && turso.counts ? '#059669' : '#737373'}
        />
        <StatCard
          title="라이선스"
          value="CC-BY-SA"
          subtitle="2.0 KR · 국립국어원"
          accent="#D97706"
        />
      </section>

      {/* 카테고리 분포 */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-white mb-4">카테고리 분포</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {[...categories]
            .sort((a, b) => b.count - a.count)
            .map((c) => (
              <Link
                key={c.id}
                href={`/tree?cat=${c.id}`}
                className="block p-3 rounded-lg border border-neutral-800 hover:border-neutral-600 bg-neutral-900 hover:bg-neutral-800 transition-all"
              >
                <div
                  className="w-2 h-2 rounded-full mb-2"
                  style={{ backgroundColor: c.color }}
                />
                <div className="text-xs text-neutral-400 mb-1">{c.label}</div>
                <div className="text-lg font-bold text-white">{c.count.toLocaleString()}</div>
              </Link>
            ))}
        </div>
      </section>

      {/* 자원 출처 */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-white mb-4">데이터 출처</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ResourceCard
            name="표준국어대사전 (stdict)"
            count="436,574"
            description="국립국어원 표준 사전 — 벌크 XML + Open API"
          />
          <ResourceCard
            name="우리말샘 (urimalsam)"
            count="1,204,559"
            description="개방형 한국어 사전 — 신어·방언·전문어 포함"
          />
          <ResourceCard
            name="한국어기초사전 (krdict)"
            count="53,672"
            description="한국어 학습자용 — 초급/중급/고급 난이도"
          />
          <ResourceCard
            name="한국어 어문 규범 (kornorms)"
            count="110조항 + 80,115용례"
            description="한글맞춤법·표준어·외래어·로마자 + 부록 변경 380건"
          />
        </div>
      </section>

      {/* 빠른 진입 */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <QuickLink
          href="/tree"
          title="카테고리 트리"
          description="17개 카테고리 드릴다운 (어문 규범 포함)"
        />
        <QuickLink
          href="/graph"
          title="지식 그래프"
          description="259 노드 · 카테고리·규칙·예시 관계"
        />
        <QuickLink
          href="/norms"
          title="어문 규범"
          description="110조항 본문 + 개정 이력"
        />
        <QuickLink
          href="/search"
          title="통합 검색"
          description="Tier A + Tier B 동시 검색"
        />
      </section>
    </div>
  );
}

function StatCard({ title, value, subtitle, accent }: {
  title: string; value: string; subtitle: string; accent: string;
}) {
  return (
    <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-900">
      <div className="text-sm text-neutral-400 mb-1">{title}</div>
      <div className="text-3xl font-bold text-white mb-1" style={{ color: accent }}>
        {value}
      </div>
      <div className="text-xs text-neutral-500">{subtitle}</div>
    </div>
  );
}

function ResourceCard({ name, count, description }: { name: string; count: string; description: string }) {
  return (
    <div className="p-4 rounded-lg border border-neutral-800 bg-neutral-900">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="font-semibold text-white">{name}</h3>
        <span className="text-sm font-mono text-blue-400">{count}</span>
      </div>
      <p className="text-sm text-neutral-400">{description}</p>
    </div>
  );
}

function QuickLink({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link
      href={href}
      className="block p-4 rounded-lg border border-neutral-800 hover:border-blue-500 bg-neutral-900 hover:bg-neutral-800 transition-all"
    >
      <h3 className="font-semibold text-white mb-1">{title} →</h3>
      <p className="text-sm text-neutral-400">{description}</p>
    </Link>
  );
}
