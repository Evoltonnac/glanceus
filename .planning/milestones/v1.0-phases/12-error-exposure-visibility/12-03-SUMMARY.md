---
phase: 12-error-exposure-visibility
plan: 03
status: completed
completed: 2026-03-07
---

# Phase 12 Plan 03: Interactive Step States & WebScraper Foregrounding Summary

## One-line Outcome
Implemented SUSPENDED vs ERROR interaction-state differentiation in executor/runtime, plus explicit foreground/manual webscraper recovery flow in Dashboard + Tauri.

## Tasks Completed

1. Updated backend interaction-state classification (`core/executor.py`):
   - Added normalized exception classification for interactive failures.
   - Added `InvalidCredentialsError` (maps to `ERROR` + re-entry interaction).
   - Added `WebScraperBlockedError` (maps to `SUSPENDED` + `webview_scrape` interaction).
   - Added HTTP status classification (`401/403`) and webview-block detection to avoid generic retry-loop behavior.
   - Added auth re-entry interaction builders (OAuth/API key/cURL/webview paths).
2. Added backend tests (`tests/core/test_scraper_states.py`):
   - WebScraper blocked (`403`/captcha keyword) -> `SUSPENDED`.
   - Invalid credentials -> `ERROR` with interactive re-entry payload.
   - Missing config -> `SUSPENDED`.
3. Updated frontend interaction handling:
   - `FlowHandler` now differentiates suspended vs error messaging and provides explicit foreground manual trigger for `webview_scrape`.
   - Dashboard/sidebar and source cards now allow interaction re-entry for both `SUSPENDED` and `ERROR` states.
4. Updated scraper queue/runtime (`ui-react/src/hooks/useScraper.ts`, `ui-react/src-tauri/src/scraper.rs`):
   - Added queue metadata for manual-only webview tasks.
   - Added `foreground` flag when pushing scraper tasks.
   - On `scraper_auth_required`, task exits active queue state and is converted to manual foreground resume flow.
   - Tauri `push_scraper_task` now supports foreground window mode (visible, centered, interactive).
5. Updated type definitions (`ui-react/src/types/config.ts`) for richer interaction payloads used by new state paths.

## Verification

- `pytest tests/core/test_scraper_states.py -q`
- `pytest tests/core/test_executor_auth_interactions.py tests/core/test_executor_errors.py -q`
- `npm run build --prefix ui-react`
- `cargo check` (in `ui-react/src-tauri`)

All checks passed.

## Deviations from Plan

- Added interaction controls in `BaseSourceCard` as well as sidebar/flow dialog to ensure ERROR-state re-entry is available from both core dashboard entry points.

## Next Plan Readiness

Phase 12 plan set is complete (`12-01` ~ `12-03`). Next execution target is Phase 13 (release hardening).
