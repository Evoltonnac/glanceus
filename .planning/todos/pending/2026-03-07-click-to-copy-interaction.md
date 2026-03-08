---
created: 2026-03-07T14:00:00Z
title: click-to-copy-interaction
area: ui
files:
  - ui-react/src/App.tsx
  - ui-react/src/hooks/useCopyToClipboard.ts
  - .planning/codebase/CONVENTIONS.md
---

## Problem

UI 中存在大量的 ID、Name、Logs、Numbers 等信息，用户往往需要双击选中并复制。目前的交互依赖于浏览器默认的选中文本行为，且在一些点击或 hover 较为密集的区域，选中操作不便。

## Solution

为特定元素添加点击复制的全局交互，减少用户的操作链路。

### 交互规则
- **目标范围**：目标元素及其父级容器不应有其他点击交互（如按钮、链接）。主要针对 Name, Log, Number 等用户可能会双击选中复制的内容。
- **视觉反馈**：无需额外的复制按钮或特殊的 `cursor: pointer` 样式，保持 UI 整洁。
- **触发逻辑**：用户单点即可触发复制。
- **提示效果**：复制成功后弹出全局 Toast 提示。

### 工程实现
- **指定属性**：增加指定特殊类或属性到元素上（如 `.click-to-copy` 或 `data-copyable`）。
- **全局监听**：在 `App.tsx` 或顶层组件中增加一个点击监听事件。
- **动态解析**：监听器通过 `event.target` 识别标记并进行复制。
- **全局 Toast**：调用现有的 Toast 组件提示复制成功。

### 文档更新
- 将该交互需求记录到项目规范 `.planning/codebase/CONVENTIONS.md` 中。
