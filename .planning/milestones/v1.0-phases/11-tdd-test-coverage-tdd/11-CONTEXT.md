# Phase 11: 测试覆盖与 TDD 规范确立 (Test Coverage & TDD) - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段仅聚焦于为 v1.0 建立可持续的测试与 TDD 基线：明确 TDD 运行规范，补齐后端核心流程与前端核心能力的测试覆盖，并设置可执行的质量门禁。  
不新增产品能力，不扩展业务范围；完整 E2E 流程矩阵与发版级 CI/CD 完善属于后续阶段。

</domain>

<decisions>
## Implementation Decisions

### 发布阻断覆盖范围（Release-blocking Scope）
- 采用“后端核心流程 + API 关键路由”的覆盖边界。
- 必须纳入认证链路测试：`apikey`、`oauth`、`curl`、`webview scraper`。
- 后端关键对象以 Flow/状态机/加密层为主，重点包含：
  - `core/executor.py`
  - `core/source_state.py`
  - `core/encryption.py`
  - `core/api.py` 中高风险认证相关路径（如 `auth-status`）

### TDD 运行规范
- TDD 强制范围：仅后端核心模块强制执行。
- 粒度规则：每个行为变更都先红后绿（先失败测试，再实现）。
- Hotfix 例外：允许先修复，但同次提交必须补齐回归测试。
- 过程证据：不强制提交顺序或额外“先测后改”证明材料，只看结果与门禁。

### 前端测试策略
- `WidgetRenderer` 必测：
  - 类型分发正确性
  - 关键 props/数据映射
  - unknown type 兜底行为
- 微组件必须采用标准化单测（`Vitest + React Testing Library`）。
- `Bento` 布局相关：组件层不过度展开，后端交互相关部分允许 E2E 优先。
- 新增硬性用例：多个卡片按存储的 `x/y/w/h` 排布时不产生重叠。
- 集成管理页测试主链路覆盖：加载 / 选择 / 编辑 / 保存 / 错误处理。

### 质量门禁（Quality Gates）
- 本地最低门禁：仅运行受影响测试（impacted tests）。
- CI 阻断必过项：后端核心测试 + 前端核心测试 + typecheck。
- 覆盖率策略：不设百分比阈值，但关键模块必须有明确且可复现用例。
- E2E 定位：Phase 11 仅做最小冒烟，完整主流程矩阵放到 Phase 13。

### Claude's Discretion
- 测试文件组织、命名与夹具（fixtures/factories）具体方案。
- Mock 深度与分层（单测 vs 集成测试）具体取舍。
- 前端 E2E 工具与最小冒烟用例编排细节（在既定范围内自主决策）。

</decisions>

<specifics>
## Specific Ideas

- 认证链路测试必须覆盖 `apikey / oauth / curl / webview scraper` 四类场景。
- 前端测试焦点不是“页面全量快照”，而是核心行为与关键渲染契约。
- `xywh` 布局不重叠作为 Phase 11 明确验收点之一。

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `tests/verify_interactions.py`：已有执行器交互验证脚本，可作为后端测试迁移起点。
- `core/executor.py`：Flow 步骤执行与异常到 Interaction 的核心逻辑。
- `core/source_state.py`：状态机与交互模型定义。
- `core/encryption.py`：加解密与密钥处理基础函数。
- `ui-react/src/components/widgets/WidgetRenderer.tsx`：微组件分发核心入口。
- `ui-react/src/components/ui/MetricCard.tsx`、`ui-react/src/components/ui/BentoWidget.tsx`：微组件标准化测试重点。
- `ui-react/src/pages/Integrations.tsx`：集成管理列表与编辑器主链路测试入口。
- `ui-react/src/store/index.ts`、`ui-react/src/hooks/useScraper.ts`：前端核心行为链路（状态与抓取队列）。

### Established Patterns
- 当前测试体系未标准化：后端以脚本式验证为主，前端缺统一测试框架。
- 前端技术栈已具备标准化测试条件：React + TypeScript(strict) + Zustand。
- 后端核心逻辑集中在可单元化模块（executor/source_state/encryption/api），适合按风险优先建立回归基线。

### Integration Points
- 规划中需要新增统一测试命令入口（前端/后端）并接入 CI 阻断门禁。
- `core/api.py` 认证相关路由与 `core/executor.py` 运行状态更新是关键联动点。
- `Dashboard` 的 Grid/布局行为与 `WidgetRenderer` 分发结果需通过测试建立稳定契约。

</code_context>

<deferred>
## Deferred Ideas

- 完整 E2E 主流程矩阵（Phase 13）。
- 发版级 CI/CD 全面完善（Phase 13）。

</deferred>

---

*Phase: 11-tdd-test-coverage-tdd*  
*Context gathered: 2026-03-06*
