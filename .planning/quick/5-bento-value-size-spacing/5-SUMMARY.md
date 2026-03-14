---
phase: quick
plan: 5
status: completed
owner: codex
created_at: 2026-03-14
commit: 373b9a5
---

## Objective
将 bento 微组件参数模板解析从局部 value 字段扩展为全局参数解析能力，覆盖 size/spacing 等非 value 参数，并通过表达式 AST 缓存控制性能开销。

## What Changed
- 新增全局参数解析器 `ui-react/src/components/widgets/shared/widgetParamResolver.ts`：
  - 递归解析 widget 树中的模板表达式；
  - 保持 `List.render` 的按 item 延迟解析语义；
  - 统一归一化枚举参数（`size/spacing/tone/align/layout/sort_order/weight/style`）；
  - 对模板结果执行关键参数类型转换（如 `columns/page_size/limit/maxLines/width` 的数字化）。
- `WidgetRenderer` 改为在 schema 校验前统一调用 `resolveWidgetParams`，移除旧的局部模板递归函数。
- `evaluateTemplateExpression` 增加 AST 缓存（上限 256，FIFO 淘汰），避免重复表达式反复 tokenize/parse。
- 扩展 `WidgetRenderer` 测试：
  - 非 value 参数模板解析（size/spacing/align/tone）；
  - List 的 layout/columns/spacing 模板解析与类型转换；
  - 非法模板枚举值默认兜底，不触发 invalid widget fallback。

## Verification
- `cd ui-react && npm run test -- src/components/widgets/WidgetRenderer.test.tsx`
- 结果：`11 passed`。

## Result
- 大部分常用参数可通过统一模板解析入口进行转换，包含 `size`、`spacing` 等布局参数。
- 解析性能通过 AST 缓存优化，减少重复表达式解析开销。
- 新增测试覆盖确保升级行为可回归。
