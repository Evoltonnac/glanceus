---
quick_task: 2
title: Integration YAML single-file-single-instance refactor
date: 2026-03-07
status: completed
---

## What was fixed

1. **存储模型重构为单文件单实例**
- integration YAML 从 `integrations[]` 改为单个对象。
- integration id 不再来自 YAML 内 `id` 字段，而是固定为文件名 stem。
- `core/config_loader.py` 在加载 `config/integrations/*.yaml` 时注入 `id=<filename stem>`。

2. **API/编辑器校验统一**
- `PUT /api/integrations/files/{filename}` 明确拒绝 legacy `integrations[]`。
- 若 YAML 中显式声明 `id` 且与文件名 stem 冲突，返回结构化诊断。
- Monaco schema 同步切换为单对象格式（`flow` 必填，`id` 不在 schema 中）。

3. **配置文件迁移为文件名即 id**
- 示例集成文件改为新格式并重命名为 id 一致：
  - `github_oauth.yaml`
  - `openrouter_keys_apikey.yaml`
  - `soniox_dashboard.yaml`
  - `soniox_dashboard_webview.yaml`
- 已有 source 的 `integration_id` 不需要额外迁移。

## Key changes
- `core/config_loader.py`
  - integration 目录按单文件单实例解析。
  - `AppConfig` 增加重复 integration id 拦截。
- `core/integration_manager.py`
  - `get_integration_ids_in_file()` 改为文件 stem 语义。
- `core/api.py`
  - integration files 路由保持文件维度。
  - 保存校验切换为单对象模式（拒绝 `integrations[]`）。
- `scripts/generate_schemas.py`
  - schema 生成从数组顶层切换为单对象顶层。
- `config/schemas/integration.schema.json`
  - 重新生成。
- `ui-react/src/components/editor/YamlEditorWorkerSetup.ts`
  - fallback schema 切换为单对象模型。

## Tests
- `pytest -q tests/core/test_integration_manager_files.py tests/api/test_integration_files_api.py tests/core/test_config_loader_resilience.py tests/core/test_generate_schemas.py tests/api/test_auth_status.py tests/api/test_reload_error_boundary.py`
  - Result: **14 passed**
- `npm run --prefix ui-react typecheck`
  - Result: **passed**

## Notes
- 本次重构面向“AI 生成单文件配置”场景，避免 agent 缺少全局上下文时产生跨文件重复 id 的系统级冲突。
