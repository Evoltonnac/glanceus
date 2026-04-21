# Phase 01: Midscene AI 自动化测试集成 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-21
**Phase:** 01-midscene-ai-harness
**Areas discussed:** Test Coverage Scope, Harness Architecture, Mock Strategy, YAML Config Strategy

---

## Coverage Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Critical integration paths | AI drives full OAuth flows, webview scraping, dashboard rendering — paths existing smoke tests can't visually validate | ✓ |
| Visual/UX regression only | Focus on layout shifts, broken widgets, rendering across themes | |
| Exploratory edge cases | AI discovers failure modes — more discovery, less regression | |
| Full end-to-end everything | Comprehensive but slowest | |

**User's choice:** Critical path E2E + additional feature interaction test cases:
- Main path: create integration → create source → switch to dashboard → complete auth/form → add widget → render UI
- Additional: multi-dashboard CRUD, integration CRUD, sources CRUD/rerun, source data update and sync, core step type failed status + auto-rewind

**Notes:** User clarified that the critical path covers the full integration lifecycle, and additional cases cover the main feature interaction paths.

---

## Harness Architecture

| Option | Description | Selected |
|--------|-------------|----------|
| Node.js SDK | Midscene JS SDK alongside Playwright — unified reporting, easier CI | ✓ |
| Python SDK | Midscene Python SDK alongside Pytest — benefits from existing fixtures but no browser visual coverage | |
| Standalone CLI | Decoupled but harder to integrate with test reports and CI | |

**User's choice:** Node.js SDK alongside existing Playwright E2E infrastructure

**Notes:** Natural fit given existing frontend React + Playwright stack.

---

## Mock Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Tauri invoke APIs only | Mock @tauri-apps/api/core invoke — AI drives UI through real browser, backend stays via mocked Tauri commands | |
| External services too | Mock both Tauri APIs AND external HTTP calls — deterministic but complex | |
| Human-in-the-loop simulation | AI triggers real UI interactions but suspends at key decision points | |
| Minimal mocking — let AI handle it all | AI drives real browser with real services — slowest but most realistic | |

**User's clarification (free text):**
需要 MOCK 的是第三方的外部服务，比方说多种 OAuth 认证服务，所需的 API 接口。对于 SQL 连接的测试，则需要用到模拟的数据库，或者先使用开源的（目前我在本地配置中有几个相关的数据库公开链接，以及本地 SQLite 的文件，正好就是这个项目的存储文件，可以复用这套逻辑）。然后模拟的用来抓取的网站/网页。将这些内容准备好以后，这几个外部数据源的，包括 URL 和连接方式等，作为测试用的 integration YAML 配置参考。就目前而言，可以直接生成测试用的 YAML 配置，在进行 mid-scene 测试时直接作为参考的测试用配置，让 AI 复制并在应用中自主创建。

**Notes:** External services (OAuth, APIs), databases (open source DB URLs + local SQLite复用项目存储), web scraping (simulated websites) — all pre-defined as test integration YAML configs.

---

## YAML Config Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| 预先定义 + AI 复制 | 提前准备多个测试用 YAML 文件，测试时 AI 读取配置、复制到应用中创建真实的 source/integration — 最可控、最快 | ✓ |
| 动态生成 | 测试时由 AI 根据测试场景动态拼接 YAML — 最灵活但运行较慢 | |
| 混合策略 | 简单场景预定义，复杂场景动态生成 | |

**User's choice:** 预先定义 + AI 复制

---

## Claude's Discretion

- Midscene AI 驱动时的超时策略和重试配置
- 具体 Mock 网站内容的实现细节
- 测试报告格式与现有 CI 的集成方式

## Deferred Ideas

None — discussion stayed within phase scope.
