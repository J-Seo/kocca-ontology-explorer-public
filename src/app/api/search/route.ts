import { NextRequest } from 'next/server';
import { searchOntology } from '@/lib/ontology/loader';
import { searchLex, searchForeignNotation, isTursoConfigured } from '@/lib/turso/client';

export const dynamic = 'force-dynamic';
// 응답 캐싱: Vercel/Vercel Edge CDN이 같은 query의 응답을 60초간 캐시
// stale-while-revalidate: 캐시 만료 후에도 5분간 stale 응답 제공하면서 백그라운드 갱신
const CACHE_HEADER = 's-maxage=60, stale-while-revalidate=300';

// 페이지 크기 — 첫 페이지는 작게(빠른 first-paint), 추가 페이지는 더 크게
const LEX_PAGE_FIRST = 8;
const LEX_PAGE_NEXT = 12;
const FOREIGN_PAGE_FIRST = 6;
const FOREIGN_PAGE_NEXT = 10;
const TIER_A_LIMIT = 30;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  // NFC 정규화로 NFD 입력(맥OS 붙여넣기 등)도 일관되게 매칭.
  const q = (url.searchParams.get('q') ?? '').normalize('NFC').trim();
  const tier = url.searchParams.get('tier') ?? 'both';
  const category = url.searchParams.get('category') ?? undefined;
  const page = Math.max(0, Number(url.searchParams.get('page') ?? '0') || 0);

  if (!q) {
    return Response.json(
      { query: '', tier_a: [], tier_b_lex: [], tier_b_foreign: [], turso: isTursoConfigured(), page, has_more: false },
      { headers: { 'Cache-Control': CACHE_HEADER } },
    );
  }

  // Tier A는 page=0일 때만 (인메모리라 항상 빠름)
  const tierAResults = tier === 'b' || page > 0 ? [] : searchOntology(q, { limit: TIER_A_LIMIT, category });

  const lexLimit = page === 0 ? LEX_PAGE_FIRST : LEX_PAGE_NEXT;
  const foreignLimit = page === 0 ? FOREIGN_PAGE_FIRST : FOREIGN_PAGE_NEXT;
  const lexOffset = page === 0 ? 0 : LEX_PAGE_FIRST + (page - 1) * LEX_PAGE_NEXT;
  const foreignOffset = page === 0 ? 0 : FOREIGN_PAGE_FIRST + (page - 1) * FOREIGN_PAGE_NEXT;

  let lexResults: Awaited<ReturnType<typeof searchLex>> = [];
  let foreignResults: Awaited<ReturnType<typeof searchForeignNotation>> = [];
  if (tier !== 'a' && isTursoConfigured()) {
    // limit+1로 더보기 가용성 판단 (실제로는 limit만 반환)
    [lexResults, foreignResults] = await Promise.all([
      searchLex(q, { limit: lexLimit + 1, offset: lexOffset }).catch(() => []),
      searchForeignNotation(q, { limit: foreignLimit + 1, offset: foreignOffset }).catch(() => []),
    ]);
  }

  const hasMoreLex = lexResults.length > lexLimit;
  const hasMoreForeign = foreignResults.length > foreignLimit;
  if (hasMoreLex) lexResults = lexResults.slice(0, lexLimit);
  if (hasMoreForeign) foreignResults = foreignResults.slice(0, foreignLimit);

  return Response.json(
    {
      query: q,
      tier_a: tierAResults,
      tier_b_lex: lexResults,
      tier_b_foreign: foreignResults,
      turso: isTursoConfigured(),
      page,
      has_more: hasMoreLex || hasMoreForeign,
      has_more_lex: hasMoreLex,
      has_more_foreign: hasMoreForeign,
    },
    { headers: { 'Cache-Control': CACHE_HEADER } },
  );
}
