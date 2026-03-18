# Quick Task 260318-u6b Summary

**Description:** 优化两个交互问题：Dashboard 轮询启动即请求；集成 `default_refresh_interval_minutes` 支持 120 分钟等自定义非负整数

**Date:** 2026-03-18
**Commit:** f1090fe

---

## Changes Made

### 1. Dashboard polling now requests immediately on start
- Updated `ui-react/src/pages/Dashboard.tsx` polling effect to call one immediate request when polling starts.
- Kept 3-second interval polling behavior.
- Added `pollingDataMapRef` to hold latest `dataMap` so polling uses fresh cache without tying effect lifecycle to `dataMap` dependency changes.
- This avoids the delayed first request and avoids repeated immediate-trigger loops.

### 2. Integration default refresh interval supports custom minutes
- Updated `core/refresh_policy.py`:
  - Added `normalize_integration_refresh_interval_minutes(...)` (accept any non-negative integer).
  - Kept existing `normalize_refresh_interval_minutes(...)` for source/global fixed-option contract.
  - Updated `resolve_refresh_interval_minutes(...)` to use the integration-specific normalizer.
- Updated `core/api.py` source summary output to report integration defaults via the integration-specific normalizer.

### 3. Regression tests
- Added API regression test in `tests/api/test_source_auto_refresh_api.py`:
  - `default_refresh_interval_minutes=120` is returned and used as effective interval.
- Added scheduler regression test in `tests/core/test_refresh_scheduler.py`:
  - source with integration default 120 is enqueued only when overdue by 120 minutes.

---

## Verification

- `make test-impacted` -> passed
  - Backend impacted pytest: `31 passed`
  - Frontend core tests: `31 passed`
  - Typecheck: passed (`tsc --noEmit`)

---

## Files Modified

| File | Changes |
|------|---------|
| `ui-react/src/pages/Dashboard.tsx` | Immediate polling request on start + stable cache ref usage |
| `core/refresh_policy.py` | Added integration-specific interval normalization and wired priority resolver |
| `core/api.py` | Integration interval normalization for source summary response |
| `tests/api/test_source_auto_refresh_api.py` | Added custom integration interval API regression test |
| `tests/core/test_refresh_scheduler.py` | Added custom integration interval scheduler regression test |
