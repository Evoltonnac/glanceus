#!/bin/bash
# Starts the complete E2E runtime: isolated app environment plus mock services.
# Usage: ./dev_server_for_e2e_with_mocks.sh [--clean]
#   --clean   Remove and recreate the test data directory before starting

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
E2E_TEMP_DIR="$PROJECT_ROOT/ui-react/tests-e2e-temp"

CLEAN_ARGS=()
for arg in "$@"; do
    case $arg in
        --clean)
            CLEAN_ARGS+=("--clean")
            ;;
    esac
done

if [ ${#CLEAN_ARGS[@]} -gt 0 ]; then
    echo "[e2e] Cleaning test directory before starting runtime with mocks: $E2E_TEMP_DIR"
    rm -rf "$E2E_TEMP_DIR"
fi

export GLANCEUS_DATA_DIR="${GLANCEUS_DATA_DIR:-$E2E_TEMP_DIR}"

MOCK_PID=""
cleanup() {
    if [ -n "$MOCK_PID" ] && kill -0 "$MOCK_PID" 2>/dev/null; then
        kill "$MOCK_PID" 2>/dev/null || true
        wait "$MOCK_PID" 2>/dev/null || true
    fi
}
trap cleanup EXIT INT TERM

echo "[e2e] Starting E2E mock services"
node "$PROJECT_ROOT/scripts/e2e_mock_oauth_openapi.mjs" &
MOCK_PID=$!

echo "[e2e] Starting E2E app runtime"
bash "$PROJECT_ROOT/scripts/dev_server_for_e2e.sh"
