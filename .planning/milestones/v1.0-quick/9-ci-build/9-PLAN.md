---
phase: quick
plan: 9
type: execute
wave: 1
depends_on: []
files_modified:
  - ui-react/src-tauri/src/lib.rs
  - README.md
  - docs/build-path-contract.md
  - .planning/STATE.md
autonomous: true
requirements: []
---

<objective>
Commit the Windows OAuth external URL opener fix, and sync CI/build documentation with recent release pipeline changes in one atomic quick-task delivery.
</objective>

<tasks>

<task type="auto">
  <name>Task 1: Replace shell-command URL/file opener path with unified native opener API</name>
  <files>ui-react/src-tauri/src/lib.rs</files>
  <action>
Remove `cmd /C start`, `/usr/bin/open`, and `xdg-open` branches in external URL/file-manager open paths, and route both through a single Tauri shell opener helper.
  </action>
  <verify>
    <manual>rg -n "Command::new\\(\\s*\"cmd\"|cmd /C|xdg-open|/usr/bin/open" ui-react/src-tauri/src/lib.rs</manual>
    <automated>cargo check --manifest-path ui-react/src-tauri/Cargo.toml</automated>
  </verify>
  <done>External opener behavior no longer depends on direct shell-command dispatch on Windows/macOS/Linux for URL/folder opening paths.</done>
</task>

<task type="auto">
  <name>Task 2: Update CI/build docs to match recent release matrix and updater policy</name>
  <files>README.md, docs/build-path-contract.md</files>
  <action>
Document current GitHub Actions release matrix, manual trigger mode, prepare-only prebuild stage, and updater-disabled packaging policy so docs match current CI/build behavior.
  </action>
  <verify>
    <manual>rg -n "release-tauri|workflow_dispatch|macos-15|macos-15-intel|createUpdaterArtifacts|nsis" README.md docs/build-path-contract.md</manual>
  </verify>
  <done>README and build contract documentation reflect the current CI/build pipeline behavior and constraints.</done>
</task>

<task type="auto">
  <name>Task 3: Run impacted validation and record quick-task artifacts</name>
  <files>ui-react/src-tauri/src/lib.rs, README.md, docs/build-path-contract.md, .planning/milestones/v1.0-quick/9-ci-build/9-SUMMARY.md, .planning/STATE.md</files>
  <action>
Run the frontend gate relevant to desktop/UI-path changes, create quick summary, and append quick-task completion row in project state with commit hash.
  </action>
  <verify>
    <automated>make test-frontend</automated>
  </verify>
  <done>Validation result is captured and GSD quick-task records are complete.</done>
</task>

</tasks>

<success_criteria>
- Windows external OAuth URL opening avoids command-shell argument parsing issues
- CI/build docs are updated to current release matrix and updater-disabled policy
- Quick-task summary and STATE.md quick-task table are updated together with commit metadata
</success_criteria>

<output>
After completion, create .planning/milestones/v1.0-quick/9-ci-build/9-SUMMARY.md
</output>
