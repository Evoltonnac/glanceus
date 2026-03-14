---
phase: quick
plan: 7
type: execute
wave: 1
depends_on: []
files_modified:
  - ui-react/src/components/widgets/shared/commonProps.ts
  - ui-react/src/components/widgets/layouts/Container.tsx
  - ui-react/src/components/widgets/layouts/ColumnSet.tsx
  - ui-react/src/components/widgets/layouts/Column.tsx
  - ui-react/src/components/widgets/containers/List.tsx
  - ui-react/src/components/widgets/elements/FactSet.tsx
  - ui-react/src/components/widgets/actions/ActionSet.tsx
  - ui-react/src/components/widgets/WidgetRenderer.tsx
  - ui-react/src/components/widgets/WidgetRenderer.test.tsx
autonomous: true
requirements: []
---

<objective>
调整 Widgets 视觉层级：布局 spacing 相对更大、元组件 spacing 相对更紧凑；List 组件默认为每个 item 增加轻量边框效果，保持与当前设计风格一致。
</objective>

<tasks>

<task type="auto">
  <name>Task 1: 拆分布局/元组件 spacing 语义映射</name>
  <files>ui-react/src/components/widgets/shared/commonProps.ts, ui-react/src/components/widgets/layouts/*.tsx, ui-react/src/components/widgets/elements/FactSet.tsx, ui-react/src/components/widgets/actions/ActionSet.tsx, ui-react/src/components/widgets/containers/List.tsx</files>
  <action>
将原共享 spacing map 拆为 layout 与 micro 两套映射：布局（Container/ColumnSet/Column/List）默认更大，元组件（FactSet/ActionSet）相对更小，保证层级关系更清晰。
  </action>
  <verify>
    <automated>npm --prefix ui-react run test -- src/components/widgets/WidgetRenderer.test.tsx</automated>
  </verify>
  <done>布局与元组件 spacing 的 class 映射分离且测试通过</done>
</task>

<task type="auto">
  <name>Task 2: List 默认 item 轻边框视觉</name>
  <files>ui-react/src/components/widgets/WidgetRenderer.tsx</files>
  <action>
为 List 渲染的每个 item 增加轻量边框容器（细边框 + 圆角 + 轻背景），不改变数据与渲染逻辑，仅增强视觉分组。
  </action>
  <verify>
    <automated>npm --prefix ui-react run test -- src/components/widgets/WidgetRenderer.test.tsx</automated>
  </verify>
  <done>List item 默认呈现轻边框样式并通过测试</done>
</task>

<task type="auto">
  <name>Task 3: 更新/补充测试并执行验收</name>
  <files>ui-react/src/components/widgets/WidgetRenderer.test.tsx</files>
  <action>
调整 spacing 预期断言，新增 List item 边框样式断言，执行 widgets 测试作为本次验收依据。
  </action>
  <verify>
    <automated>npm --prefix ui-react run test -- src/components/widgets/WidgetRenderer.test.tsx</automated>
  </verify>
  <done>验收通过且可清晰验证视觉改造关键点</done>
</task>

</tasks>

<success_criteria>
- 布局 spacing 映射相对旧版增大一档
- 元组件 spacing 映射相对布局更紧凑
- List 每个 item 默认带轻边框视觉
- WidgetRenderer 相关测试通过并覆盖新增视觉规则
</success_criteria>

<output>
After completion, create .planning/quick/7-widgets-spacing-list-item/7-SUMMARY.md
</output>
