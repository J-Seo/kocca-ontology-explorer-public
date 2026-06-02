# 셋업 가이드 (Setup Guide)

본 문서는 Korean Lexicon Ontology Explorer 를 로컬에서 실행하고 Vercel에 배포하는
전체 절차를 설명합니다.

---

## 0. 사전 요구사항

- **Node.js** ≥ 20
- **npm** ≥ 10 (또는 pnpm / yarn)
- **Hugging Face CLI** (Tier B 데이터 다운로드용)
  ```bash
  brew install huggingface-cli
  # 또는
  pip install -U huggingface_hub
  ```
- **Turso CLI** (Tier B 호스팅용)
  ```bash
  brew install tursodatabase/tap/turso
  ```
- 무료 Turso 계정 (https://turso.tech) — 5 GB / 1B row reads 무료
- (배포 시) Vercel 계정

> Tier A만 쓸 경우 Turso·HF CLI 없이도 개발 서버는 정상 동작합니다.
> 검색 페이지에서 170만 표제어를 조회하려면 Tier B 설정이 필요합니다.

---

## 1. 소스 받기

```bash
git clone https://github.com/J-Seo/kocca-ontology-explorer-public.git
cd kocca-ontology-explorer-public
npm install
```

## 2. Tier B 데이터 다운로드

Hugging Face Datasets 에서 `lexicon.sqlite` (810 MB) 를 받아 `src/data/lexicon/` 에
배치합니다.

```bash
bash scripts/download-tierB.sh
```

내부적으로 다음을 실행합니다:

```bash
hf download J-Seo/kocca-ontology-tierB \
  --repo-type dataset \
  --local-dir src/data/lexicon
```

다운로드 완료 후 `src/data/lexicon/` 에 다음 파일이 있어야 합니다.

```
lexicon.sqlite        810M
lexicon.meta.json     377B
```

## 3. Turso DB 생성 + 마이그레이션

### 3-1. 계정 + DB 생성

```bash
turso auth signup            # 처음이면 signup, 이후는 login
turso db create kocca-ontology
```

### 3-2. URL + 토큰 발급

```bash
turso db show kocca-ontology --url
# → libsql://kocca-ontology-<your-org>.turso.io

turso db tokens create kocca-ontology --expiration none
# → eyJhbGciOi... (토큰 문자열)
```

### 3-3. `.env.local` 설정

```bash
cp .env.example .env.local
```

`.env.local` 내용:

```
TURSO_DATABASE_URL=libsql://kocca-ontology-<your-org>.turso.io
TURSO_AUTH_TOKEN=<발급된 토큰>
```

### 3-4. 마이그레이션 실행

```bash
npm run migrate:turso
```

- 약 **8~15분** 소요 (네트워크에 따라 변동)
- batch 200 단위로 끊어 보내며 502/503/504 시 지수 백오프 자동 재시도
- 진행률이 실시간으로 콘솔에 표시됨
- 도중에 끊겨도 재실행 시 이어서 진행됨 (idempotent)

완료 후 검증:

```bash
turso db shell kocca-ontology "SELECT COUNT(*) FROM lexicon_entries;"
# → 약 1,694,805
```

## 4. 로컬 개발 서버

```bash
npm run dev
# http://localhost:3000
```

브라우저에서 대시보드 우측 상단 "Tier B 상태"가 ✅ 로 표시되면 정상.
미설정/연결 실패 시 "미설정" 또는 "❌" 와 함께 진단 정보가 표시됩니다.

## 5. 프로덕션 빌드

```bash
npm run build
npm start
```

## 6. Vercel 배포

### 6-1. GitHub에 push

```bash
git remote add origin https://github.com/<your-user>/<your-repo>.git
git push -u origin main
```

### 6-2. Vercel import

1. https://vercel.com/new 에서 GitHub repo 선택
2. Framework: **Next.js** (자동 감지)
3. 환경변수 추가
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
4. Deploy

### 6-3. 배포 후 점검

```bash
node scripts/e2e-prod.mjs https://<your-domain>.vercel.app
```

대시보드 / 트리 / 그래프 / 규범 / 검색 6개 페이지 + 주요 API의 응답·캐싱·
Tier B 카운트를 일괄 점검합니다.

---

## 트러블슈팅

### `migrate:turso` 가 502/503 으로 자주 실패합니다
- 정상 동작입니다. 자동 재시도가 작동하므로 종료될 때까지 기다리세요.
- 그래도 진행이 멈춘 듯하면 Ctrl+C 후 재실행 (이어서 진행됨).

### Turso 무료 한도를 초과합니다
- 무료: 5 GB 스토리지 + 1B row reads/월
- 본 데이터셋은 약 1.5 GB 차지 (스토리지 OK)
- 트래픽이 크면 Scaler 플랜 ($29/월) 또는 자체 libSQL 호스팅 고려

### `download-tierB.sh` 가 인증을 요구합니다
- 데이터셋이 public 인지 확인. private 이라면 `hf auth login` 필요.
- 본 프로젝트의 공식 데이터셋은 public 입니다.

### Tier A 만으로 운영하고 싶습니다
- Tier B 환경변수를 비워두면 자동으로 Tier A 전용 모드로 동작합니다.
- 검색 페이지는 Tier A 4,545엔트리에 대해서만 결과를 반환합니다.

### 그래프가 비어 보입니다
- 브라우저 콘솔에서 ReactFlow 경고 확인.
- `src/data/ontology/graph-relations.json` 이 정상 로드되는지 확인.

---

## 라이선스 요약

- **코드**: MIT — 자유롭게 사용/수정/재배포 가능
- **데이터**: CC BY-SA 2.0 KR — 출처 표시 + 동일 조건 유지 의무
  - 출처: 국립국어원 (표준국어대사전·우리말샘·한국어기초사전·어문 규범)
  - 자세한 의무 사항은 [`DATA_LICENSE.md`](./DATA_LICENSE.md) 참고
