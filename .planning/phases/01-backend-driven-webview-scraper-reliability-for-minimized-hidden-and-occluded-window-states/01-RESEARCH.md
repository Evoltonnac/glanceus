# Phase 1: Backend-Driven WebView Scraper Reliability - Research

**Researched:** 2026-03-15
**Scope:** Scraper trigger ownership, runtime lifecycle, and hidden/minimized/occluded reliability
**Confidence:** High

## Current State Summary

The current desktop scraper path is functionally available but operationally coupled to frontend lifecycle:

- `core/steps/browser_step.py` raises `RequiredSecretMissing(WEBVIEW_SCRAPE)` when `webview_data` is absent.
- React `useScraper` detects suspended interactions and invokes `push_scraper_task`.
- Dashboard status polling explicitly skips when `document.hidden` is true.
- `useScraper` is currently mounted from Dashboard route, not as an app-global service.

Result: backend `RefreshScheduler` keeps running, but scraper start and result submission can stall when UI route/visibility state is unfavorable.

## Root Causes

1. Trigger ownership is in frontend view layer.
2. Result handoff (`scraper_result` -> `api.interact`) is primarily frontend-driven.
3. Runtime guarantees for minimized/hidden/occluded states are not encoded as backend/Rust invariants.

## Recommended Architecture

### 1) Backend-Owned Durable Task Queue

Introduce internal scraper task persistence with explicit lifecycle:

- `pending`
- `claimed` (lease owner + lease expiry)
- `running`
- `completed`
- `failed`
- `expired` (optional terminal marker)

Key rule: one in-flight task per `source_id` to align with existing single worker behavior.

### 2) Rust Daemon Claim Loop (UI-Independent)

Run a background claim loop from Tauri `setup`:

- Poll `/api/internal/scraper/tasks/claim`
- Start scraper with existing internal start path when claim succeeds
- Send periodic heartbeat to extend lease while active

This path must not require React route activation or DOM visibility.

### 3) Rust Direct Completion Callback

On `handle_scraped_data`:

- Continue emitting `scraper_result` event for UI observability.
- Additionally call backend `complete` endpoint directly so source resume is backend-controlled.

This ensures flow can complete even if frontend renderer is suspended or inactive.

## API Contract Recommendations

- `POST /api/internal/scraper/tasks/claim`
- `POST /api/internal/scraper/tasks/{task_id}/heartbeat`
- `POST /api/internal/scraper/tasks/{task_id}/complete`
- `POST /api/internal/scraper/tasks/{task_id}/fail`

All endpoints should be idempotent and localhost-only.

## Failure Model

- If daemon crashes after claim: lease expiry returns task to `pending`.
- If backend restarts: durable queue survives; daemon resumes claim loop.
- If completion races/duplicates: backend accepts first valid completion and ignores stale attempts.

## Validation Strategy

Primary acceptance is behavior-based:

1. Tray-hidden main window: scheduled source with webview step completes and resumes.
2. Minimized window: same behavior.
3. Occluded/invisible to user (covered by other windows): same behavior.
4. Route not on Dashboard: same behavior.
5. Manual foreground fallback still works for auth wall/captcha.

## Implementation Slices

1. Backend queue + internal API + executor integration.
2. Rust daemon claim/heartbeat + completion/failure callbacks.
3. Frontend role reduction to observability/manual controls.
4. Integration tests and reliability runbook.
