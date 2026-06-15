import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'KoCCA 국어지식 온톨로지 탐색기 (비공식)',
  description:
    '국립국어원 공개 4자원(표준국어대사전·우리말샘·한국어기초사전·어문 규범)을 통합한 온톨로지를 검색·시각화하는 비공식 탐색 도구. 국립국어원/KOCCA 공식 서비스가 아닙니다.',
};

const NAV = [
  { href: '/', label: '대시보드' },
  { href: '/tree', label: '카테고리' },
  { href: '/graph', label: '지식 그래프' },
  { href: '/norms', label: '어문 규범' },
  { href: '/search', label: '검색' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <nav className="border-b border-neutral-800 bg-neutral-950 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-6">
            <Link href="/" className="font-semibold text-lg text-white tracking-tight">
              KoCCA <span className="text-blue-400">온톨로지 탐색기</span>
            </Link>
            <div className="flex gap-1 ml-4">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="px-3 py-1.5 rounded-md text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                >
                  {n.label}
                </Link>
              ))}
            </div>
            <div className="ml-auto text-xs text-neutral-500">
              비공식 · CC-BY-SA 2.0 KR · 출처: 국립국어원
            </div>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
