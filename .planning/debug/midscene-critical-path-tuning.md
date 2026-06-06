---
status: abandoned
trigger: "刚刚重新discuss了phase并更新了midscene的测试流程和自迭代调优流程。现在需要实际调优关键路径的用例来验证流程可用性并实际完成调优。目标：按 docs/midscene-testing-guide.md 的自分析迭代流程，实际运行并调优 ui-react/tests/e2e/midscene/critical-path.spec.ts，最多自动修复 2 轮；优先判定环境/启动问题、产品行为或 mock 语义问题，再判断提示词/等待/断言问题。只允许自动修改测试提示词、等待策略、断言措辞、测试拆分/去重；涉及产品代码、mock 业务语义、真实流程期望变化必须停止并请求人工确认。"
created: "2026-06-04"
updated: "2026-06-04"
---

# Debug Session: midscene-critical-path-tuning

## Symptoms

- expected_behavior: "`ui-react/tests/e2e/midscene/critical-path.spec.ts` should run through the project Midscene self-analysis iteration workflow and converge to a usable tuned critical-path test."
- actual_behavior: "The workflow has been documented and discussed, but the critical-path case still needs to be run, diagnosed, and tuned in practice."
- error_messages: "Unknown until the first test attempt."
- timeline: "After the phase was re-discussed and `docs/midscene-testing-guide.md` was updated on 2026-06-04."
- reproduction: "Follow `docs/midscene-testing-guide.md`, run the critical-path Midscene E2E test, inspect failure evidence, then tune the test within the allowed boundaries."

## Current Focus

- hypothesis: "Unknown until first run; evidence must first distinguish environment/startup failures, product or mock semantic issues, and prompt/wait/assertion issues."
- test: "Run the critical-path Midscene E2E test and collect stdout, trace/screenshots if available, and any Midscene report artifacts."
- expecting: "Either a passing critical-path case or a concrete failure class with evidence."
- next_action: "gather initial evidence"
- reasoning_checkpoint: "Automatic changes are limited to test prompt wording, wait strategy, assertion wording, and test split/dedup only. Stop for product code, mock business semantics, or real workflow expectation changes."
- tdd_checkpoint: "not applicable"

## Evidence

- timestamp: 2026-06-04 attempt 1/2
  command: `pnpm --dir ui-react exec dotenv -e ../.env -- playwright test tests/e2e/midscene/critical-path.spec.ts --reporter=list`
  failure_summary: "4 tests failed. The create integration test hit a Midscene AI model request timeout at API Key selection, but the snapshot showed the New Integration dialog was already open and API Key was selected. The create source test clicked a sidebar row but remained on Select an Integration. Dashboard and add-widget tests timed out even though snapshots showed the dashboard and Add Widget dialog were visible."
  evidence: "ui-react/test-results/midscene-critical-path-Smo-cdfe7-tegration-with-API-Key-type/error-context.md; ui-react/test-results/midscene-critical-path-Smo-03dda-ate-source-from-integration/error-context.md; ui-react/test-results/midscene-critical-path-Smo-025f3-ashboard-and-verify-widgets/error-context.md; ui-react/test-results/midscene-critical-path-Smo-03455-low-add-widget-to-dashboard/error-context.md; ui-react/midscene_run/report/playwright-Smoke--Critical-Path-Flow__create-integration-with-API-Key-type-991d368d-7139-4fb4-87b0-6ee682316748.html"
  classification: "mixed: environment/setup AI timeout for one call; prompt-description/wait/assert wording for visible UI states and ambiguous sidebar card click"
  change_made: "Round 1 test-only fix: removed unnecessary API Key selection AI call, used visible New/ID/Name/Create wording, described sidebar row click target, switched source flow to Source Management Section wording, simplified dashboard assertion, and aligned Add Widget steps to actual dialog labels."
  next_action: "re-run the same critical-path spec"

- timestamp: 2026-06-04 attempt 2/2
  command: `pnpm --dir ui-react exec dotenv -e ../.env -- playwright test tests/e2e/midscene/critical-path.spec.ts --reporter=list`
  failure_summary: "Round 1 verification still failed. Create integration/source hit the 90s test timeout while screenshots showed the dialogs were open but inputs/actions had not completed. Dashboard assertion ran while startup gate was still visible. Add Widget wait expected Select Template before a source was selected, but screenshot showed only Select Source and a disabled Add to Dashboard button."
  evidence: "ui-react/test-results/midscene-critical-path-Smo-cdfe7-tegration-with-API-Key-type/error-context.md; ui-react/test-results/midscene-critical-path-Smo-03dda-ate-source-from-integration/error-context.md; ui-react/test-results/midscene-critical-path-Smo-03455-low-add-widget-to-dashboard/error-context.md"
  classification: "prompt-description/wait/assert wording with slow AI-call budget pressure"
  change_made: "Round 2 test-only fix: raised critical-path describe timeout to 180s, added startup-gone wait before dashboard assertion, made textbox prompts explicit by label and dialog, waited for enabled Create button, and changed Add Widget flow to select source before waiting for template cards."
  next_action: "final re-run; if failing, stop automatic repair and report diagnosis"

- timestamp: 2026-06-04 human observation
  failure_summary: "After opening the New Integration panel, the test did not click a preset and did not fill Name or ID, so it kept waiting without visible progress. Because the form stayed empty, Create could not be clicked."
  classification: "human-visual-spec supplied; prompt-description problem, not product bug"
  change_made: "Proceed with a human-confirmed extra repair focused only on explicit visible steps inside the New Integration dialog."
  next_action: "update create-integration prompts and run that test case"

## Eliminated

## Resolution

- root_cause: "The documented self-analysis flow works for evidence collection and conservative test tuning, but the critical-path spec did not fully converge within the allowed 2 automatic repair rounds. Three scenarios now pass. The remaining create-integration scenario times out with the New Integration dialog open, both textboxes empty, and Create disabled, indicating the Midscene text-entry action did not complete before the spec timeout."
- fix: "Applied two allowed test-only tuning rounds in `ui-react/tests/e2e/midscene/critical-path.spec.ts`: clearer visible-control prompts, Source Management Section wording, startup wait, Add Widget source/template order, and longer spec timeout."
- verification: "Final command `pnpm --dir ui-react exec dotenv -e ../.env -- playwright test tests/e2e/midscene/critical-path.spec.ts --reporter=list` produced 3 passed / 1 failed. Passing: create source, navigate dashboard, add widget. Failing: create integration timed out after 180s."
- files_changed: "ui-react/tests/e2e/midscene/critical-path.spec.ts; .planning/debug/midscene-critical-path-tuning.md"
