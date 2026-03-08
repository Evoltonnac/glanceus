---
created: 2026-03-07T13:38:00Z
title: integration-preset-choices
area: ui, integration
files:
  - ui-react/src/pages/integrations/
  - core/integration_manager.py
---

## Problem

在创建或配置集成时，用户需要手动输入复杂的字段和配置项，缺乏指引且容易出错。

## Solution

在集成表单中引入预设 (Presets) 功能，提供多个常见服务的预设模板（如 GitHub, OpenRouter 等的推荐配置），用户选择预设后自动填充表单字段。
