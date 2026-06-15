# 레포지토리 가이드 / Repository guide

3분 안에 저장소 구조를 파악하기 위한 문서입니다. 더 친절한 소개는
[`README.md`](../README.md), 설치는 [`SETUP.md`](../SETUP.md), 데이터 검증 결과는
[`DATA_VALIDATION.md`](./DATA_VALIDATION.md)를 보세요.

A 3-minute map of the repo. See README for the intro, SETUP to install, and
DATA_VALIDATION for the data checks.

---

## 레포지토리 구조 / Repository map

| 경로 / Path | 한국어 설명 | English | 언제 손대나 / When to touch |
|---|---|---|---|
| `src/app/` | Next.js 페이지(대시보드·트리·그래프·규범·검색·엔트리) | App Router pages | UI 수정 시 |
| `src/app/api/search/route.ts` | 통합 검색 API (Tier A + Tier B) | Search API | 검색 로직 변경 시 |
| `src/lib/ontology/loader.ts` | Tier A JSON 로더·검색 | Loads/searches bundled JSON | 카테고리·점수 조정 시 |
| `src/lib/turso/client.ts` | Tier B(Turso) 검색 클라이언트 | Turso/libSQL client | 표제어 검색·DB 연동 시 |
| `src/lib/graph/analyze.ts` | 그래프 인접·계층 분석 | Graph neighborhood logic | 그래프 동작 변경 시 |
| `src/lib/agents/mapping.ts` | 에이전트↔카테고리 개념 매핑(정적) | Static agent→category map (concept only) | 그래프 라벨 조정 시 |
| `src/lib/types.ts` | 공용 타입 정의 | Shared TypeScript types | 데이터 구조 변경 시 |
| `src/data/ontology/` | **Tier A 데이터** — JSON 19개(~5MB) | Bundled Tier A data | 규칙·어휘 데이터 수정 시 |
| `scripts/download-tierB.sh` | HF에서 lexicon.sqlite 다운로드 | Download Tier B from HF | Tier B 설치 시 |
| `scripts/migrate-to-turso.ts` | 로컬 SQLite → Turso 업로드 | Migrate SQLite → Turso | Tier B 설치 시 |
| `scripts/e2e-prod.mjs` | 배포본 E2E 점검(20 시나리오) | Production E2E check | 배포 후 점검 시 |
| `scripts/verify-local-data.mjs` | Tier A 번들 무결성·건수 점검 | Tier A smoke check | 데이터 변경/CI 시 |
| `.env.example` | 환경변수 템플릿 | Env template | Tier B 설정 시 |
| `LICENSE` / `DATA_LICENSE.md` | 코드(MIT) / 데이터(CC BY-SA) 라이선스 | Code / data license | 라이선스 확인 시 |
| `CITATION.cff` | 인용 정보 | Citation metadata | 인용 시 |
| `src/data/lexicon/` | **Tier B 다운로드 위치**(저장소엔 없음, .gitignore) | Where Tier B lands (gitignored) | 직접 만질 일 없음 |

> 저장소에 들어 있는 데이터는 `src/data/ontology/`뿐입니다(Tier A, ~5MB).
> 큰 Tier B(810MB)는 저장소 밖 Hugging Face에 있고 `src/data/lexicon/`로 받습니다.
> *Only Tier A lives in the repo; Tier B is external (Hugging Face).*

---

## 자주 묻는 질문 / FAQ

**이 프로젝트가 푸는 문제는? / What problem does it solve?**
국립국어원 사전·규범 자료가 여러 사이트에 흩어져 있어 한 번에 검색·비교하기
어렵습니다. 이를 정규화해 한 화면에서 검색·탐색하게 합니다.
*NIKL data is spread across sites; this unifies it into one searchable explorer.*

**저장소 안에 든 데이터는? / What data is inside the repo?**
`src/data/ontology/`의 Tier A JSON 19개(약 5MB): 4,545 엔트리(17 카테고리,
어문 규범 110조항 포함) + 부록 이력 380건 + 그래프(259노드/269엣지).

**저장소 밖 데이터는? / What's outside?**
Tier B SQLite(약 810MB): 표제어 1,694,805건 + 어문 규범 490조항 + 용례 80,115건.
Hugging Face `J-Seo/kocca-ontology-tierB`에 있습니다.

**Hugging Face에서 받아야 하는 것은? / What must be downloaded?**
`lexicon.sqlite`(810MB)와 `lexicon.meta.json`(377B). `bash scripts/download-tierB.sh`.

**Turso 없이 앱이 도나요? / Can it run without Turso?**
네. 환경변수를 비우면 검색이 Tier A 전용으로 동작하고 "Tier B 미설정" 배너가 뜹니다.
*Yes — Tier A-only mode with a banner.*

**번들 데이터만으로 동작하는 페이지는? / Which pages work with bundled data only?**
대시보드(`/`)·트리(`/tree`)·그래프(`/graph`)·규범(`/norms`)·엔트리(`/entry/:id`)가
완전 동작하고, 검색(`/search`)은 Tier A 4,545건 범위에서 동작합니다.

**코드 라이선스는? / Code license?** MIT ([`LICENSE`](../LICENSE)).

**데이터 라이선스는? / Data license?** CC BY-SA 2.0 KR (출처 국립국어원). 단, 자원별
정확한 라이선스는 [`DATA_LICENSE.md`](./../DATA_LICENSE.md)의 확인 안내를 참고하세요.

**국립국어원 공식 자료인가요? / Official NIKL data?**
아니요. 공개 자료를 개인이 가공한 **비공식** 결과물입니다. 표준 정보는 원자료를 확인하세요.
*No — an unofficial, processed dataset. Not an official NIKL/KOCCA service.*

**비전문가도 써볼 수 있나요? / Can a non-expert try it?**
네. 설치 없이 데모 링크를 열면 됩니다: https://kocca-ontology-explorer.vercel.app
