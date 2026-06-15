# 데이터 검증 기록 / Data validation log

이 문서는 Tier B 데이터셋(`J-Seo/kocca-ontology-tierB`)과 Tier A 번들을 실제로
내려받아 확인한 결과를 기록합니다. 누구나 아래 명령으로 재현할 수 있습니다.

This document records the actual verification of the Tier B dataset and Tier A
bundle. Anyone can reproduce it with the commands below.

검증일 / Verified: 2026-06-15 · 도구 / tools: `hf` CLI, `sqlite3`, Node.js

---

## 1. Hugging Face 데이터셋 / dataset

```bash
hf download J-Seo/kocca-ontology-tierB --repo-type dataset \
  --include "lexicon.meta.json" --local-dir /tmp/kocca-tierB-check
cat /tmp/kocca-tierB-check/lexicon.meta.json
```

- 데이터셋은 **public** 으로 접근 가능 (다운로드 수 25). Dataset is public.
- `lexicon.meta.json` (377 B) 와 `lexicon.sqlite` (810 MB) 두 파일이 제공됨.
- `lexicon.meta.json` 내용 / contents:

```json
{
  "built_at": "2026-05-03T...",
  "license": "CC-BY-SA-2.0-KR",
  "license_holder": "국립국어원 (National Institute of Korean Language)",
  "counts": { "stdict": 436574, "urimalsam": 1204559, "krdict": 53672,
              "norm_articles": 490, "examples": 80115, "total_lex": 1694805 },
  "sqlite_path": "src/data/lexicon/lexicon.sqlite"
}
```

> 참고: Hugging Face의 데이터셋 뷰어는 "Total rows: 1"로 보입니다. 실제 데이터는
> 바이너리 SQLite 파일이라 뷰어가 읽지 못하고, 작은 `lexicon.meta.json` 한 줄만
> 파싱하기 때문입니다. 1행이 아니라 170만 표제어가 맞습니다.
> *The HF viewer shows "1 row" because the real payload is a binary SQLite the viewer
> can't parse — it only reads the tiny meta sidecar.*

---

## 2. SQLite 무결성·스키마 / integrity & schema

```bash
sqlite3 lexicon.sqlite "PRAGMA integrity_check;"   # → ok
sqlite3 lexicon.sqlite ".tables"
# example  lex  norm  meta  (+ lex_fts* FTS5 그림자 테이블)
```

- 무결성 검사 통과 (`ok`). Integrity check passed.
- 실제 테이블 이름은 **`lex` / `norm` / `example` / `meta`** 입니다.
  (예전 SETUP의 `lexicon_entries`는 잘못된 이름이라 본 감사에서 `lex`로 수정함.)
  *The real table is `lex`, not `lexicon_entries`.*

---

## 3. 건수 대조 / count cross-check

```bash
sqlite3 lexicon.sqlite "SELECT source, COUNT(*) FROM lex GROUP BY source;"
sqlite3 lexicon.sqlite "SELECT COUNT(*) FROM lex;"      # 1694805
sqlite3 lexicon.sqlite "SELECT COUNT(*) FROM norm;"     # 490
sqlite3 lexicon.sqlite "SELECT COUNT(*) FROM example;"  # 80115
```

| 항목 | meta.json | SQLite 실측 | README | 일치 |
|---|---:|---:|---:|:--:|
| stdict | 436,574 | 436,574 | 436,574 | ✅ |
| urimalsam | 1,204,559 | 1,204,559 | 1,204,559 | ✅ |
| krdict | 53,672 | 53,672 | 53,672 | ✅ |
| total_lex | 1,694,805 | 1,694,805 | 1,694,805 | ✅ |
| norm | 490 | 490 | 490 | ✅ |
| examples | 80,115 | 80,115 | 80,115 | ✅ |

`436,574 + 1,204,559 + 53,672 = 1,694,805` 도 일치합니다.

### 어문 규범 490조항의 실제 구성 / what the 490 norms really are

```bash
sqlite3 lexicon.sqlite "SELECT regulation, COUNT(*) FROM norm GROUP BY regulation;"
# 한글맞춤법 152 · 표준어규정 125 · 외래어표기법 110 · 로마자표기법 103 = 490
```

490은 4종 규범 조항의 합계입니다. Tier A의 "110 핵심 조항 + 380 부록 이력"과는
다른 집계이며, 110+380=490은 우연의 일치입니다. (문서를 이에 맞게 정정함.)

---

## 4. Tier A 번들 / bundled data

```bash
node scripts/verify-local-data.mjs
```

- 17개 카테고리 합계 = **4,545** (loader.ts `ONTOLOGY_TOTAL`과 일치)
- 어문 규범 핵심 조항 110, 부록 이력 380, 그래프 259노드·**269엣지**
  (README의 "263엣지"는 오기였고 269로 수정함)

---

## 5. 검색 성능 점검 / search performance

```bash
sqlite3 lexicon.sqlite "EXPLAIN QUERY PLAN
  SELECT * FROM lex WHERE headword LIKE '카페%';"   # → SCAN lex (풀스캔)
sqlite3 lexicon.sqlite "EXPLAIN QUERY PLAN
  SELECT * FROM lex WHERE headword >= '카페' AND headword < '카페'||char(65535);"
  # → SEARCH lex USING INDEX idx_lex_headword (인덱스 사용)
```

기존 검색은 `LIKE 'q%'`를 썼는데, SQLite 기본 LIKE는 대소문자 무시라 인덱스를
타지 못하고 170만 행을 풀스캔합니다(원격 Turso에서 15~34초). 동일 결과를 주는
범위 질의(`>= q AND < q+￿`)로 바꿔 인덱스를 타도록 수정했습니다. 한글 접두
표본(카페·사이·물·가·학교)에서 LIKE와 범위 질의의 결과 집합이 동일함을 확인했습니다.

*Search used `LIKE 'q%'`, which can't use the index (default case-insensitive LIKE),
causing a full scan of 1.7M rows (15–34 s on remote Turso). Replaced with an
equivalent indexed range query; verified identical result sets on Korean prefixes.*

---

## 환경 제약 / environment notes

- 810 MB SQLite 전체를 내려받아 무결성·건수·쿼리플랜까지 확인했습니다(상기 결과).
  The full 810 MB SQLite was downloaded and fully checked.
- 수정한 검색 질의는 로컬 SQLite에서 결과 동치·인덱스 사용을 검증했습니다. 원격
  Turso에 대한 부하 테스트는 수행하지 않았습니다. *The patched query was verified
  on local SQLite (equivalence + index use); not load-tested against live Turso.*
