---
phase: quick
plan: 9
status: completed
owner: codex
created_at: 2026-03-16
commit: pending
---

## Objective
Commit the Windows external URL opener fix and sync CI/build documentation with the current release pipeline behavior.

## What Changed
- Replaced platform-specific command-shell URL/folder opening in Tauri command handlers with a unified native opener call:
  - `ui-react/src-tauri/src/lib.rs`
  - `open_external_url` no longer uses `cmd /C start` on Windows.
  - `open_logs_folder` now uses the same opener path.
- Added CI/build release notes to maintainer docs:
  - `README.md`
  - `docs/build-path-contract.md`
- Added quick-task planning/execution artifacts:
  - `.planning/quick/9-ci-build/9-PLAN.md`
  - `.planning/quick/9-ci-build/9-SUMMARY.md`

## Validation
- `cargo check --manifest-path ui-react/src-tauri/Cargo.toml`
  - Passed (existing warnings in `src/scraper.rs`, no new compile errors)
- `make test-frontend`
  - Passed (`5` test files, `30` tests)

## Notes
- This change specifically avoids shell argument parsing issues that can drop OAuth query parameters on Windows.
- CI/build docs now explicitly capture manual release trigger mode, platform matrix targets, prebuild staging, and updater-disabled packaging policy.
