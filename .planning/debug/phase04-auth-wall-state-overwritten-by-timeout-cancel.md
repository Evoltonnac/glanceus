# Debug Session: Phase 04 Gap 1

## Symptom
- Expected: Auth-wall (401/403/login/captcha) should remain `suspended` with `auth.manual_webview_required` until explicit user action.
- Actual: Source first becomes manual-required, then flips to error `Scraper task cancelled by user`.

## Root Cause
Frontend timeout watchdog cancels an already-claimed scraper task after a fixed timeout because auth-required handoff does not emit a terminal stage or clear active-task token. The cancellation path reports `Scraper task cancelled by user` back to backend fail API, which is classified as `retry_required` and can overwrite manual-required state.

## Evidence
- `ui-react/src/hooks/useScraper.ts:382-387` sets timeout token at `task_claimed`.
- `ui-react/src/hooks/useScraper.ts:553-559` timer calls `cancel_scraper_task` when no terminal stage arrives.
- `ui-react/src-tauri/src/scraper.rs:1628-1638` auth-required path emits warning/log only; no active-task clear.
- `ui-react/src-tauri/src/scraper.rs:1767-1792` cancel path sends fail callback with literal `Scraper task cancelled by user`.
- `core/api.py:214-218, 951-971` fail-reason classifier falls through to `retry_required` and writes `status=error`.

## Suggested Fix Direction
1. On auth-required handoff, explicitly terminate backend-managed active task lifecycle (or mark manual-transfer terminal).
2. Suppress timeout auto-cancel once auth-required is observed for current task.
3. Treat user-cancel/fallback-cancel as non-retry error for auth handoff tasks (or no-op if task already converted to manual state).
