---
quick_task: 4
phase: quick-4
plan: 4
subsystem: webview-scraper
tags: [rust, tauri, logging, safeguard]
completed_date: "2026-03-07T16:20:00Z"
key_files:
  created: []
  modified:
    - ui-react/src-tauri/src/scraper.rs
    - ui-react/src-tauri/src/lib.rs
    - ui-react/src/hooks/useScraper.ts
verification:
  - cargo check --manifest-path ui-react/src-tauri/Cargo.toml
  - cargo test --manifest-path ui-react/src-tauri/Cargo.toml scraper::tests -- --nocapture
  - npm run typecheck --prefix ui-react
---

# Quick Task 4: Webview Scraper 日志无限增长兜底

## One-liner
为 webview scraper 增加 Rust 侧日志防爆机制（去重/丢弃 + 短时暴增熔断杀任务），并将错误日志保存在内存并回拉到前端，避免跳过任务后无法排查。

## What Changed

1. Rust 日志防护（`ui-react/src-tauri/src/scraper.rs`）
- 新增日志控制策略：
  - 连续重复日志阈值丢弃（`MAX_CONSECUTIVE_DUPLICATE_LOGS`）
  - 短窗口日志突增检测（`LOG_BURST_WINDOW_MS` + `LOG_BURST_LIMIT`）
- 发生日志暴增时：
  - 立即发出 `task_killed_log_burst` 错误日志
  - 关闭 scraper window
  - 清理 active task
  - 通过 `scraper_result` 回传 error，推动前端跳过并继续队列
- 对超长日志 message 做截断，避免单条日志导致内存膨胀。

2. 错误日志内存持久化
- 在 Rust `ScraperState` 中新增错误日志 ring buffer（按 source 保存）。
- 新增 Tauri 命令 `get_scraper_error_logs(source_id?: string)`，可查询最近错误日志。
- `scraper_log` 改为接入生命周期日志通道（绑定当前 active task），统一纳入防护策略。

3. 前端跳过场景日志回拉（`ui-react/src/hooks/useScraper.ts`）
- 新增 `syncErrorLogsFromMemory`：在 skip/timeout/错误结果/被熔断取消后，从 Rust 内存回拉 error logs。
- 前端日志数组增加去重与上限（`SCRAPER_LOG_LIMIT`），避免 UI 端继续无限增长。
- 清空队列时保留近期 error logs，减少排障信息丢失。

## Verification
- `cargo check --manifest-path ui-react/src-tauri/Cargo.toml` 通过
- `cargo test --manifest-path ui-react/src-tauri/Cargo.toml scraper::tests -- --nocapture` 通过（新增 2 个日志防护单测）
- `npm run typecheck --prefix ui-react` 通过

## Notes
- 现有 Rust 警告（`objc` 宏 cfg、snake_case、unused import）为历史告警，本次未扩大范围处理。
