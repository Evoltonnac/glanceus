---
phase: quick
plan: 4
type: execute
wave: 1
depends_on: []
files_modified:
  - core/api.py
  - tests/api/test_reload_error_boundary.py
  - ui-react/src/api/client.ts
  - ui-react/src/api/client.test.ts
  - ui-react/src/pages/Integrations.tsx
  - ui-react/src/pages/Integrations.test.tsx
autonomous: true
requirements: []
must_haves:
  truths:
    - Integrations 侧边栏重载在未选中文件时也会执行页面级重载
    - 保存/重载后会区分仅视图改动与逻辑改动并输出 toast 结果
    - 逻辑改动会自动刷新受影响 source；仅视图改动不会触发 source 刷新
  artifacts:
    - path: core/api.py
      provides: reload 返回改动分类并自动刷新逻辑改动 source
    - path: ui-react/src/pages/Integrations.tsx
      provides: 页面级重载、toast 反馈与改动类型提示
  key_links:
    - from: core/api.py
      to: ui-react/src/pages/Integrations.tsx
      via: reloadConfig 响应结构（changed_files/auto_refreshed_sources）
---

<objective>
修复 integration 重载体验：重载按钮页面级生效；保存/重载结果通过 toast 提示；区分视图改动与逻辑改动；逻辑改动自动刷新受影响 source。
</objective>

<tasks>

<task type="auto">
  <name>Task 1: 扩展后端 reload 结果并在逻辑改动时自动刷新 source</name>
  <files>core/api.py, tests/api/test_reload_error_boundary.py</files>
  <action>
为 /api/system/reload 增加改动分类（view vs logic）和 changed_files 明细。对逻辑改动的 integration，自动触发受影响 source 刷新（BackgroundTasks + executor.fetch_source），并在响应中返回 auto_refreshed_sources。
补充 API 测试覆盖：仅视图改动不触发刷新，逻辑改动触发刷新。
  </action>
  <verify>
    <automated>pytest -q tests/api/test_reload_error_boundary.py</automated>
  </verify>
  <done>reload API 能区分改动类型并自动刷新逻辑改动关联 source</done>
</task>

<task type="auto">
  <name>Task 2: 前端接入 reload 新结构并输出 toast 反馈</name>
  <files>ui-react/src/api/client.ts, ui-react/src/pages/Integrations.tsx, ui-react/src/pages/Integrations.test.tsx, ui-react/src/api/client.test.ts</files>
  <action>
扩展 reloadConfig 类型以包含 changed_files/auto_refreshed_sources。Integrations 页面新增统一结果文案生成：区分仅视图改动与逻辑改动，并显示已自动刷新的 source 数量。将重载按钮改为页面级：未选中文件也可执行 reload。保存和重载都触发 toast 提示。
补充前端测试覆盖：未选中文件时重载仍生效，reloadConfig 结构字段可解析。
  </action>
  <verify>
    <automated>cd ui-react && npm run test -- src/pages/Integrations.test.tsx src/api/client.test.ts</automated>
  </verify>
  <done>页面级重载 + toast 结果提示 + 改动类型区分在保存/重载路径生效</done>
</task>

</tasks>

<success_criteria>
- 未选中文件时点击 Integrations 侧边栏“重载”会执行 reload
- 保存和重载均可提示“仅视图改动”或“逻辑改动（自动刷新 source）”
- 逻辑改动时后端自动刷新受影响 source
- API 与页面测试通过
</success_criteria>

<output>
After completion, create .planning/quick/4-integration-toast-source-source-source/4-SUMMARY.md
</output>
