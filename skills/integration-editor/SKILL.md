---
name: integration-editor
description: "用于创建、编辑和修改 Glancier 平台的 Integration YAML 配置文件。当需要添加新集成、修改数据拉取流程 (flow) 或调整界面模板 (SDUI templates) 时使用此技能。"
---

# Glancier Integration Editor 技能指南

这个技能为你提供了创建和修改 Glancier 集成配置 (`.yaml`) 的能力。Glancier 的配置包含了鉴权、数据获取步骤 (`flow`) 以及服务器驱动 UI 模板 (`templates`)。

## 🎯 核心工作流：意图驱动

你不需要每次都执行从头到尾的完整流程。请首先分析用户的需求，进入对应的模块。

*   **场景 A：从 0 到 1 创建新集成** 👉 依次执行 【模块 1】 -> 【模块 2】 -> 【模块 3】 -> 【模块 4】。
*   **场景 B：仅修改数据流/鉴权方式** 👉 跳过 UI 模块，直接执行 【模块 1】 或 【模块 2】 -> 【模块 4】。
*   **场景 C：仅修改 SDUI 界面** 👉 跳过接口研究，直接执行 【模块 3】 -> 【模块 4】。

---

## 🛠️ 模块 1：鉴权方式研究 (Auth Discovery)
*目的：决定最合适的 API 鉴权方式。*

1.  **首选 API Key**：通过 Google 搜索 `{平台名称} API Personal Access Token` 或 `developer keys`。如果平台支持长期有效的 Token，请选择 **`api_key`** 模式。
2.  **次选 OAuth 2.0**：如果不支持 API Key，搜索 `{平台名称} OAuth 2.0 scopes endpoints`。如果是桌面端/CLI环境，优先寻找 **Device Code Flow**。如果支持，选择 **`oauth`** 模式。
3.  **退避策略**：如果没有公开 API，考虑 `webview` 抓取或 `curl`。
4.  **查阅参考**：在确定方式后，请查看 `references/flow-patterns.md` 获取该鉴权模式在 YAML 中的标准写法。

---

## 🛠️ 模块 2：数据流设计 (Flow Design)
*目的：设计 `http` 和 `extract` 步骤。*

1.  研究目标平台的 API 响应结构。
2.  在 YAML 的 `flow` 数组中添加 `http` 步骤拉取数据，并使用 `extract` (JSONPath) 提取所需字段到 `outputs` 变量中。
3.  **查阅参考**：具体字段要求请查看 `references/flow-patterns.md`。

---

## 🛠️ 模块 3：界面模板设计 (SDUI Design)
*目的：使用提取的变量渲染界面。*

1.  **必须查阅 UI 组件速查表**：阅读 `references/sdui-components.md`，了解所有可用的 Widget 及其属性（这是 JSON Schema 的精简版）。
2.  在 `templates[x].widgets` 中组合组件。不要臆造不存在的组件（例如不要使用 `Button`，而应使用 `ActionSet`）。
3.  使用 `{变量名}` 将 `flow` 中提取的 `outputs` 绑定到 UI 属性上（例如 `text: "{user_name}"`）。

---

## 🛠️ 模块 4：写入与自我校验 (Validate & Iterate) 🚨关键步骤🚨
*目的：确保 YAML 文件符合 Glancier 的严格 JSON Schema。*

1.  **写入文件**：使用代码编辑工具将生成的 YAML 写入 `config/integrations/` 目录下（或直接使用 replace 修改现有文件）。
2.  **强制校验**：执行完成后，必须验证 YAML 是否符合 Schema。如果项目中存在类似 `validate_yaml.py` 或内置的 CLI 验证命令（例如针对 `config/integrations/xx.yaml` 进行测试），请运行它。
    *   *(注：如果不确定如何运行命令，可以使用 `scripts/generate_schemas.py` 相关的验证逻辑，或运行项目的测试脚本。)*
3.  **自我修正 (Iteration Loop)**：如果校验或测试返回了错误信息（例如：`Additional properties are not allowed`, `Missing required property`），**你必须仔细阅读错误信息，查阅对应的参考文档，并修复 YAML 文件**。只有在没有验证错误的情况下，任务才算真正完成。

---

💡 **记住**：YAML 的缩进和层级非常重要。当修改已有文件时，优先考虑使用精准搜索替换，避免破坏原有文件的注释。
