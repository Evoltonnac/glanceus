# WebView Scraper Runtime Constraints and Fallback Strategy

## 1. Tauri vs Web Runtime

WebView Scraper depends on native Tauri windows and IPC:
- Tauri runtime: supports task queue, logs, and timeout control.
- Pure Web runtime: scraping execution is unavailable and must degrade gracefully.

## 2. Runtime Constraints

- In non-Tauri runtime, scraper actions must no-op and must not call Tauri APIs.
- Tauri runtime daemon must keep claiming tasks even when Dashboard route is inactive.
- Each claimed task must keep lease heartbeat updates to avoid stale ownership.
- Completion/failure callbacks must go directly to backend internal APIs.
- Scraper logs should still be visible in UI for troubleshooting.

## 3. Interaction Fallback

When Flow enters `webview_scrape` in browser runtime:
1. Show a clear message: web runtime cannot execute scraping.
2. Provide a desktop download entry.
3. Hide/replace manual-start actions that cannot work in browser.

When scraper is blocked (captcha/login wall) in Tauri runtime:
1. Backend marks task as failed and keeps source in `suspended`.
2. UI presents manual foreground resume action.
3. User can reopen worker window to finish auth/captcha and retry.

## 4. State Observability

Recommended signals:
- current task status (`idle` / `running` / `timeout` / `failed`)
- queue length
- latest error summary
- backend task lease/attempt metadata for daemon diagnostics

Flow-side failure examples: [../flow/04_step_failure_test_inputs.md](../flow/04_step_failure_test_inputs.md)
