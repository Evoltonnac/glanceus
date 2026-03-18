---
phase: quick
plan: 5
type: execute
wave: 1
depends_on: []
files_modified:
  - ui-react/src/components/widgets/WidgetRenderer.tsx
  - ui-react/src/components/widgets/shared/widgetParamResolver.ts
  - ui-react/src/lib/templateExpression.ts
  - ui-react/src/components/widgets/WidgetRenderer.test.tsx
autonomous: true
requirements: []
must_haves:
  truths:
    - bento 微组件参数模板解析从“零散字段”升级为全局参数解析链路
    - 非 value 类参数（size/spacing/align/layout/tone 等）可通过模板表达式参与解析
    - 解析开销受控，避免每次渲染重复解析同一表达式
  artifacts:
    - path: ui-react/src/components/widgets/shared/widgetParamResolver.ts
      provides: 全局参数解析工具（递归模板求值 + 参数归一化/类型兜底）
    - path: ui-react/src/lib/templateExpression.ts
      provides: 模板表达式 AST 缓存，降低重复 tokenize/parse 开销
    - path: ui-react/src/components/widgets/WidgetRenderer.test.tsx
      provides: 非 value 参数模板解析与容错回归测试
  key_links:
    - from: ui-react/src/components/widgets/WidgetRenderer.tsx
      to: ui-react/src/components/widgets/shared/widgetParamResolver.ts
      via: 渲染前统一参数解析入口
    - from: ui-react/src/components/widgets/shared/widgetParamResolver.ts
      to: ui-react/src/lib/templateExpression.ts
      via: evaluateTemplate -> evaluateTemplateExpression（缓存生效）
---

<objective>
升级 bento 布局微组件参数解析架构：将模板语法支持扩展到绝大多数参数（优先覆盖 size/spacing 等非 value 参数），并通过统一全局解析工具收敛逻辑；同时加入解析性能优化，避免因全量参数模板化带来的渲染性能退化。
</objective>

<tasks>

<task type="auto">
  <name>Task 1: 引入全局 widget 参数解析器并接入 WidgetRenderer</name>
  <files>ui-react/src/components/widgets/shared/widgetParamResolver.ts, ui-react/src/components/widgets/WidgetRenderer.tsx</files>
  <action>
新增全局解析工具，对 widget 树进行递归模板解析（保留 List.render 的按 item 延迟解析语义），并对 size/spacing/tone/align/layout/sort_order/weight/style 等参数做统一归一化；对模板输出的数值/布尔字符串按关键参数进行类型转换（如 columns/page_size/limit/maxLines/width 等），以提升“参数级模板语法”覆盖率。
  </action>
  <verify>
    <automated>cd ui-react && npm run test -- src/components/widgets/WidgetRenderer.test.tsx</automated>
  </verify>
  <done>WidgetRenderer 渲染前仅通过统一解析器处理参数，非 value 参数可模板化并稳定通过 schema</done>
</task>

<task type="auto">
  <name>Task 2: 模板表达式引擎增加缓存，控制全局解析性能成本</name>
  <files>ui-react/src/lib/templateExpression.ts</files>
  <action>
为 evaluateTemplateExpression 增加 AST 级缓存（含上限淘汰策略），避免重复表达式在同一会话中反复 tokenize/parse；在解析失败场景同样缓存失败结果，减少异常路径开销。
  </action>
  <verify>
    <automated>cd ui-react && npm run test -- src/components/widgets/WidgetRenderer.test.tsx</automated>
  </verify>
  <done>重复表达式解析可复用 AST，模板求值路径保持原有安全边界与容错行为</done>
</task>

<task type="auto">
  <name>Task 3: 补充回归测试覆盖非 value 参数模板化与容错</name>
  <files>ui-react/src/components/widgets/WidgetRenderer.test.tsx</files>
  <action>
新增测试覆盖：
1) size/spacing/align/tone 等非 value 参数支持模板表达式（含大小写归一化）；
2) List 布局参数 layout/columns/spacing 通过模板解析并正确渲染；
3) 模板返回非法枚举值时降级到 schema default，不触发整卡片 invalid fallback。
  </action>
  <verify>
    <automated>cd ui-react && npm run test -- src/components/widgets/WidgetRenderer.test.tsx</automated>
  </verify>
  <done>新增测试通过，覆盖本次参数模板化升级的关键行为</done>
</task>

</tasks>

<success_criteria>
- bento 微组件参数解析拥有单一全局入口
- 非 value 参数（至少 size/spacing/align/layout/tone）支持模板语法
- 表达式重复解析具备缓存，避免显著额外开销
- WidgetRenderer 回归测试通过且覆盖新增行为
</success_criteria>

<output>
After completion, create .planning/milestones/v1.0-quick/5-bento-value-size-spacing/5-SUMMARY.md
</output>
