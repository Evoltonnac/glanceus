# Debug Session: Phase 04 Gap 4 (Alias)

## Note
This gap shares the same root cause as Gap 3.

## Canonical Session
- `.planning/debug/phase04-retry-budget-resets-and-backoff-coupled-to-updated-at.md`

## Why Shared
`runtime.network_timeout` and `runtime.retry_required` use the same retry allowlist and scheduler branch, so budget reset/backoff coupling defects impact both paths equally.
