# Quick Task 19 Summary

## Goal
当 integration YAML 的 `templates` 变更后，已添加到视图面板的组件应自动同步；同时避免继续把模板快照写入 view 存储。

## Decision
优先采用“视图只存关联（`template_id` + overrides），读取时按当前 integration templates 动态 hydration”。

原因：
- 单一事实源（template 仅在 integration YAML）避免多处同步。
- 变更自动传播到所有视图组件，避免批量迁移脚本与遗漏。
- 保留 `props` 作为 override 语义，后续支持局部自定义。

## What Changed
- `core/api.py`
  - 新增模板 props 合并/差异提取逻辑：存储时仅保留 overrides，读取时合并当前 template + overrides。
  - `create_stored_view_record` 改为保存规范化 overrides，并返回 hydration 后视图。
  - `GET /api/views` 改为按当前配置统一 hydration，确保 templates 变更可反映到已添加组件。
  - 兼容 legacy 快照：对于历史 `props` 中带 `id/type` 的模板快照，按“无 override”处理，避免阻断模板更新。
- `ui-react/src/pages/Dashboard.tsx`
  - 添加组件时不再写入模板快照，`props` 置为空对象，仅保存 `template_id` 关联。
- `ui-react/src/pages/Integrations.tsx`
  - integration 保存并 reload 成功后，主动 `invalidateViews()`，同会话内可尽快刷新视图缓存。
- `tests/api/test_view_template_injection_api.py`
  - 增加/更新用例：验证“响应可 hydration、存储仅 overrides、模板变更后读取自动同步、兼容 legacy 快照”。
- `tests/core/test_bootstrap_starter_bundle.py`
  - 断言调整为 starter view 存储层仅保留空 `props`（无模板快照）。

## Validation
- Passed:
  - `pytest tests/api/test_view_template_injection_api.py tests/core/test_bootstrap_starter_bundle.py`
- Frontend test environment limitation (pre-existing):
  - `npm --prefix ui-react run test -- --run src/pages/Integrations.test.tsx src/pages/dashboardLayout.test.ts`
  - `Integrations.test.tsx` 仍因本地 `monaco-editor` 解析失败未运行；`dashboardLayout.test.ts` 通过。

## Commits
- Code changes: `c9189ba`
