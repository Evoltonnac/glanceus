# Debug Session: Phase 04 Gap 6

## Symptom
- Expected: Background/default queue execution should not steal focus.
- Actual: A 1x1 scraper window appears/focuses and disrupts user workflow.

## Root Cause
Background scraper mode intentionally creates a visible 1x1 window at `(0,0)` rather than hidden/offscreen. The current implementation assumes hidden/offscreen webview is unreliable for injected script execution and therefore keeps the webview visible in hierarchy, which still allows OS-level activation/focus side effects.

## Evidence
- `ui-react/src-tauri/src/scraper.rs:1067-1076` explicit comment and implementation: visible 1x1 top-left workaround.
- `ui-react/src-tauri/src/scraper.rs:1350-1354` daemon claimed-task path also creates visible 1x1 worker window.
- `ui-react/src/hooks/useScraper.ts:266-335` background queue path uses backend refresh without explicit foreground intent, but backend daemon still uses visible worker window.

## Offscreen Rendering Feasibility (Current Architecture)
- Under current Tauri webview-injection architecture, true offscreen rendering is not guaranteed by this code path and is explicitly treated as unreliable.
- Hidden-window execution may work for some sites but is nondeterministic (already observed by user), so current workaround trades determinism for UX regression.

## Suggested Fix Direction
1. Add non-activating background window behavior per platform (avoid key-window focus while preserving view hierarchy).
2. Introduce dual strategy: hidden-first background mode with watchdog fallback to explicit manual prompt (not forced focus).
3. Evaluate sidecar/browser-engine path for true headless scraping where feasible, keeping current path as fallback.
