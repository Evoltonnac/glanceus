---
date: 2026-03-08
area: ui
status: pending
priority: medium
tags: [frontend, search, ux]
---

# Topnav 全局搜索框 (Global Search)

## 需求描述
在 Topnav 增加一个全局搜索框，提升用户在复杂配置下的导航效率。

## 功能要求
- [ ] **快速激活**: 支持快捷键 `/` 自动聚焦并激活搜索框。
- [ ] **搜索范围**: 
    - Sources 名称
    - Widgets 名称
    - Integrations 名称
- [ ] **分类展示**: 搜索结果按类型（Source, Widget, Integration）进行分组展示。
- [ ] **键盘交互**: 支持使用上下方向键进行结果选择，`Enter` 确认。
- [ ] **定位与高亮**: 选中结果后，自动导航至对应的页面/视图，并对目标项进行视觉高亮（Highlight）。

## 技术研究
- [ ] 调研适用于 React 的轻量级本地搜索库（如 Fuse.js）。
- [ ] 调研现成的 Command Palette 或 Search UI 组件库（如 kbar, cmdk）。

## 关联项
- Area: ui-react
- Impact: Topnav, View Navigation
