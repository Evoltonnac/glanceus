# Phase 11 UAT: Minimal Smoke Verification

## Scope

Phase 11 smoke only validates that release-blocking test gates are executable and deterministic.
Full end-to-end matrix is explicitly deferred to Phase 13.

## Smoke Checklist

1. Backend core gate
   - Command: `bash scripts/test_backend_core.sh`
   - Expected: backend core auth/state/encryption/API tests all pass.

2. Frontend core gate
   - Command: `bash scripts/test_frontend_core.sh`
   - Expected: core component/page/store/client tests all pass.

3. Frontend type gate
   - Command: `bash scripts/test_frontend_core.sh --with-typecheck`
   - Expected: `tsc --noEmit` passes with zero type errors.

4. Minimal smoke test
   - Command: `python -m pytest tests/smoke/test_phase11_smoke.py -q`
   - Expected: one deterministic smoke test passes.

5. Impacted local workflow
   - Command: `bash scripts/test_impacted.sh`
   - Expected: runs impacted backend/frontend checks or smoke-only fallback when no impact is detected.

## CI Blocking Expectations

- `.github/workflows/ci.yml` must block on:
  - backend core gate (`scripts/test_backend_core.sh`)
  - frontend core gate (`scripts/test_frontend_core.sh`)
  - frontend typecheck (`npm run typecheck`)
