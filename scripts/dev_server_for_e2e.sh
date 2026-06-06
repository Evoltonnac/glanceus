#!/bin/bash
# Starts a clean E2E test environment with isolated data directory.
# Usage: ./dev_server_for_e2e.sh [--clean]
#   --clean   Remove and recreate the test data directory before starting

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
E2E_TEMP_DIR="$PROJECT_ROOT/ui-react/tests-e2e-temp"
E2E_DATA_DIR="$E2E_TEMP_DIR/data"
E2E_CONFIG_DIR="$E2E_TEMP_DIR/config"

# Parse arguments
CLEAN=0
for arg in "$@"; do
    case $arg in
        --clean)
            CLEAN=1
            shift
            ;;
    esac
done

# Clean test directory if requested
if [ "$CLEAN" -eq 1 ]; then
    echo "[e2e] Cleaning test directory: $E2E_TEMP_DIR"
    rm -rf "$E2E_TEMP_DIR"
fi

# Ensure test directory exists
mkdir -p "$E2E_DATA_DIR"
mkdir -p "$E2E_CONFIG_DIR"

# Export env vars for this session
# Respect GLANCEUS_DATA_DIR if already set (e.g., from playwright webServer.env)
if [ -z "${GLANCEUS_DATA_DIR:-}" ]; then
    export GLANCEUS_DATA_DIR="$E2E_TEMP_DIR"
fi

echo "[e2e] Starting E2E test environment"
echo "[e2e]   Data dir: $E2E_DATA_DIR"
echo "[e2e]   Config dir: $E2E_CONFIG_DIR"
echo "[e2e]   Port: 3000"

# Start both backend and frontend
cd "$PROJECT_ROOT/ui-react"
pnpm run dev:all
