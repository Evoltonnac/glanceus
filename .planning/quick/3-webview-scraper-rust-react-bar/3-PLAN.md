---
quick_task: 3
phase: quick-3
plan: 3
type: execute
wave: 1
depends_on: []
files_modified:
  - ui-react/src-tauri/src/scraper.rs
  - ui-react/src/hooks/useScraper.ts
  - ui-react/src/components/ScraperStatusBanner.tsx
  - ui-react/src/types/config.ts
autonomous: true
must_haves:
  truths:
    - "Scraper lifecycle events (window open, page load, script execution, API intercept, auth block) are logged from Rust"
    - "Logs are transmitted from Rust to React frontend via Tauri events"
    - "Logs are displayed in ScraperStatusBanner via expandable log viewer button"
  artifacts:
    - path: "ui-react/src-tauri/src/scraper.rs"
      provides: "Structured log emission at key scraper lifecycle points"
      exports: ["scraper_lifecycle_log event"]
    - path: "ui-react/src/hooks/useScraper.ts"
      provides: "Log event listener and state management"
      exports: ["scraperLogs state"]
    - path: "ui-react/src/components/ScraperStatusBanner.tsx"
      provides: "Log viewer UI in floating bar"
      min_lines: 150
  key_links:
    - from: "ui-react/src-tauri/src/scraper.rs"
      to: "ui-react/src/hooks/useScraper.ts"
      via: "app.emit('scraper_lifecycle_log')"
      pattern: "emit.*scraper_lifecycle_log"
    - from: "ui-react/src/hooks/useScraper.ts"
      to: "ui-react/src/components/ScraperStatusBanner.tsx"
      via: "scraperLogs prop"
      pattern: "scraperLogs.*ScraperStatusBanner"
---

<objective>
Add comprehensive logging to webview scraper to diagnose stability issues (page opens but scraping doesn't execute). Emit structured lifecycle logs from Rust at critical points (window creation, page load, script injection, API interception, auth blocks), transmit to React frontend via Tauri events, and display in ScraperStatusBanner via expandable log viewer button.

Purpose: Enable real-time visibility into scraper execution flow to diagnose silent failures and background hang issues.
Output: Instrumented scraper with frontend log viewer in floating bar.
</objective>

<execution_context>
@/Users/xingminghua/.claude/get-shit-done/workflows/execute-plan.md
@/Users/xingminghua/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@ui-react/src-tauri/src/scraper.rs
@ui-react/src/hooks/useScraper.ts
@ui-react/src/components/ScraperStatusBanner.tsx

Recent work context:
- Phase 12-03 implemented SUSPENDED/ERROR state split and foreground webscraper recovery
- Quick task 2 refactored integration YAML to single-file-single-instance model
- Current issue: webview scraper opens page but sometimes fails to execute scraping, even when brought to foreground manually
</context>

<interfaces>
<!-- Key types from existing codebase -->

From ui-react/src/types/config.ts:
```typescript
export interface SourceSummary {
  id: string;
  name: string;
  status: "ok" | "error" | "suspended" | "running";
  interaction?: {
    type: string;
    step_id: string;
    message: string;
    data?: Record<string, any>;
  };
}
```

From ui-react/src/hooks/useScraper.ts:
```typescript
// Existing event listeners
listen<{ sourceId: string; secretKey: string; data: any }>("scraper_result", ...)
listen<{ sourceId: string; targetUrl: string }>("scraper_auth_required", ...)
```

From ui-react/src-tauri/src/scraper.rs:
```rust
// Existing emit patterns
app.emit("scraper_result", serde_json::json!({ ... }))
app.emit("scraper_auth_required", serde_json::json!({ ... }))
```
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Add structured lifecycle logging in Rust scraper</name>
  <files>ui-react/src-tauri/src/scraper.rs</files>
  <action>
Add structured logging at key scraper lifecycle points in `push_scraper_task`, `handle_scraped_data`, and `handle_scraper_auth`:

1. Define log event structure (use existing `app.emit` pattern):
   - Event name: `scraper_lifecycle_log`
   - Payload: `{ sourceId: string, timestamp: ISO8601, level: "info"|"warn"|"error", stage: string, message: string, details?: object }`

2. Add log emissions at these critical points in `push_scraper_task`:
   - After clearing dedup state: stage="task_start", message="Scraper task initiated"
   - After closing existing window: stage="window_cleanup", message="Closed existing scraper window"
   - After builder configuration: stage="window_created", message="Webview window created", details={ foreground, url }
   - Before returning Ok: stage="window_ready", message="Scraper window ready"

3. Add log emissions in `handle_scraped_data`:
   - At function entry: stage="data_received", message="Scraped data received"
   - On dedup hit: stage="data_dedup", message="Duplicate data ignored"
   - Before emit: stage="data_emit", message="Emitting scraper result"
   - After window close: stage="task_complete", message="Scraper task completed"

4. Add log emissions in `handle_scraper_auth`:
   - At function entry: stage="auth_required", message="Authentication required", details={ targetUrl }
   - After emit: stage="auth_emit", message="Auth event emitted"

5. Add log emission in JavaScript injection script (via `window.__TAURI_INTERNALS__.invoke('scraper_log', ...)`):
   - After script initialization: "Scraper script initialized"
   - When API intercept triggers: "API intercepted: {url}"
   - On auth detection: "Auth required detected: {status}"

Use `chrono` crate for ISO8601 timestamps. Keep existing `println!` debug logs for backward compatibility.
  </action>
  <verify>
    <automated>cargo check --manifest-path ui-react/src-tauri/Cargo.toml</automated>
  </verify>
  <done>Rust scraper emits `scraper_lifecycle_log` events at 10+ lifecycle points with structured payload</done>
</task>

<task type="auto">
  <name>Task 2: Add log listener and state in useScraper hook</name>
  <files>ui-react/src/hooks/useScraper.ts, ui-react/src/types/config.ts</files>
  <action>
1. Add TypeScript type in `ui-react/src/types/config.ts`:
```typescript
export interface ScraperLog {
  sourceId: string;
  timestamp: string;
  level: "info" | "warn" | "error";
  stage: string;
  message: string;
  details?: Record<string, any>;
}
```

2. In `useScraper.ts`, add state management:
   - Add `const [scraperLogs, setScraperLogs] = useState<ScraperLog[]>([]);`
   - Add log retention limit (keep last 100 logs to prevent memory bloat)
   - Add log clearing when scraper task completes or is cancelled

3. Add event listener in the existing `useEffect` with `setupListeners()`:
```typescript
const unlistenScraperLog = await listen<ScraperLog>("scraper_lifecycle_log", (event) => {
  setScraperLogs((prev) => {
    const updated = [...prev, event.payload];
    return updated.slice(-100); // Keep last 100 logs
  });
});
```

4. Clear logs when:
   - `handleClearScraperQueue` is called
   - `scraper_result` event received (task complete)
   - `cancel_scraper_task` invoked

5. Return `scraperLogs` from hook alongside existing returns.
  </action>
  <verify>
    <automated>npm run typecheck --prefix ui-react</automated>
  </verify>
  <done>useScraper hook exposes scraperLogs state, listens to scraper_lifecycle_log events, and manages log retention</done>
</task>

<task type="auto">
  <name>Task 3: Add log viewer button and panel to ScraperStatusBanner</name>
  <files>ui-react/src/components/ScraperStatusBanner.tsx</files>
  <action>
1. Add `scraperLogs: ScraperLog[]` prop to `ScraperStatusBannerProps` interface.

2. Add second expansion state for log viewer:
   - `const [showLogs, setShowLogs] = useState(false);`
   - Log viewer should be a separate overlay/modal, not inline in banner (to avoid cluttering the compact bar)

3. Add log viewer button in expanded banner (after existing buttons, before collapse button):
   - Icon: `FileText` from lucide-react
   - Label: "日志" with badge showing log count if > 0
   - On click: toggle `showLogs` state
   - Style: consistent with existing button styles

4. Add log viewer panel (conditionally rendered when `showLogs === true`):
   - Position: fixed bottom-right, above banner (z-index: 60)
   - Size: 400px width, 300px height, scrollable
   - Background: bg-surface with border and shadow
   - Header: "抓取日志" with close button
   - Content: Reverse chronological list (newest first) of logs
   - Each log entry shows: timestamp (HH:mm:ss), level badge (color-coded), stage, message
   - Details object (if present) shown as collapsed JSON
   - Empty state: "暂无日志" when scraperLogs.length === 0

5. Log level color coding:
   - info: text-muted-foreground
   - warn: text-warning (or yellow-600)
   - error: text-error

6. Add auto-scroll to bottom when new logs arrive (use `useEffect` with `scraperLogs` dependency and `scrollIntoView`).
  </action>
  <verify>
    <automated>npm run typecheck --prefix ui-react && npm run build --prefix ui-react</automated>
  </verify>
  <done>ScraperStatusBanner has log viewer button with badge, opens floating log panel showing real-time scraper lifecycle logs with color-coded levels</done>
</task>

</tasks>

<verification>
1. Start app in dev mode, trigger webview scraper task
2. Observe ScraperStatusBanner shows log count badge
3. Click log viewer button, verify log panel opens
4. Verify logs appear in real-time showing: task_start, window_created, window_ready, data_received, task_complete
5. Verify logs are color-coded by level
6. Verify logs clear when queue is cleared or task completes
7. Test with both background and foreground scraper modes
8. Test with auth-required scenario to verify auth_required stage logs
</verification>

<success_criteria>
- Rust scraper emits structured lifecycle logs at 10+ critical points
- Frontend receives and displays logs in real-time via Tauri events
- ScraperStatusBanner has functional log viewer with badge indicator
- Log viewer shows chronological logs with level color-coding
- Logs help diagnose silent scraper failures (can see which stage failed)
- No TypeScript errors, cargo check passes, app builds successfully
</success_criteria>

<output>
After completion, create `.planning/quick/3-webview-scraper-rust-react-bar/3-SUMMARY.md`
</output>
