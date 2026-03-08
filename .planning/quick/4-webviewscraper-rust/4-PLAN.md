---
quick_task: 4
phase: quick-4
plan: 4
type: execute
wave: 1
depends_on: []
files_modified:
  - ui-react/src-tauri/src/scraper.rs
  - ui-react/src-tauri/src/lib.rs
  - ui-react/src/hooks/useScraper.ts
autonomous: true
---

<objective>
Fix webview scraper log runaway in Rust with safeguards: deduplicate/drop repetitive logs, kill task on short-term log burst, and keep error logs in memory for post-skip troubleshooting.
</objective>

<tasks>

<task>
  <name>Task 1: Add Rust-side log guardrails in scraper runtime</name>
  <files>ui-react/src-tauri/src/scraper.rs</files>
  <action>
Implement bounded log-control state in ScraperState:
- Deduplicate repeated lifecycle logs (drop excessive consecutive duplicates)
- Apply short-window burst detection; if over threshold, kill active task as fail-safe
- Limit/truncate oversized log messages to avoid memory pressure
  </action>
  <verify>
    <automated>cargo check --manifest-path ui-react/src-tauri/Cargo.toml</automated>
  </verify>
  <done>Rust log stream cannot grow unbounded from repetitive spam; burst storms terminate task safely</done>
</task>

<task>
  <name>Task 2: Persist error logs in Rust memory and expose query command</name>
  <files>ui-react/src-tauri/src/scraper.rs, ui-react/src-tauri/src/lib.rs</files>
  <action>
Add in-memory ring buffer for error lifecycle logs keyed by source, plus Tauri command to fetch recent error logs. Register command in invoke_handler.
  </action>
  <verify>
    <automated>cargo check --manifest-path ui-react/src-tauri/Cargo.toml</automated>
  </verify>
  <done>Error logs remain queryable after task cancellation/skip</done>
</task>

<task>
  <name>Task 3: Sync in-memory error logs to frontend on skip paths</name>
  <files>ui-react/src/hooks/useScraper.ts</files>
  <action>
On skip/timeout/cancel lifecycle, fetch in-memory Rust error logs and merge into UI log list with dedupe + cap, so diagnostics remain visible when task has been skipped.
  </action>
  <verify>
    <automated>npm run typecheck --prefix ui-react</automated>
  </verify>
  <done>Skipped tasks still surface error logs for troubleshooting</done>
</task>

</tasks>

<success_criteria>
- Repetitive logs are deduped/dropped in Rust
- Log burst over short window triggers task termination guard
- Error logs are persisted in Rust memory and retrievable by source
- Frontend pulls/retains those error logs when task is skipped
- cargo check + typecheck pass
</success_criteria>
