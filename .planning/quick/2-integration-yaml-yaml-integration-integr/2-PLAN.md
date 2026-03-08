---
quick_task: 2
title: Integration YAML file-level management and source association fix
date: 2026-03-07
mode: quick
status: completed
---

## Goal
完成 integration 配置存储模型重构：
1. 从 `integrations[]` 多实例写法切换到“单文件单实例”。
2. integration id 由文件名 stem 决定（`<filename>.yaml` -> `<filename>`）。
3. Editor/API/Loader/Schema 在该模型下保持一致。

## Scope
- 涉及后端 loader/API、前端编辑器 schema 与示例配置文件迁移。
- 保持 integration id 全局唯一（由文件名天然约束）。
- 不改 ROADMAP/phase 流程，仅作为 quick task 落地。

## Tasks

### Task 1: Backend single-file-single-instance model
- files:
  - `core/config_loader.py`
  - `core/integration_manager.py`
  - `core/api.py`
- action:
  - `load_all_yamls` 在 `config/integrations/*.y*ml` 中按“文件=一个 integration”加载，并注入 `id=<filename stem>`。
  - API 保存接口拒绝 legacy `integrations[]` 格式，仅接受单个 integration 对象。
  - `sources` 关联按 `filename stem` 匹配 `source.integration_id`。
- verify:
  - 重载配置后，每个集成的 id 与文件名一致。
  - legacy 数组格式保存时返回 400 明确错误。
- done:
  - 后端存储、运行时 id、API 语义统一。

### Task 2: Frontend/schema alignment
- files:
  - `scripts/generate_schemas.py`
  - `config/schemas/integration.schema.json`
  - `ui-react/src/components/editor/YamlEditorWorkerSetup.ts`
  - `ui-react/src/api/client.ts`
  - `ui-react/src/pages/Integrations.tsx`
  - `config/integrations/*.yaml`
- action:
  - schema 改为单 integration 对象（移除 `integrations[]` 与内联 `id`）。
  - 示例配置迁移为新格式，并将文件名重命名为原 id（避免现有 source 断链）。
  - 页面继续按文件编辑，source 默认绑定当前文件 stem id。
- verify:
  - Monaco 校验与后端保存校验一致。
  - 现有 source 的 `integration_id` 无需批量迁移。
- done:
  - UI 与 schema 已完全适配单文件单实例模型。

### Task 3: Regression tests
- files:
  - `tests/core/test_integration_manager_files.py`
  - `tests/api/test_integration_files_api.py`
- action:
  - 更新并新增测试覆盖：文件名 id、legacy 拒绝、loader 新格式、schema 新格式。
- verify:
  - 核心后端测试与前端 typecheck 通过。
- done:
  - 防止回归到 `integrations[]` 多实例模型。

## Risks
- 外部手工脚本若仍产出旧 `integrations[]` 格式会保存失败，需要改造 prompt/template。

## Exit Criteria
- 创建集成文件不再出现“未找到 YAML”。
- Editor/API/Loader/Schema 全部采用单文件单实例。
- integration id 与文件名 stem 一致。
- 新增回归测试全部通过。
