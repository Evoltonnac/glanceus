---
phase: 11-tdd-test-coverage-tdd
plan: 06
status: completed
completed: 2026-03-06
---

# Phase 11 Plan 06: Local Gates, CI Blocking, and Smoke/UAT Summary

## One-line Outcome
Established executable local quality gates, wired CI blocking checks, and added a minimal smoke/UAT path for Phase 11 release readiness.

## Tasks Completed

1. Added local gate scripts in `scripts/test_backend_core.sh` and `scripts/test_frontend_core.sh` with fast defaults and `--full` override support.
2. Added changed-file-driven impacted workflow in `scripts/test_impacted.sh` with backend/frontend gate routing and smoke-only fallback.
3. Added CI blocking workflow in `.github/workflows/ci.yml` for backend core gate, frontend core gate, and frontend typecheck.
4. Added minimal smoke test `tests/smoke/test_phase11_smoke.py` and documented smoke checklist/expectations in `.planning/phases/11-tdd-test-coverage-tdd/11-UAT.md`.
5. Added Phase 11 test command matrix to `README.md` for daily local usage.

## Verification

- `bash scripts/test_backend_core.sh`
- `bash scripts/test_frontend_core.sh`
- `bash scripts/test_frontend_core.sh --with-typecheck`
- `python -m pytest tests/smoke/test_phase11_smoke.py -q`
- `bash scripts/test_impacted.sh`
- `rg -n "test_backend_core|test_frontend_core|typecheck" .github/workflows/ci.yml`

All checks passed.

## Decisions Made

- Kept local gate commands as the single source of truth, then invoked those same entry points in CI to minimize environment drift.
- Implemented impacted-test detection using `BASE_REF` when provided and working-tree/staged diff fallback otherwise.
- Scoped smoke to deterministic core contracts and explicitly deferred full E2E matrix coverage to Phase 13.

## Deviations from Plan

None.

## Next Plan Readiness

Phase 11 execution plans are complete; phase-level verification and Phase 13 release-hardening work can proceed.
