#!/usr/bin/env bash
#
# Tier B 표제어 SQLite (810MB) 다운로드 스크립트
#
# Hugging Face Datasets에서 lexicon.sqlite를 내려받아 src/data/lexicon/ 에 배치합니다.
# 이후 `npm run migrate:turso` 로 Turso에 업로드하면 웹앱에서 사용할 수 있습니다.
#
# 사전 요구사항:
#   - huggingface-cli (또는 hf) : brew install huggingface-cli
#   - 인증 불필요 (public dataset)
#
# 사용법:
#   bash scripts/download-tierB.sh

set -euo pipefail

REPO_ID="${TIER_B_REPO:-J-Seo/kocca-ontology-tierB}"
TARGET_DIR="src/data/lexicon"

# CLI 명령 자동 감지 (신버전: hf, 구버전: huggingface-cli)
if command -v hf >/dev/null 2>&1; then
  HF_CMD="hf"
elif command -v huggingface-cli >/dev/null 2>&1; then
  HF_CMD="huggingface-cli"
else
  echo "[ERROR] huggingface-cli (또는 hf) 가 설치되어 있지 않습니다."
  echo "        설치: brew install huggingface-cli"
  echo "        또는: pip install -U huggingface_hub"
  exit 1
fi

mkdir -p "$TARGET_DIR"

echo "[*] Tier B 데이터 다운로드 시작"
echo "    Source : https://huggingface.co/datasets/${REPO_ID}"
echo "    Target : ${TARGET_DIR}/"
echo

if [ "$HF_CMD" = "hf" ]; then
  hf download "$REPO_ID" \
    --repo-type dataset \
    --local-dir "$TARGET_DIR"
else
  huggingface-cli download "$REPO_ID" \
    --repo-type dataset \
    --local-dir "$TARGET_DIR"
fi

echo
echo "[OK] 다운로드 완료. 파일 목록:"
ls -lh "$TARGET_DIR"

echo
echo "다음 단계:"
echo "  1) .env.local 에 TURSO_DATABASE_URL / TURSO_AUTH_TOKEN 설정"
echo "  2) npm run migrate:turso"
