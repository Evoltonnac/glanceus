# Debug Session: Phase 04 Gap 2

## Symptom
- Expected: Non-auth/uncertain failures may still be latent auth walls; should surface manual webview guidance instead of hard error.
- Actual: Non-manual keywords are always persisted as `status=error` + `runtime.retry_required` with no manual interaction payload.

## Root Cause
Failure classification is a binary keyword gate that defaults to `retry_required` for any unmatched reason. There is no ambiguous/unknown branch that preserves manual recovery hints for likely auth-hidden failures.

## Evidence
- `core/api.py:214-218` `_classify_scraper_fail_reason` => manual keywords else `retry_required`.
- `core/api.py:951-971` retry classification writes `SourceStatus.ERROR` and omits interaction payload.
- `core/executor.py:575-589` similar keyword split (`manual_required` vs `retry_required`) for webview runtime exceptions.

## Suggested Fix Direction
1. Introduce explicit `unknown_webview_failure` branch with conservative manual prompt behavior.
2. Carry structured scraper failure reason codes from runtime (avoid pure free-text keyword inference).
3. Keep deterministic `error_code`, but allow `suspended + manual interaction` for ambiguous timeout/403-like paths.
