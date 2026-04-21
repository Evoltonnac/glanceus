# Phase 01: Midscene AI 自动化测试集成 - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

建立项目 Midscene AI 自动化测试 harness，在 Tauri 桌面应用的真实环境中覆盖关键路径和功能交互测试。

</domain>

<decisions>
## Implementation Decisions

### Test Coverage Scope
- **D-01:** Critical path E2E 测试路径：
  1. 创建 integration → 创建 source → 切换到 dashboard 页面 → 完成认证或表单/等待抓取 → 添加 widget 到 dashboard → 渲染正确 UI
- **D-02:** 额外关键功能交互测试用例：
  - 多 dashboard CRUD（创建/读取/更新/删除）
  - Integration CRUD
  - Source CRUD / 重新运行
  - Source 数据更新与同步
  - 核心 step type 失败状态与自动回滚到 forward step

### Harness 架构
- **D-03:** 使用 Midscene Node.js SDK，与现有 Playwright E2E 基础设施共存
- **D-04:** 不引入新的测试运行基础设施，直接扩展现有 `tests/e2e/test_ui.spec.ts` 的 AI 驱动场景

### Mock 策略
- **D-05:** 第三方外部服务 Mock：多种 OAuth 认证服务、所需 API 接口
- **D-06:** 数据库 Mock：使用开源数据库公开链接（本地已有配置）+ 本地 SQLite 文件（复用项目存储逻辑）
- **D-07:** 网页抓取 Mock：模拟网站/网页内容（用于 webview scraping 测试）
- **D-08:** Mock 数据源（URL、连接方式等）作为测试用 integration YAML 配置参考

### YAML 配置策略
- **D-09:** 测试用 Integration YAML 预先定义，测试时由 AI 复制到应用中自主创建
- **D-10:** 预置多个 YAML 配置覆盖不同场景（OAuth 类、SQL 类、webview 抓取类）

### Claude's Discretion
- Midscene AI 驱动时的超时策略和重试配置
- 具体 Mock 网站内容的实现细节
- 测试报告格式与现有 CI 的集成方式

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/PROJECT.md` — 项目定位、核心价值、测试基线
- `.planning/REQUIREMENTS.md` — 需求约束、测试要求
- `.planning/STATE.md` — v1.2 完成状态、pending todos

### Codebase Structure
- `.planning/codebase/TESTING.md` — Vitest/Playwright/Pytest 现有测试框架和模式
- `.planning/codebase/STRUCTURE.md` — 项目目录结构和关键文件位置
- `.planning/codebase/STACK.md` — 技术栈（Node.js, Python, FastAPI, Tauri）

### Existing Test Fixtures
- `tests/conftest.py` — 现有测试 fixtures（InMemoryResourceManager, FakeExecutor, FakeAuthManager 等）
- `tests/smoke/test_phase13_e2e.py` — 现有 E2E smoke test 模式

### Project Facts
- `docs/terminology.md` — 项目术语定义
- `CONFIG.md` — Integration YAML 配置格式参考

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `tests/conftest.py` InMemoryResourceManager, InMemorySecretsController, FakeExecutor, FakeOAuthHandler — 可复用测试夹具逻辑
- `tests/smoke/test_phase13_e2e.py` — 现有 E2E smoke flow 模式（TestClient, API mocking）
- `tests/factories.py` build_source_config — 已有测试工厂函数

### Established Patterns
- Playwright E2E: `tests/e2e/test_ui.spec.ts` 使用 page.route() mock 所有 API 响应
- Pytest smoke: 使用 FastAPI TestClient 端到端测试 API 路由
- Vitest: 组件和 hook 单元测试，co-located 测试文件

### Integration Points
- 新测试入口：`tests/e2e/midscene/` 目录（与现有 `tests/e2e/` 并列）
- Midscene Node.js SDK 集成到 `ui-react/` 前端测试配置
- Tauri invoke mocking 需要在 Playwright 全局 setup 中配置

</code_context>

<specifics>
## Specific Ideas

- 测试 YAML 配置预置在 `config/examples/test-integrations/` 目录下
- AI 在测试时读取 YAML，调用 API 在应用中创建真实 source/integration 资源
- SQL 测试复用本地 SQLite 文件路径（`data/sources.json` 等）作为模拟数据库连接目标
- OAuth Mock 支持多种 Provider（GitHub, Google, 通用 OAuth）

</specifics>

<deferred>
## Deferred Ideas

### Reviewed Todos (not folded)
- midscene-e2e-coverage — AI E2E 测试覆盖（已在 Phase 1 scope 中）
- 暂无其他相关 pending todos

</deferred>

---

*Phase: 01-midscene-ai-harness*
*Context gathered: 2026-04-21*
