#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ "${1:-}" == "--full" || "${RUN_FULL:-0}" == "1" ]]; then
  python -m pytest tests -q
  exit 0
fi

python -m pytest \
  tests/core/test_executor_auth_interactions.py \
  tests/core/test_source_state.py \
  tests/core/test_encryption.py \
  tests/api/test_auth_status.py \
  -q
