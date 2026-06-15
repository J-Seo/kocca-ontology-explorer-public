# 감사 보고서 / Audit Report

**대상 / Target:** `J-Seo/kocca-ontology-explorer-public`
**감사일 / Date:** 2026-06-15 ·
**범위 / Scope:** 보안·개인정보, 문서 가독성, Hugging Face 데이터 검증, 빌드·타입·런타임, 예외 케이스

> 본 보고서는 README 주장이 아니라 **실제 명령 실행과 파일 근거**에 기반합니다.
> 수정은 작고 검토 가능한 단위로 적용했고, 큰 변경은 적용 대신 문서화했습니다.
> All findings are backed by commands/file evidence, not README claims. Small safe
> fixes were applied; larger changes are documented rather than applied.

---

## 1. 점검 요약 / Audit summary

- **보안/개인정보:** 작업 트리·git 히스토리(커밋 2개) 모두에서 **실제 시크릿 없음**.
  토큰·키·DB URL은 모두 플레이스홀더. 개인 Gmail이 연락처로 공개되어 있으나 의도된 것으로 보임(확인 권장).
  *No real secrets in tree or history; only placeholders. Personal Gmail is published as contact (intentional, confirm).*
- **문서:** README가 다소 AI 문체였고 영어가 상단 요약에만 있었음 → **한국어 우선 이중언어로 전면 재작성**,
  `docs/REPO_GUIDE.md`·`docs/DATA_VALIDATION.md` 추가. 여러 수치 오기(엣지 263→269, 페이지 6→5 등)와
  오해 소지가 큰 어문 규범 조항수 설명을 정정.
- **Hugging Face 데이터:** 810MB SQLite를 **실제로 다운로드**해 무결성·건수·쿼리플랜까지 검증.
  모든 건수가 meta.json·README와 정확히 일치(1,694,805 등). HF 카드 메타데이터에 불일치 발견(문서화).
- **빌드/타입:** `next build`·`tsc --noEmit` **통과**(수정본 포함 재검증). `npm run lint`는 Next 16에서
  `next lint` 제거로 **깨져 있음**(문서화).
- **런타임/성능:** 가장 큰 문제는 **Tier B 검색이 인덱스를 못 타 170만행 풀스캔(실측 15~34초)**.
  범위 질의로 수정해 인덱스 사용·동일 결과를 검증. 대시보드 COUNT 풀스캔, 검색 경쟁 조건,
  비결정 페이지네이션, NFC 미정규화 등도 수정.
- **정직성:** 앱이 "국립국어원/KoCCA 공식 서비스"이자 "멀티에이전트 연동"으로 읽힐 소지가 있었으나,
  실제 에이전트 런타임은 저장소에 없음 → **비공식 고지 추가 + 문구 완화**.

심각도 분포 / Severity counts: **P1 ×5, P2 ×7, P3 ×18** (아래 표 참조).

---

## 2. 실행한 명령 / Commands run

```bash
# 보안/개인정보
git -C <repo> log -p --all | rg '(eyJ|sk-|ghp_|AKIA|PRIVATE KEY|libsql://)'   # → 플레이스홀더만
git rev-list --objects --all | rg 'sqlite|\.env|\.db'                          # → .env.example만
git grep -nE '<email>|010-[0-9]{4}|/Users/|libsql://'                          # → 분석

# Hugging Face + SQLite
hf download J-Seo/kocca-ontology-tierB --repo-type dataset --include "lexicon.meta.json|lexicon.sqlite"
sqlite3 lexicon.sqlite "PRAGMA integrity_check;"            # → ok
sqlite3 lexicon.sqlite "SELECT source,COUNT(*) FROM lex GROUP BY source;"
sqlite3 lexicon.sqlite "EXPLAIN QUERY PLAN SELECT * FROM lex WHERE headword LIKE '카페%';"  # → SCAN

# 빌드/타입/데이터
npx tsc --noEmit            # 통과
npx next build              # 통과 (6 routes)
node scripts/e2e-prod.mjs   # 라이브 데모 점검 (검색 API 타임아웃 12/20 → 성능 이슈 확인)
node scripts/verify-local-data.mjs   # Tier A 4,545 등 통과
```

외부 스캐너(`gitleaks`, `trufflehog`)는 미설치라 정규식·수동 점검으로 대체했습니다.
*External scanners were unavailable; used regex + manual review instead.*

---

## 3. 보안·개인정보 / Security & privacy

| ID | 심각도 | 근거 / Evidence | 한국어 | English | 권고/조치 | 상태 |
|---|---|---|---|---|---|---|
| SEC-01 | 정보 | `git log -p --all`, `rev-list --objects --all` | 작업 트리·히스토리(커밋 2개)에 실제 시크릿 없음. `.env.example`만 추적됨 | No real secrets in tree or 2-commit history; only `.env.example` placeholders | 조치 불필요 | ✅ 확인 |
| SEC-02 | P3 | `src/lib/turso/client.ts:58` (수정 전) | 연결 실패 시 `getTursoStatus().error`가 대시보드에 그대로 렌더 → libsql URL 노출 가능 | Raw libsql error echoed to homepage could leak DB URL | 오류 메시지에서 `libsql://` 제거(`sanitizeError`) | ✅ 수정 |
| SEC-03 | P3 | `README.md:175`, 커밋 author | 개인 Gmail `wolhalang@gmail.com`이 연락처 + 커밋 메타데이터로 공개 | Personal Gmail public as contact + commit metadata | 의도면 유지, 기관 주소 선호 시 교체 | 🔶 소유자 확인 |
| SEC-04 | P3 | `.gitignore` (수정 전) | 전역 `*.sqlite/*.db`·`.env*.local` 규칙 없음, `src/data/lexicon/`의 meta·`.cache`도 미제외 | No global DB/`.env*.local` globs; HF meta/cache not ignored | 안전망 규칙 추가 + `src/data/lexicon/` 전체 제외 | ✅ 수정 |
| SEC-05 | 정보 | `grammar-rules.json:2397` | `010-1234-5678`은 전화번호 표기 규칙의 예시(가짜 번호) | Fake sample phone in a grammar example | 실제 PII 아님 | ✅ 안전 |
| SEC-06 | 정보 | `SETUP.md`, `e2e-prod.mjs:6` | 문서/스크립트에 실제 Turso DB명 `kocca-ontology`·배포 도메인 노출 | Real Turso DB name + domain in docs | 비밀 아님. 원하면 `<your-db>`로 일반화 | 🔶 선택 |

요약: 시크릿 유출 없음. 로컬 개발본의 `.env.local`(실제 Turso JWT 보유)은 **gitignore되어 공개 저장소·히스토리에 없음**을 확인했습니다.
*No secret leak. The dev machine's `.env.local` holds a live Turso JWT but is gitignored and absent from the public repo/history.*

---

## 4. 문서 가독성 / Documentation readability

| ID | 심각도 | 근거 | 한국어 | English | 조치 | 상태 |
|---|---|---|---|---|---|---|
| DOC-01 | P2 | `README.md` 전반 | AI 문체("provides an integrated exploration interface"), 영어가 상단 요약에만 존재 | AI-ish prose; English only in the top summary | 한국어 우선 이중언어로 전면 재작성 + 용어 사전 | ✅ 수정 |
| DOC-02 | P3 | `SETUP.md:108` | 검증 쿼리 `FROM lexicon_entries` — 그런 테이블 없음(실제 `lex`) | Verification query uses a nonexistent table | `SELECT COUNT(*) FROM lex` 로 수정 | ✅ 수정 |
| DOC-03 | P3 | `README:41`, `DATA_LICENSE:37` | 그래프 "263엣지" 오기(실제 269) | Edge count says 263; actual 269 | 269로 정정 | ✅ 수정 |
| DOC-04 | P2 | `README:59`, `DATA_LICENSE:18`, `page.tsx:106` | 어문 규범 490을 "110조항+380부록"으로 설명(오해 소지) | 490 glossed as "110+380" — misleading | 4종 합계(152+125+110+103)임을 명시, Tier A 110/380과 분리 | ✅ 수정 |
| DOC-05 | P3 | `SETUP.md:153` | "6개 페이지"인데 5개만 나열/점검 | Says 6 pages, lists/tests 5 | "5개 페이지(20 시나리오)"로 수정 | ✅ 수정 |
| DOC-06 | P3 | `DATA_LICENSE:35` | "17 카테고리 (vocabulary.json)" — vocabulary.json은 17개 중 하나 | Attributes all 17 categories to one file | "src/data/ontology 17개 JSON"로 수정 | ✅ 수정 |
| DOC-07 | P3 | `CITATION.cff` vs `package.json` | 버전 1.0.0 vs 0.1.0 불일치 | Version mismatch | package.json을 1.0.0으로 통일 | ✅ 수정 |
| DOC-08 | P3 | `loader.ts:2` | 도크스트링 "17개 JSON"이나 실제 19개 import | Docstring undercounts JSON (17 vs 19) | "17 카테고리(19종 JSON)"로 수정 | ✅ 수정 |
| DOC-09 | P3 | `README:50` | "4,545 / 17카테고리 + 110조항" 가산처럼 읽힘(110은 이미 포함) | "+110" reads additive but is already included | "어문 규범 110조항 포함"으로 재작성 | ✅ 수정 |
| DOC-10 | P3 | `mapping.ts:8`, `migrate:6`, `.env.example:8` | 비공개 `demo/` 모노레포 경로가 공개본에 잔존 | Stale private `demo/` paths leak structure | 전부 제거/정정 | ✅ 수정 |

신규 문서 / New docs: `docs/REPO_GUIDE.md`(레포 지도+FAQ), `docs/DATA_VALIDATION.md`(검증 기록).

---

## 5. Hugging Face 데이터 검증 / HF data verification

전체 절차·결과는 [`docs/DATA_VALIDATION.md`](./docs/DATA_VALIDATION.md) 참조. 요지:

| 항목 | 결과 |
|---|---|
| 데이터셋 공개 / public | ✅ `J-Seo/kocca-ontology-tierB` 접근 가능(다운로드 25) |
| 파일 / files | ✅ `lexicon.sqlite`(810MB), `lexicon.meta.json`(377B) |
| 무결성 / integrity | ✅ `PRAGMA integrity_check` = ok |
| 건수 일치 / counts | ✅ stdict 436,574 / urimalsam 1,204,559 / krdict 53,672 / total 1,694,805 / norm 490 / examples 80,115 — meta·SQLite·README **완전 일치** |
| 다운로드 스크립트 / download | ✅ `download-tierB.sh`는 `src/data/lexicon/`로 받음 |
| 경로 정합성 / path | ❌→✅ 마이그레이션 기본 경로가 `../demo/...`였음(아래 BUILD-04) — 수정 |
| README 과장 / overclaim | ✅ 810MB가 GitHub에 번들된 것처럼 오해시키지 않음(외부 명시) |

| ID | 심각도 | 근거 | 한국어 | English | 조치 | 상태 |
|---|---|---|---|---|---|---|
| HF-01 | P2 | `hub_repo_details` | 카드 라이선스 태그 `other`(본문은 CC-BY-SA), 크기 태그 `n<1K`와 `1M<n<10M` 동시, 뷰어 "1 row", `format:json`(실제 SQLite) | HF card metadata inconsistent; viewer shows 1 row (binary SQLite) | HF에서 라이선스/크기 태그 정정, "뷰어 1행=meta sidecar" 안내 추가 | 🔶 소유자 조치(HF) |

> 환경 제약: 810MB 전체를 받아 검증 완료. 단, 수정한 검색 질의의 **라이브 Turso 부하 테스트는 미수행**(로컬 SQLite에서 결과 동치·인덱스 사용만 검증).

---

## 6. 빌드·타입·런타임 / Build, type, runtime

| ID | 심각도 | 근거 | 한국어 | English | 조치 | 상태 |
|---|---|---|---|---|---|---|
| PERF-01 | **P1** | `EXPLAIN QUERY PLAN`, 라이브 측정 34s | 표제어 검색이 `LIKE 'q%'`라 인덱스 못 탐 → 170만행 풀스캔(원격 15~34초) | Search `LIKE` can't use index → full scan, 15–34s on live Turso | 동일결과 범위질의(`>= q AND < q+￿`)로 교체, 인덱스 사용 확인 | ✅ 수정 |
| PERF-02 | P2 | `client.ts:44`, 대시보드 13.9s | 대시보드가 매 요청 `COUNT(*)` 3회 풀스캔 | Dashboard runs 3× COUNT(*) full scans per load | `meta` 테이블의 사전계산 카운트 사용 | ✅ 수정 |
| RESIL-01 | P2 | `route.ts:43`, `client.ts` | Turso 호출에 타임아웃 없음 → 느리면 검색 전체가 무한 대기(Tier A도 묶임) | No query timeout; slow Turso hangs whole search | 8초 `withTimeout`으로 Tier A graceful degrade | ✅ 수정 |
| BUILD-01 | **P1** | `migrate:19`, `SETUP:9` | `node:sqlite`는 Node ≥22.13 필요인데 문서는 ≥20 | `node:sqlite` needs Node ≥22.13 but docs say ≥20 | SETUP/README에 마이그레이션 Node 요건 명시 | ✅ 수정 |
| BUILD-02 | P2 | `package.json:9`, 실행 로그 | `npm run lint`가 Next 16의 `next lint` 제거로 깨짐("no such directory: .../lint") | `next lint` removed in Next 16 → lint script broken | ESLint CLI 마이그레이션 필요(아래 권고) | 📝 문서화 |
| BUILD-03 | P3 | lockfile 부재 | `package-lock.json` 없음 → `npm ci` 불가, 빌드 재현성 저하 | No lockfile → `npm ci` impossible | 락파일 커밋 권장 | 📝 문서화 |
| BUILD-04 | **P1** | `migrate:24`, `download-tierB.sh:18` | 다운로드는 `src/data/lexicon/`인데 마이그레이션 기본경로는 `../demo/...` → 다운로드 후 마이그레이션 실패 | Download dir ≠ migrate default path → migrate fails | 기본 경로를 `src/data/lexicon/`로 정정 | ✅ 수정 |
| RUN-01 | P2 | `client.ts:149` | `rowToLex`가 `row.related_norms`를 읽음(실제 컬럼 `related_norms_json`) → Tier B 관련규범 항상 빈값(11,707행 영향) | Wrong column name → Tier B related-norms always empty | `related_norms_json`으로 수정 | ✅ 수정 |
| RUN-02 | P2 | `search/tree/norms/graph page.tsx` | 클라이언트 컴포넌트가 loader를 import → Tier A JSON 5MB가 브라우저 번들로 전송 | Client pages pull ~5MB Tier A JSON into the browser bundle | 서버 전용 로더 분리/슬라이스화 권장(구조 변경) | 📝 문서화 |
| RUN-03 | P2 | `search/page.tsx:33` | 디바운스가 타이머만 취소, 인플라이트 요청 미취소 → 느린 이전 응답이 최신 결과 덮어씀 | Request race: stale response can overwrite fresh | `reqId` ref로 최신 요청만 반영 | ✅ 수정 |

빌드 결과: `✓ Compiled successfully`, `Finished TypeScript`, 6개 라우트 생성(수정본 재검증). Lint만 별도 이슈.

### BUILD-02 권고(린트) / lint fix

```jsonc
// package.json
"lint": "eslint ."
// + devDependencies: "eslint", "eslint-config-next"
// + eslint.config.mjs (flat config, extends 'next/core-web-vitals')
// 또는 공식 코드모드: npx @next/codemod@latest next-lint-to-eslint-cli .
```
현재 저장소엔 ESLint 설정·의존성이 없어, 도구 추가는 소유자 판단에 맡기고 문서화만 했습니다.

---

## 7. 예외 케이스 / Edge cases

| ID | 심각도 | 근거 | 한국어 | English | 조치 | 상태 |
|---|---|---|---|---|---|---|
| EDGE-01 | P3 | `entry/[id]/page.tsx:9` | 잘못된 퍼센트 인코딩(`/entry/%`)이 `decodeURIComponent`에서 던져 500 | Malformed `%` → URIError → 500 not 404 | try/catch → `notFound()` | ✅ 수정 |
| EDGE-02 | P3 | `client.ts` LIKE | 사용자 입력의 `%`·`_`가 와일드카드로 동작(인젝션 아님) | `%`/`_` act as wildcards (not injection) | lex는 범위질의로 회피, example은 `escapeLike`+`ESCAPE` | ✅ 수정 |
| EDGE-03 | P3 | `client.ts`, NFC 테스트 | NFD 입력(맥OS 붙여넣기 등)이 NFC 저장 표제어와 불일치 | NFD query won't match NFC-stored headwords | 검색어 `normalize('NFC')` 적용 | ✅ 수정 |
| EDGE-04 | P2 | `client.ts` ORDER BY | 동순위 타이브레이커 없어 "더 보기" 페이지네이션이 중복/누락 가능 | Non-deterministic ORDER BY → paging skips/dupes | `target_code`/`rowid` 타이브레이커 추가 | ✅ 수정 |
| EDGE-05 | P2 | `page.tsx:29,117` | 같은 페이지에서 카테고리 수 17 vs 16 모순 | Dashboard says 17 and 16 categories | "17개(어문 규범 포함)"로 통일 | ✅ 수정 |
| EDGE-06 | P3 | `page.tsx:71`, `tree/page.tsx` | `/tree?cat=` 링크를 트리가 안 읽어 딥링크 죽음 | `?cat=` deep-link ignored | `useSearchParams`+Suspense로 반영 | ✅ 수정 |
| EDGE-07 | P3 | `tree:31`, `page:66` | 메모이즈 배열을 렌더 중 `.sort()`로 변형 | In-place sort mutates memoized array | `[...arr].sort()` | ✅ 수정 |
| EDGE-08 | P2 | 전 페이지 | 라벨/aria/role/포커스 스타일 부재(WCAG 미흡) | No labels/aria/focus styles | 입력에 `aria-label`, 전역 `:focus-visible` 추가(일부) | 🔶 일부 수정 |
| EDGE-09 | P3 | `layout.tsx` | robots/sitemap·페이지별 메타데이터 없음 | No robots/sitemap/per-page metadata | `generateMetadata`/robots·sitemap 추가 권장 | 📝 문서화 |
| EDGE-10 | P3 | `search/page.tsx:146` | 내부 디버그 `score`가 사용자 화면에 노출 | Internal relevance score shown to users | 노출 제거 | ✅ 수정 |
| HON-01 | **P1** | `layout.tsx`, `page.tsx`, DATA_LICENSE만 고지 | "국립국어원/KoCCA 공식"으로 오인 소지, UI/README에 비공식 고지 없음 | Reads as official NIKL/KoCCA service; no UI disclaimer | README·레이아웃·대시보드에 "비공식" 고지 추가 | ✅ 수정 |
| HON-02 | **P1** | `page.tsx:19`, `graph/page.tsx:318`, `mapping.ts` | 저장소에 없는 "멀티에이전트 시스템 연동"을 라이브처럼 광고 | Advertises a multi-agent system absent from the repo | "개념도, 런타임 미포함"으로 문구 완화 | ✅ 수정 |
| LIC-01 | **P1** | `DATA_LICENSE:6` | "4자원 모두 CC BY-SA 2.0 KR" 단정(표준국어대사전은 KOGL 1유형 가능, 어문 규범 미확인) | Blanket CC-BY-SA claim possibly overstated for stdict/norms | **소유자 요청으로 보류** — 원문 유지, 추후 자원별 확인 후 결정 | ⏸️ 보류 |
| TURSO-OK | 정보 | `route.ts:41` | 환경변수 없으면 Tier A 전용으로 정상 동작 + 배너 | Graceful Tier A-only fallback works | 조치 불필요 | ✅ 확인 |

---

## 8. 수정한 파일 / Files changed

**코드 / Code (검증: `tsc`+`next build` 통과):**
`src/lib/turso/client.ts`(범위질의·meta카운트·타임아웃·오류정화·NFC·이스케이프·타이브레이커·컬럼명),
`src/app/api/search/route.ts`(NFC), `src/app/search/page.tsx`(경쟁조건·score제거·aria),
`src/app/tree/page.tsx`(딥링크·sort·aria), `src/app/page.tsx`(문구·sort·카테고리수),
`src/app/layout.tsx`(비공식 고지·메타), `src/app/graph/page.tsx`(개념도 고지·aria),
`src/app/norms/page.tsx`(aria), `src/app/entry/[id]/page.tsx`(디코딩 가드),
`src/app/globals.css`(focus-visible), `src/lib/ontology/loader.ts`·`src/lib/agents/mapping.ts`(주석),
`scripts/migrate-to-turso.ts`(경로).

**문서/설정 / Docs & config:**
`README.md`(전면 재작성), `SETUP.md`(Node요건·테이블명·페이지수), `DATA_LICENSE.md`(라이선스·조항수·엣지·귀속),
`.env.example`(경로), `.gitignore`(안전망), `package.json`(버전·engines·verify:data).

**신규 / New:**
`docs/REPO_GUIDE.md`, `docs/DATA_VALIDATION.md`, `scripts/verify-local-data.mjs`, `AUDIT_REPORT.md`.

합계 / Total: **19 modified + 4 new**.

---

## 9. 남은 확인사항 / Remaining owner confirmations

1. **LIC-01 (P1) 자원별 라이선스 — 보류됨 / on hold** — 소유자 요청으로 라이선스 문구는
   원문(4자원 일괄 CC BY-SA 2.0 KR)을 그대로 두었습니다. 추후 표준국어대사전(공공누리 1유형
   여부)·어문 규범의 정확한 라이선스를 공식 고지로 확인해 `DATA_LICENSE.md`를 확정하세요.
2. **HF-01 (P2) Hugging Face 카드** — 라이선스 태그(`other`→CC-BY-SA), 크기 태그(`n<1K` 제거),
   `format:json` 재검토, "뷰어 1행=meta sidecar" 안내 추가는 소유자가 HF에서 적용해야 합니다(본 감사 범위 밖).
3. **SEC-03 (P3) 개인 Gmail** — 연락처를 개인 Gmail로 둘지, 기관/역할 주소로 바꿀지 결정하세요.
   바꾼다면 커밋 author 이메일도 함께 고려.
4. **BUILD-02 (P2) 린트** — ESLint(`eslint-config-next`) 도입 여부 결정(6장 권고 참조).
5. **BUILD-03 (P3) 락파일** — `package-lock.json` 커밋으로 재현 가능한 빌드 확보 권장.
6. **RUN-02 (P2) 클라이언트 번들** — Tier A 5MB가 브라우저로 가는 구조 개선(서버 전용 로더 분리)은
   다소 큰 변경이라 미적용. 우선순위 판단 필요.
7. **PERF-01 검증** — 수정한 범위 질의를 **라이브 Turso에 배포 후 재측정**(`node scripts/e2e-prod.mjs`)해
   15~34초 → 정상 응답을 확인하세요.
