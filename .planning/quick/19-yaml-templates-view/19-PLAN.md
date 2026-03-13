---
task: quick-19
description: YAML 集成 templates 变更后，视图面板已添加组件需自动同步；添加组件时不再持久化模板快照，改为模板关联 + 读取时动态注入
created: 2026-03-13
---

# Quick Plan 19

## Task 1 - 后端改为模板关联+动态 hydration
- files: `core/api.py`, `tests/api/test_view_template_injection_api.py`
- action: 让 view 持久化仅保存模板覆盖字段（而非模板快照），并在 `GET /api/views` 返回时按当前 integration templates 动态 hydration 组件 props；兼容历史快照数据。
- verify: API 测试覆盖创建/读取场景，验证模板变更后已添加组件会跟随新模板。
- done: 修改 integration YAML templates 后，不需手动批量改 view 记录即可在视图端生效。

## Task 2 - 前端添加组件停止写入模板快照
- files: `ui-react/src/pages/Dashboard.tsx`
- action: 添加组件时仅写入 `template_id`（`props` 置空，预留 override 语义），避免新数据继续快照化。
- verify: 组件新增流程仍可成功创建/更新 view。
- done: 新增组件不再把整份 template 写入 view 存储。

## Task 3 - 配置保存后刷新视图缓存
- files: `ui-react/src/pages/Integrations.tsx`
- action: integration 保存并 reload 成功后主动 `invalidateViews`，让模板改动尽快体现在监控面板。
- verify: 保存成功路径会触发视图缓存刷新调用。
- done: 同一会话中修改 templates 后切回 Dashboard 即可看到同步结果。
