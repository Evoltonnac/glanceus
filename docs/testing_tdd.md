# Testing & TDD Policy（精简版）

本文件定义当前发布阻断测试门禁。详细失败样例见 [flow/04_step_failure_test_inputs.md](./flow/04_step_failure_test_inputs.md)。

## 1. 必测范围

- 后端核心：`core/executor.py`、`core/source_state.py`、`core/encryption.py`、`core/api.py` 高风险鉴权路径。
- 前端核心：`Vitest + React Testing Library` 覆盖关键交互与状态流。

## 2. 后端 TDD 规则

- 标准流程：RED -> GREEN -> REFACTOR。
- 核心行为改动必须包含可复现 pytest 用例。
- 紧急修复允许先改代码，但同次交付必须补回归测试。

## 3. 阻断命令

| 层级 | 命令 | 用途 |
| --- | --- | --- |
| Backend | `make test-backend` | 后端核心门禁 |
| Backend | `python -m pytest tests -q -k "interaction or auth or encryption"` | 高风险路径回归 |
| Frontend | `make test-frontend` | 前端核心行为门禁 |
| Frontend | `make test-typecheck` | TS 类型门禁 |
| Cross-layer | `make test-impacted` | 变更文件驱动门禁 |

## 4. 测试组织约束

- 复用 `tests/conftest.py` 与 `tests/factories/`。
- 测试必须可重复、无网络依赖、避免时序竞态。
- 阻断路径优先行为断言，避免脆弱快照。
