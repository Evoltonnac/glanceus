---
phase: "01"
name: "backend-driven-webview-scraper-reliability-for-minimized-hidden-and-occluded-window-states"
created: 2026-03-15
---

# Phase 1: backend-driven-webview-scraper-reliability-for-minimized-hidden-and-occluded-window-states - Context

## Decisions

- The scraper trigger path must not depend on Dashboard polling, route activation, or `document.hidden` checks.
- Reliability target covers three runtime states: main window minimized, hidden to tray, and user-perceived invisible/occluded by other windows.
- Backend remains the owner of workflow state (`suspended` -> `refreshing` -> `active/error`), and frontend remains an observer/controller for manual foreground fallback only.
- Keep existing `InteractionType.WEBVIEW_SCRAPE` contract and Secrets-based resume semantics for compatibility with existing integrations.
- Preserve single active scraper worker behavior for this phase; concurrency expansion is explicitly deferred.

## Discretion Areas

- Internal persistence model for scraper task queue (`data.json` section vs separate file) as long as behavior is durable and crash-safe.
- Polling interval / lease timeout values for Rust daemon and backend claim API, as long as stale task recovery is deterministic.
- Exact API payload shapes for internal scraper task lifecycle endpoints, as long as they are idempotent and localhost-only.

## Deferred Ideas

- Multi-worker parallel scraping.
- Remote telemetry / external monitoring integration.
- Non-Tauri runtime scraping support.
