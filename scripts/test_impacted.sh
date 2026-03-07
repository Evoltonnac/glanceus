#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

run_all() {
  bash scripts/test_backend_core.sh
  bash scripts/test_frontend_core.sh --with-typecheck
  python -m pytest tests/smoke/test_phase11_smoke.py -q
}

if [[ "${1:-}" == "--full" || "${RUN_FULL:-0}" == "1" ]]; then
  run_all
  exit 0
fi

changed_files=""
if [[ -n "${BASE_REF:-}" ]] && git rev-parse --verify "${BASE_REF}" >/dev/null 2>&1; then
  changed_files="$(git diff --name-only "${BASE_REF}"...HEAD)"
else
  changed_files="$(
    {
      git diff --name-only HEAD
      git diff --name-only --cached
    } | sort -u
  )"
fi

if [[ -z "${changed_files}" ]]; then
  echo "No impacted files detected. Running smoke check only."
  python -m pytest tests/smoke/test_phase11_smoke.py -q
  exit 0
fi

echo "Impacted files:"
echo "${changed_files}"

run_backend=0
run_frontend=0
run_frontend_typecheck=0

if echo "${changed_files}" | rg -q "^(core/|main.py|tests/|requirements.txt|pytest.ini|scripts/test_backend_core.sh|scripts/test_impacted.sh)"; then
  run_backend=1
fi

if echo "${changed_files}" | rg -q "^(ui-react/|scripts/test_frontend_core.sh|scripts/test_impacted.sh)"; then
  run_frontend=1
fi

if echo "${changed_files}" | rg -q "^(ui-react/|ui-react/tsconfig|ui-react/vitest.config.ts|scripts/test_frontend_core.sh|scripts/test_impacted.sh)"; then
  run_frontend_typecheck=1
fi

if echo "${changed_files}" | rg -q "^\.github/workflows/ci\.yml$"; then
  run_backend=1
  run_frontend=1
  run_frontend_typecheck=1
fi

if [[ "${run_backend}" == "1" ]]; then
  bash scripts/test_backend_core.sh
fi

if [[ "${run_frontend}" == "1" ]]; then
  if [[ "${run_frontend_typecheck}" == "1" ]]; then
    bash scripts/test_frontend_core.sh --with-typecheck
  else
    bash scripts/test_frontend_core.sh
  fi
fi

if [[ "${run_backend}" == "0" && "${run_frontend}" == "0" ]]; then
  echo "No backend/frontend core impact detected. Running smoke check only."
  python -m pytest tests/smoke/test_phase11_smoke.py -q
fi
