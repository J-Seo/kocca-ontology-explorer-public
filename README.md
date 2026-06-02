# Korean Lexicon Ontology Explorer

> 한국어 4대 언어자원(표준국어대사전·우리말샘·한국어기초사전·어문 규범)을 통합한 온톨로지 탐색 웹앱
> A web-based explorer for an integrated Korean lexical ontology built on four open language resources.

🔗 **Live Demo** — https://kocca-ontology-explorer.vercel.app
📦 **Tier B Dataset** — https://huggingface.co/datasets/J-Seo/kocca-ontology-tierB
📄 **Data License** — CC BY-SA 2.0 KR (출처: 국립국어원)
📄 **Code License** — MIT

---

## English Summary

This project provides an integrated exploration interface for Korean lexical
knowledge by combining four open language resources released by the National
Institute of the Korean Language (NIKL):

- **Standard Korean Dictionary** (stdict, 436K entries)
- **Urimalsam** (1.2M entries)
- **Korean Learner's Dictionary** (krdict, 53K entries)
- **Korean Language Norms** (kornorms, 110 articles + 380 appendix revisions + 80K usage examples)

The system is split into two tiers:
- **Tier A** — 4,545 curated entries across 17 semantic categories and the full
  110-article norm corpus, bundled in-memory as ~5 MB of JSON
- **Tier B** — 1.7M headwords indexed as SQLite (810 MB) and served from
  Turso (libSQL) for low-latency search

The interface offers a dashboard, category tree drill-down, a 259-node knowledge
graph (ReactFlow), a norm browser, and unified Tier A + Tier B search.

---

## 주요 기능

| 페이지 | 설명 |
|---|---|
| `/`        | 대시보드 — 총량·카테고리 분포·출처별 라이선스 |
| `/tree`    | 카테고리 트리 — 17카테고리 드릴다운 |
| `/graph`   | 지식 그래프 — 259노드 · 263엣지 (ReactFlow) |
| `/norms`   | 어문 규범 — 110조항 + 부록 변경 380건 |
| `/search`  | 통합 검색 — Tier A 인메모리 + Tier B SQLite 동시 |
| `/entry/:id` | 엔트리 상세 — 예시·키워드·개정 이력 |

## 데이터 구조

| 계층 | 내용 | 크기 | 저장소 |
|---|---|---|---|
| **Tier A** | 4,545엔트리 / 17카테고리 + 어문 규범 110조항 | ~5 MB JSON | repo 번들 (`src/data/ontology/`) |
| **Tier B** | 1,694,805 표제어 + 80,115 외래어/로마자 용례 | 810 MB SQLite | [Hugging Face Datasets](https://huggingface.co/datasets/J-Seo/kocca-ontology-tierB) → Turso 마이그레이션 |

### 원자료 출처 (CC BY-SA 2.0 KR)

| 자원 | 표제어/조항 | 제공 |
|---|---:|---|
| 표준국어대사전 | 436,574 | 국립국어원 |
| 우리말샘 | 1,204,559 | 국립국어원 |
| 한국어기초사전 | 53,672 | 국립국어원 |
| 한국어 어문 규범 | 110조항 + 380부록 + 80,115용례 | 국립국어원 |

자세한 라이선스 의무는 [`DATA_LICENSE.md`](./DATA_LICENSE.md) 참고.

---

## 빠른 시작 (Quick Start)

### 1. 의존성 설치

```bash
npm install
```

### 2. (선택) Tier B 데이터 + Turso 설정

Tier A만으로도 대시보드·트리·그래프·규범 페이지는 정상 동작합니다.
검색 페이지에서 170만 표제어를 함께 조회하려면 Tier B 설정이 필요합니다.

```bash
# 2-1. Hugging Face에서 lexicon.sqlite 다운로드 (810MB, 약 5~10분)
bash scripts/download-tierB.sh

# 2-2. Turso DB 생성 (https://turso.tech)
brew install tursodatabase/tap/turso
turso auth signup
turso db create kocca-ontology

# 2-3. URL + 토큰을 .env.local 에 기입
cp .env.example .env.local
# TURSO_DATABASE_URL=$(turso db show kocca-ontology --url)
# TURSO_AUTH_TOKEN=$(turso db tokens create kocca-ontology --expiration none)

# 2-4. 마이그레이션 (8~15분 소요, 진행률 표시됨)
npm run migrate:turso
```

전체 셋업·트러블슈팅은 [`SETUP.md`](./SETUP.md) 참고.

### 3. 개발 서버 실행

```bash
npm run dev
# http://localhost:3000
```

### 4. Vercel 배포

1. GitHub에 push
2. Vercel에 import
3. 환경변수 `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` 등록
4. Deploy

---

## 기술 스택

- **Frontend** — Next.js 16 (App Router) + React 19 + Tailwind CSS
- **Graph** — @xyflow/react (ReactFlow)
- **DB (Tier B)** — Turso / libSQL (`@libsql/client`)
- **Hosting** — Vercel (Edge + Node runtime hybrid)
- **Data** — JSON (Tier A 번들) + SQLite (Tier B 외부)

## 디렉토리 구조

```
.
├── src/
│   ├── app/                  # Next.js App Router 페이지
│   ├── lib/
│   │   ├── ontology/         # Tier A 로더
│   │   ├── turso/            # Tier B 클라이언트
│   │   ├── graph/            # 그래프 분석
│   │   └── agents/           # 에이전트 매핑 (참고용)
│   └── data/
│       └── ontology/         # Tier A JSON 19종 (~5MB)
├── scripts/
│   ├── download-tierB.sh     # HF Dataset에서 lexicon.sqlite 다운로드
│   ├── migrate-to-turso.ts   # SQLite → Turso 업로드
│   └── e2e-prod.mjs          # 프로덕션 E2E 점검
├── LICENSE                   # 코드: MIT
├── DATA_LICENSE.md           # 데이터: CC BY-SA 2.0 KR
├── CITATION.cff              # 인용 정보
├── README.md
└── SETUP.md                  # 상세 셋업 가이드
```

---

## 인용 (Citation)

학술·기관 보고서에서 본 저장소나 데이터셋을 사용한 경우 다음과 같이 표기해 주십시오.

```bibtex
@software{korean_lexicon_ontology_explorer_2026,
  title  = {Korean Lexicon Ontology Explorer},
  author = {Seo, Jaehyung},
  year   = {2026},
  url    = {https://github.com/J-Seo/kocca-ontology-explorer-public},
  note   = {Data licensed under CC BY-SA 2.0 KR.
            Source: National Institute of the Korean Language.}
}
```

GitHub의 "Cite this repository" 버튼으로 [`CITATION.cff`](./CITATION.cff)
기반 인용 정보를 바로 얻을 수도 있습니다.

## 기여 (Contributing)

이슈·PR을 환영합니다. 데이터 오류 제보, 카테고리 분류 개선, 추가 시각화 등
어떤 형태든 좋습니다.

## 문의

- GitHub Issues: 본 저장소의 Issues 탭
- 이메일: wolhalang@gmail.com

## 라이선스

- 코드 — [MIT License](./LICENSE)
- 데이터 — [CC BY-SA 2.0 KR](./DATA_LICENSE.md) (국립국어원 4자원)
