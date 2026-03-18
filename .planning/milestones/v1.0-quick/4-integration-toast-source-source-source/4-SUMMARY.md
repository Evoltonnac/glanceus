---
phase: quick
plan: 4
type: execute
subsystem: integrations
tags: [ui, api, reload, source-refresh]
dependency_graph:
  requires: []
  provides:
    - 区分 integration 视图改动/逻辑改动
    - 逻辑改动自动刷新受影响 source
    - Integrations 页面级重载与 toast 反馈
  affects:
    - core/api.py
    - ui-react/src/pages/Integrations.tsx
key_files:
  created: []
  modified:
    - core/api.py
    - tests/api/test_reload_error_boundary.py
    - ui-react/src/api/client.ts
    - ui-react/src/api/client.test.ts
    - ui-react/src/pages/Integrations.tsx
    - ui-react/src/pages/Integrations.test.tsx
decisions:
  - reload 响应新增 changed_files 与 auto_refreshed_sources，前端据此生成保存/重载反馈文案
  - 仅当改动属于逻辑层（非 templates/name/description）时才自动刷新 source
metrics:
  completed_date: "2026-03-14"
  code_commit: "dd6b011"
---

# Quick Task 004 Summary

## Objective
实现 integration 重载按钮页面级生效；保存/重载后使用 toast 给出结果；区分仅视图改动和逻辑改动；逻辑改动时自动刷新受影响 source。

## Completed
1. 后端 `/api/system/reload` 增加改动分类与明细输出：
- `changed_files[]`（含 `change_scope`, `changed_fields`, `related_sources`, `auto_refreshed_sources`）
- `auto_refreshed_sources`（全局去重汇总）
2. 后端对逻辑改动自动触发 source 刷新：
- 使用新配置解析 source
- 更新状态为 `refreshing`
- 通过 `BackgroundTasks` 触发 `fetch_source`
3. 前端 Integrations 页面更新：
- 重载按钮改为页面级生效（未选中文件也可重载）
- 保存与重载统一用 `changed_files` 生成反馈文案
- 结果通过全局 toast 展示（成功/失败）
- 逻辑改动时触发 sources 缓存失效刷新
4. 测试补充：
- API：新增“仅视图改动不刷新 source”和“逻辑改动自动刷新 source”覆盖
- UI/API client：新增 reload 新结构解析与页面级重载行为覆盖

## Verification
- `pytest -q tests/api/test_reload_error_boundary.py` ✅ 4 passed
- `npm run test -- src/pages/Integrations.test.tsx src/api/client.test.ts` ❌ 环境问题（Vitest worker `ERR_REQUIRE_ESM`）
- `npm run typecheck` ❌ 现有未使用变量导致失败（`src/pages/Dashboard.tsx` 既有问题，非本次改动引入）

## Commit
- Code: `dd6b011` — `feat(integrations): classify reload changes and auto refresh logical sources`
