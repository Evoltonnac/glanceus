---
phase: quick
plan: 7
status: completed
owner: codex
created_at: 2026-03-14
commit: pending (user requested no commit)
---

## Objective
改造 Widgets 视觉层级：让布局 spacing 相对更大、元组件 spacing 相对更紧凑；并为 List item 增加默认轻量边框效果。

## What Changed
- 拆分 spacing 映射（`ui-react/src/components/widgets/shared/commonProps.ts`）：
  - `layoutSpacingClassMap`: `sm -> qb-gap-2`, `md -> qb-gap-3`, `lg -> qb-gap-4`
  - `microSpacingClassMap`: `sm -> qb-gap-1`, `md -> qb-gap-2`, `lg -> qb-gap-3`
- 布局组件改用 `layoutSpacingClassMap`：
  - `layouts/Container.tsx`
  - `layouts/ColumnSet.tsx`
  - `layouts/Column.tsx`
  - `containers/List.tsx`
- 元组件改用 `microSpacingClassMap`：
  - `elements/FactSet.tsx`
  - `actions/ActionSet.tsx`
- List 默认 item 轻边框（`WidgetRenderer.tsx`）：
  - item wrapper 新增 `rounded-md border border-border/40 bg-surface/20 px-2 py-1.5`
- 测试更新（`WidgetRenderer.test.tsx`）：
  - 更新 spacing 断言以匹配新映射
  - 新增 layout vs micro 同 token 的层级断言
  - 新增 list item 默认边框样式断言

## Verification
- `npm --prefix ui-react run test -- src/components/widgets/WidgetRenderer.test.tsx`
  - 结果：`1 passed`, `14 passed (14)`

## Result
- 布局与元组件 spacing 层级已解耦并符合“布局更大、元组件相对更小”的目标。
- List item 默认轻边框样式已生效。
- 已完成本地验收，按用户要求未执行提交。
