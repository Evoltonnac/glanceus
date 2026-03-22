# Debug Session: Phase 04 Gaps 3 and 4

## Symptom
- Expected: `runtime.retry_required` and `runtime.network_timeout` should use bounded retries and stop at cap.
- Actual: Task retries at stable interval (~80s) and can exceed 3 retries.

## Root Cause
Retry budget and backoff anchor are tied to mutable runtime state:
- Scheduler resets retry budget when source status is observed as `active`.
- Backoff gate uses `updated_at`, which is rewritten on every state transition.
This allows cap resets and repeated first-window retries under normal fetch transitions.

## Evidence
- `core/refresh_scheduler.py:157-158` clears `_retry_states` whenever status is `active`.
- `core/refresh_scheduler.py:176-185` computes backoff from record `updated_at` and increments in-memory attempts only.
- `core/data_controller.py:147-159` rewrites `updated_at` on every `set_state`, including transient transitions.
- `core/refresh_scheduler.py:14-15` shows both `runtime.network_timeout` and `runtime.retry_required` share the same allowlist path.

## Suggested Fix Direction
1. Persist retry metadata per source+error signature (`retry_attempts`, `first_failed_at`, `next_retry_at`).
2. Do not clear retry budget on transient `active`; reset only after successful completion (`last_success_at`) or signature change.
3. Use stable failure timestamp / `next_retry_at` instead of generic `updated_at` as backoff anchor.
