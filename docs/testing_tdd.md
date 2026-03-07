# Testing & TDD Policy (Phase 11)

This document defines the release-blocking testing baseline introduced in Phase 11.

## Scope

- Backend core modules are **mandatory TDD** scope:
  - `core/executor.py`
  - `core/source_state.py`
  - `core/encryption.py`
  - high-risk auth paths in `core/api.py`
- Frontend core behavior is mandatory test scope with `Vitest + React Testing Library`.
- Full E2E matrix is deferred to Phase 12; Phase 11 keeps a minimal smoke path.

## Backend TDD Rules

- Required workflow: **RED -> GREEN -> REFACTOR**.
- Every backend core behavior change must start with a failing pytest test (RED).
- Hotfix exception:
  - You may patch production code first for urgent restore.
  - The same delivery must add a regression pytest test before completion.
- No "proof artifact" requirement for commit order, but the final state must contain:
  - reproducible tests for changed behavior
  - passing quality gates

## Quality Gates

### Local baseline

- Backend baseline: `python -m pytest tests -q`
- Backend targeted checks: `python -m pytest tests -q -k "interaction or auth or encryption"`
- Frontend baseline: `cd ui-react && npm run test -- --run`
- Frontend type safety: `cd ui-react && npm run typecheck`

### CI blocking checks

- Backend core suite must pass.
- Frontend core suite must pass.
- Frontend typecheck must pass.
- Any gate failure blocks merge/release.

## Test Organization Rules

- Use shared fixtures and source factories from `tests/conftest.py` and `tests/factories/`.
- Keep tests deterministic (no network, no timing race dependencies).
- Prefer behavior assertions over snapshots for release-blocking paths.

## Command Matrix

| Layer | Command | Purpose |
| --- | --- | --- |
| Backend | `python -m pytest tests -q` | Core backend baseline |
| Backend | `python -m pytest tests/api/test_auth_status.py -q` | Auth status route gate |
| Frontend | `cd ui-react && npm run test -- --run` | Frontend behavior baseline |
| Frontend | `cd ui-react && npm run test:core -- --run` | Core component/page contracts |
| Frontend | `cd ui-react && npm run typecheck` | Type-level gate |
