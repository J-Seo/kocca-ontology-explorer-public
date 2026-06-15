# 한국어 어휘 온톨로지 탐색기 / Korean Lexicon Ontology Explorer

> 국립국어원이 공개한 4개 언어자료를 한곳에서 검색하고 살펴볼 수 있게 정리한 웹앱입니다.
> A web app for searching and browsing normalized Korean lexical data derived from four
> public resources of the National Institute of Korean Language (NIKL).

**⚠️ 비공식 프로젝트입니다 / Unofficial project** — 국립국어원·KOCCA의 공식 서비스가 아니라,
공개 자료를 개인이 가공한 결과물입니다. 정확한 표준 정보는 항상 원자료를 확인하세요.
*This is not an official NIKL/KOCCA service; it is a personal, processed dataset.*

- 🔗 데모 / Live demo — https://kocca-ontology-explorer.vercel.app
- 📦 Tier B 데이터 / dataset — https://huggingface.co/datasets/J-Seo/kocca-ontology-tierB
- 📄 코드 / code: [MIT](./LICENSE) · 데이터 / data: [CC BY-SA 2.0 KR](./DATA_LICENSE.md) (출처 국립국어원)

---

## 이 프로젝트는 무엇인가요? / What is this?

국립국어원의 사전·규범 자료는 사이트가 여러 곳에 흩어져 있고, 전체를 한 번에
검색하거나 자료끼리 어떻게 연결되는지 보기가 어렵습니다. 이 저장소는 그 자료를
정규화해서 **한 화면에서 검색·탐색**할 수 있게 만든 웹앱과, 그 바탕이 되는
데이터 가공 스크립트를 담고 있습니다.

NIKL publishes its dictionaries and language norms across several separate sites,
which makes it hard to search them together or see how the entries relate. This
repo normalizes that data into a single web app you can search and browse, plus
the scripts that build the data.

데이터는 두 덩어리로 나뉩니다 / The data comes in two tiers:

- **Tier A** — 저장소에 같이 들어 있는 작은 JSON(약 5 MB). 설치하면 바로 동작합니다.
  Small JSON bundled in the repo (~5 MB). Works out of the box.
- **Tier B** — Hugging Face에서 받는 큰 SQLite(약 810 MB). 선택 사항이며 별도 설정이 필요합니다.
  A large SQLite file downloaded from Hugging Face (~810 MB). Optional, needs setup.

---

## 처음 보는 분은 이것만 / Start here

1. 그냥 둘러보고 싶다 → 데모 링크를 여세요. 설치 불필요.
   *Just looking? Open the demo link — no install.*
2. 내 컴퓨터에서 돌려보고 싶다 → `npm install && npm run dev` → http://localhost:3000
   *Run locally?* `npm install && npm run dev`
   - 이 상태에서 대시보드·카테고리·그래프·규범 페이지가 **전부 동작**합니다(Tier A).
     검색은 Tier A 4,545건만 나옵니다.
     *Dashboard, tree, graph, and norms all work with Tier A alone; search covers the 4,545 Tier A entries only.*
3. 170만 표제어 전체 검색이 필요하다 → [전체 데이터 사용](#전체-데이터-사용--using-the-full-tier-b-data) 참고.
   *Need the full 1.7M-headword search? See the Tier B section.*

---

## 데이터 흐름 / Data flow

```
국립국어원 공개자료            가공·정규화                  웹앱
NIKL open data        →    JSON + SQLite        →    Next.js explorer
(사전 3종 + 어문 규범)      (Tier A 번들 / Tier B HF)      (검색·트리·그래프)
```

원자료를 내려받아 정규화한 뒤, 작은 부분은 JSON으로 저장소에 넣고(Tier A),
큰 부분은 SQLite로 만들어 Hugging Face에 올립니다(Tier B). 웹앱은 Tier A를
메모리에서 바로 읽고, Tier B는 SQLite를 Turso(libSQL)에 올린 뒤 검색합니다.

---

## Tier A와 Tier B / Tier A vs Tier B

| | **Tier A** | **Tier B** |
|---|---|---|
| 내용 / Content | 17개 카테고리로 분류한 규칙·어휘 4,545건 (어문 규범 110조항 포함) + 부록 변경 380건 | 표제어 1,694,805건 + 어문 규범 490조항 + 외래어/로마자 용례 80,115건 |
| 크기 / Size | ~5 MB (JSON 19개) | ~810 MB (SQLite 1개) |
| 위치 / Location | 저장소 안 `src/data/ontology/` | 저장소 밖, [Hugging Face](https://huggingface.co/datasets/J-Seo/kocca-ontology-tierB) |
| 설정 / Setup | 없음, 즉시 동작 | HF 다운로드 + Turso 설정 필요 |
| 동작 페이지 / Pages | 대시보드·트리·그래프·규범, 검색(Tier A) | 검색의 표제어/외래어 결과 |

> **용어가 낯설다면** 맨 아래 [용어 사전](#용어-사전--glossary)을 먼저 보세요.
> 표제어=사전 올림말, 어문 규범=맞춤법 등 규정, SQLite=파일 하나로 된 DB,
> Turso=그 SQLite를 클라우드에서 서비스해 주는 호스팅, Hugging Face=데이터 공유 사이트.

---

## 화면 구성 / App pages

| 경로 / Path | 설명 / What it does |
|---|---|
| `/` | 대시보드 — 전체 통계, 카테고리 분포, 데이터 출처. Dashboard with totals and sources. |
| `/tree` | 카테고리 트리 — 17개 카테고리를 펼쳐 보기. Category drill-down. |
| `/graph` | 지식 그래프 — 259노드·269엣지 관계 시각화(ReactFlow). Relation graph. |
| `/norms` | 어문 규범 — 110개 핵심 조항 + 부록 개정 이력. Norm browser. |
| `/search` | 통합 검색 — Tier A(즉시) + Tier B(설정 시) 동시 검색. Unified search. |
| `/entry/:id` | 엔트리 상세 — 예시·키워드·개정 이력. Entry detail page. |

---

## 빠른 실행 / Quick start

```bash
git clone https://github.com/J-Seo/kocca-ontology-explorer-public.git
cd kocca-ontology-explorer-public
npm install
npm run dev          # http://localhost:3000
```

Tier B 환경변수를 설정하지 않아도 위 4개 페이지와 Tier A 검색은 정상 동작합니다.
*Without any Tier B config, the app runs in Tier A-only mode.*

요구 사항 / Requirements: Node.js ≥ 20 (앱 실행). 단, `npm run migrate:turso`는
내장 `node:sqlite`를 쓰므로 **Node ≥ 22.13**이 필요합니다.

---

## 전체 데이터 사용 / Using the full Tier B data

검색에서 170만 표제어 전체를 조회하려면 Tier B를 설정합니다. 자세한 절차와
문제 해결은 [`SETUP.md`](./SETUP.md)에 있습니다.

```bash
# 1) Hugging Face에서 lexicon.sqlite(810MB) 다운로드 → src/data/lexicon/
bash scripts/download-tierB.sh

# 2) Turso DB 생성 후 URL/토큰을 .env.local 에 기입
cp .env.example .env.local       # TURSO_DATABASE_URL, TURSO_AUTH_TOKEN 채우기

# 3) SQLite → Turso 업로드 (Node ≥ 22.13 필요)
npm run migrate:turso
```

> Turso 없이도 됩니다 / Runs without Turso: 환경변수를 비워두면 검색이 자동으로
> Tier A 전용으로 동작하고, 화면에 "Tier B 미설정" 안내가 나옵니다.

---

## 데이터 출처와 라이선스 / Data sources and license

원자료는 모두 국립국어원이 공개한 것입니다 / All source data is from NIKL:

| 자원 / Resource | 표제어·조항 / Count | 출처 / Source |
|---|---:|---|
| 표준국어대사전 stdict | 436,574 | stdict.korean.go.kr |
| 우리말샘 urimalsam | 1,204,559 | opendict.korean.go.kr |
| 한국어기초사전 krdict | 53,672 | krdict.korean.go.kr |
| 어문 규범 kornorms | 490조항(4종) + 80,115용례 | kornorms.korean.go.kr |

- **코드 / Code:** [MIT](./LICENSE)
- **데이터 / Data:** [CC BY-SA 2.0 KR](./DATA_LICENSE.md) — 출처 표시 + 동일조건 변경허락 (출처: 국립국어원)

---

## 정확도와 한계 / Accuracy and limitations

솔직하게 적습니다 / In plain terms:

- **비공식 가공물입니다.** 분류·정규화 과정에서 원자료와 달라진 부분이 있을 수 있습니다.
  표준 정보는 원자료를 확인하세요. *Unofficial; classification/normalization may differ from the source.*
- **어문 규범 조항 수 표기 주의.** Tier B `norm` 테이블의 490조항은 4종 규범
  (한글맞춤법 152·표준어규정 125·외래어표기법 110·로마자표기법 103)의 합계입니다.
  Tier A의 "110조항 + 부록 380건"과는 다른 집계이며, 110+380=490은 우연의 일치입니다.
- **멀티에이전트 시스템은 이 저장소에 없습니다.** 그래프의 "에이전트" 표시는 별도 시스템이
  이 온톨로지를 어떻게 참조할지 보여주는 개념도이며, 실제 LLM·오케스트레이터 코드는 포함되지 않습니다.
  *The "agent" mapping in the graph is a concept map; no agent runtime ships here.*
- **Tier B 검색 성능.** 표제어 검색은 인덱스를 타는 범위 질의로 동작합니다. 무료 Turso는
  콜드 스타트 시 첫 응답이 느릴 수 있습니다. *Free-tier Turso can be slow on cold start.*

---

## 인용 / Citation

```bibtex
@software{korean_lexicon_ontology_explorer_2026,
  title  = {Korean Lexicon Ontology Explorer},
  author = {Seo, Jaehyung},
  year   = {2026},
  url    = {https://github.com/J-Seo/kocca-ontology-explorer-public},
  note   = {Data licensed under CC BY-SA 2.0 KR. Source: National Institute of Korean Language.}
}
```

GitHub "Cite this repository" 버튼([`CITATION.cff`](./CITATION.cff))으로도 인용 정보를 얻을 수 있습니다.

## 문의와 기여 / Contact and contribution

- 이슈·PR 환영합니다 / Issues and PRs welcome — 데이터 오류 제보, 분류 개선, 시각화 추가 등.
- 이메일 / Email: wolhalang@gmail.com

## 기술 스택 / Tech stack

Next.js 16 (App Router) · React 19 · Tailwind CSS · @xyflow/react(그래프) ·
@libsql/client(Turso) · Vercel 배포.

---

## 용어 사전 / Glossary

| 용어 | 쉬운 설명 |
|---|---|
| 온톨로지 / ontology | 개념과 그 관계를 정리한 지식 구조. 여기서는 규칙·어휘를 카테고리로 묶고 서로 연결한 것. |
| 표제어 / headword | 사전에 올라가는 올림말(예: "카페"). |
| 어문 규범 / language norms | 한글맞춤법·표준어규정·외래어표기법·로마자표기법 등 국어 규정. |
| SQLite | 파일 하나로 된 가벼운 데이터베이스. `lexicon.sqlite`가 그것. |
| Turso / libSQL | SQLite를 클라우드에서 서비스해 주는 호스팅. 웹앱이 Tier B를 여기서 읽음. |
| Hugging Face | AI 모델·데이터셋 공유 사이트. 큰 Tier B 파일을 여기서 배포. |
| Tier A / Tier B | 저장소에 든 작은 데이터 / 외부에서 받는 큰 데이터. |
