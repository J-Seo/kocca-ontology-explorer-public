import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        category: {
          spelling: '#7C3AED',     // 보라 — 맞춤법
          grammar: '#059669',       // 에메랄드 — 문법
          vocabulary: '#D97706',    // 앰버 — 어휘
          expression: '#DC2626',    // 빨강 — 표현
          spacing: '#0891B2',       // 시안 — 띄어쓰기
          pronunciation: '#9333EA', // 보라 — 발음
          foreign: '#65A30D',       // 라임 — 외래어
          punctuation: '#EA580C',   // 주황 — 문장부호
          honorific: '#4F46E5',     // 인디고 — 높임법
          standard: '#0D9488',      // 청록 — 표준어
          romanization: '#BE185D',  // 분홍 — 로마자
          terminology: '#7C2D12',   // 갈색 — 전문용어
          dialect: '#84CC16',       // 라임 — 방언
          education: '#06B6D4',     // 시안 — 교육
          purification: '#15803D',  // 녹색 — 순화
          kornorms: '#1E40AF',      // 짙은 파랑 — 어문 규범
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
