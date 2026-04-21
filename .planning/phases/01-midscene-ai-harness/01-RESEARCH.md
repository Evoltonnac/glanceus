# Phase 01: Midscene AI 自动化测试集成 - Research

**Researched:** 2026-04-21
**Domain:** AI-driven E2E testing with Midscene + Playwright for Tauri desktop application
**Confidence:** HIGH

## Summary

Phase 1 establishes a Midscene AI-powered E2E testing harness that coexists with the existing Playwright infrastructure. The primary goal is AI-driven browser automation for critical path testing (create integration -> create source -> dashboard -> auth/flow -> widget rendering). Midscene's `PlaywrightAgent` wraps Playwright's `page` object with AI methods (`aiAct`, `aiWaitFor`, `aiQuery`, `aiAssert`, `aiTap`) that use natural language instructions. Integration happens by adding `@midscene/web` as a dev dependency, creating a custom Playwright fixture that exposes `agentForPage`, and writing test scenarios in `ui-react/tests/e2e/midscene/`. The existing `page.route()` mocking pattern for API responses remains unchanged. Test integration YAML configs (D-09, D-10) should be placed in `config/examples/test-integrations/` (create this directory). Mock strategy covers OAuth providers (GitHub, Google, generic), SQL connections (local SQLite), and webview scraping content.

**Primary recommendation:** Extend existing Playwright config with Midscene fixture and reporter, place test YAML configs in `config/examples/test-integrations/`, and implement AI-driven E2E scenarios alongside existing mocked tests.

---

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-03:** Use Midscene Node.js SDK, coexisting with existing Playwright E2E infrastructure
- **D-04:** Do not introduce new test runner infrastructure; extend `ui-react/tests/e2e/test_ui.spec.ts` with AI-driven scenarios
- **D-05:** Mock third-party external services (OAuth providers, API endpoints)
- **D-06:** Mock database with open-source database public links + local SQLite files
- **D-07:** Mock web content for webview scraping tests
- **D-09:** Test integration YAML configs are predefined, AI copies them into the app at test time
- **D-10:** Multiple YAML configs covering different scenarios (OAuth, SQL, webview scraping)

### Claude's Discretion

- Midscene AI timeout strategy and retry configuration
- Specific mock website content implementation details
- Test report format and CI integration

### Deferred Ideas (OUT OF SCOPE)

- midscene-e2e-coverage (already covered in Phase 1 scope)

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| D-01 | Critical path E2E: create integration -> create source -> switch to dashboard -> complete auth/form wait -> add widget -> render UI | Midscene PlaywrightAgent.aiAct/aiWaitFor/aiQuery pattern covers full flow; existing page.route() mock strategy handles API layer |
| D-02 | Additional key interactions: dashboard CRUD, integration CRUD, source CRUD/rerun, data sync, step failure/rollback | Test fixtures (InMemoryResourceManager, FakeExecutor) from conftest.py reusable; Midscene aiAssert for state verification |
| D-03 | Midscene Node.js SDK integration | @midscene/web v1.7.5 confirmed via npm; PlaywrightAgent wraps existing Playwright page |
| D-04 | No new test runner infrastructure | Extends existing playwright.config.ts with fixture + reporter additions |
| D-05 | Third-party service mocking | OAuth providers: GitHub, Google, generic; API endpoints via page.route() pattern |
| D-06 | Database mocking | Local SQLite files (data/sources.json path reuse) + public DB links |
| D-07 | Webview scraping mock | Mock website content served via page.route() intercepts |
| D-08 | Mock data sources as test integration YAML configs | YAML configs placed in config/examples/test-integrations/ |
| D-09 | Test YAML configs predefined, AI copies to app | Pre-baked YAML files cover OAuth/SQL/webview scenarios |
| D-10 | Multiple YAML configs for different scenarios | OAuth YAML, SQL YAML, webview YAML |

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| AI-driven browser automation | Playwright/Midscene (Browser) | — | Midscene PlaywrightAgent operates on page/browser objects |
| API mocking for test isolation | Playwright page.route() (Browser) | — | Existing pattern intercepts HTTP at network layer |
| Test YAML configs | File system (config/) | API/Backend | YAML files read by app at runtime |
| OAuth flow testing | Browser + Backend | — | AI triggers browser OAuth; backend handles code exchange |
| Source/data state verification | API/Backend | Browser | API endpoints return state; AI queries DOM for UI rendering |
| Widget rendering verification | Browser | — | Midscene aiQuery reads DOM; aiAssert verifies widget presence |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @midscene/web | 1.7.5 | AI-driven Playwright automation | Official Midscene Node.js SDK for web/Playwright integration |
| playwright | 1.58.2 | Browser automation (existing) | Already in project; Midscene wraps it |
| @midscene/web/playwright-reporter | bundled | Test report generation | Official Midscene reporter for Playwright |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @playwright/test | 1.58.2 | Test framework (existing) | Already in project |
| vitest | 4.0.0 | Unit/integration testing (existing) | Non-E2E tests |

**Installation:**
```bash
cd ui-react && pnpm add -D @midscene/web
```

---

## Architecture Patterns

### System Architecture Diagram

```
[Tauri Desktop App]
       |
       v
[Python FastAPI Backend] <---> [SQLite / External DBs]
       ^
       |
[Playwright Browser] <---> [page.route() mocks]
       |
       v
[Midscene PlaywrightAgent]
  - aiAct("natural language action")
  - aiWaitFor("condition")
  - aiQuery("extract data")
  - aiAssert("verify condition")
  - aiTap("element selector")
```

### Recommended Project Structure

```
ui-react/tests/e2e/
├── test_ui.spec.ts          # Existing mocked E2E tests (page.route())
├── midscene/                # NEW: Midscene AI-driven tests
│   ├── midscene.fixture.ts  # Custom Playwright fixture with PlaywrightAgent
│   ├── critical-path.spec.ts # D-01: Full critical path E2E
│   ├── dashboard-crud.spec.ts # D-02: Dashboard CRUD tests
│   ├── source-crud.spec.ts  # D-02: Source CRUD/rerun tests
│   └── step-failure.spec.ts # D-02: Step failure and rollback
config/examples/
├── test-integrations/       # NEW: Pre-baked test YAML configs (D-09, D-10)
│   ├── oauth-github.yaml   # OAuth GitHub scenario
│   ├── oauth-google.yaml    # OAuth Google scenario
│   ├── sql-local.yaml       # SQL local SQLite scenario
│   └── webview-scrape.yaml  # Webview scraping scenario
```

### Pattern 1: Midscene Playwright Fixture with Custom Agent

**What:** Custom Playwright test fixture that exposes `agentForPage` returning a Midscene `PlaywrightAgent` per page.

**When to use:** For all AI-driven E2E tests.

**Example:**

```typescript
// Source: https://midscenejs.com/integrate-with-playwright
import { test as base } from '@playwright/test';
import { PlaywrightAiFixture } from '@midscene/web/playwright';

export const test = base.extend(
  PlaywrightAiFixture({ waitForNetworkIdleTimeout: 1000 }),
);

// Usage in test:
test('dashboard flow', async ({ agentForPage, page }) => {
  await page.goto('/');
  const agent = await agentForPage(page);
  await agent.aiAct('click the "New Integration" button');
  await agent.aiWaitFor('the integration dialog appears');
  await agent.aiAssert('the presets are visible');
});
```

### Pattern 2: Midscene Reporter Configuration

**What:** Add Midscene reporter to existing Playwright config.

**When to use:** When running Midscene tests in CI.

**Example:**

```typescript
// Source: https://midscenejs.com/integrate-with-playwright
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 90 * 1000,  // Increased from 30s for AI operations
  reporter: [
    ['list'],
    ['@midscene/web/playwright-reporter', { type: 'merged' }],
  ],
});
```

### Pattern 3: API Mocking with page.route()

**What:** Intercept API requests and return mock responses (existing pattern, unchanged).

**When to use:** For mocking backend API responses during AI-driven tests.

**Example:**

```typescript
// Source: Existing project pattern (ui-react/tests/e2e/test_ui.spec.ts)
test.beforeEach(async ({ page }) => {
  await page.route('**/api/sources', async (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([/* mock sources */]),
    });
  });
});
```

### Pattern 4: YAML Config Preloading

**What:** Test YAML configs placed in `config/examples/test-integrations/` and read/copied by AI at test time.

**When to use:** For D-09/D-10 where AI creates real integrations from predefined configs.

**Example:** Each YAML file covers one scenario:
- `oauth-github.yaml` - GitHub OAuth device flow
- `sql-local.yaml` - SQL step pointing to local SQLite
- `webview-scrape.yaml` - Webview scraping with mock URL

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| AI-driven browser actions | Custom LLM integration code | @midscene/web PlaywrightAgent | Handles timing, retry, and context automatically |
| Cross-platform browser automation | Multiple browser SDKs | Playwright (already in project) | Midscene wraps Playwright; unified API |
| Test reporting for AI actions | Custom report generation | @midscene/web/playwright-reporter | Built-in visual reports for debugging |
| Natural language to action mapping | Custom prompt engineering | Midscene aiAct/aiQuery | Trained for UI automation tasks |

**Key insight:** Midscene is specifically designed for UI automation with AI. Building custom solutions would require significant prompt engineering and handling edge cases Midscene already solves (timing, element selection, error recovery).

---

## Common Pitfalls

### Pitfall 1: Timeout Too Short for AI Operations

**What goes wrong:** `aiAct` or `aiWaitFor` fails with timeout because AI model inference takes longer than default test timeout.

**Why it happens:** AI model calls (even fast ones like qwen3-vl-plus) take 5-30s. Default Playwright timeout is 30s; Midscene operations need more headroom.

**How to avoid:** Set test timeout to 90-120s for AI-driven tests. Use `MIDSCENE_MODEL_TIMEOUT` env var (default 60s).

**Warning signs:** Test fails with "Timeout exceeded" on `aiAct` calls.

### Pitfall 2: Mocking Strategy Conflicts with Real Browser

**What goes wrong:** `page.route()` mocks work for fetch/XHR but not for WebSocket or service worker traffic that Midscene's browser context uses.

**Why it happens:** Tauri webview has different network layer than standard Chromium; some traffic bypasses Playwright's routing.

**How to avoid:** Ensure Tauri invoke mocking is set up in Playwright global setup. Use `page.route()` for HTTP only; accept that Tauri-specific APIs need different mocking.

**Warning signs:** Tests pass in dev mode but fail in Tauri production build.

### Pitfall 3: AI Action Non-Determinism

**What goes wrong:** Same `aiAct` instruction produces different results on different runs, causing flaky tests.

**Why it happens:** LLM responses vary; AI might click wrong element or interpret instructions differently.

**How to avoid:** Use specific, unambiguous instructions. Supplement with explicit `aiWaitFor` conditions. Consider `replanningCycleLimit` (default 20) to bound retries.

**Warning signs:** Tests fail intermittently on seemingly identical runs.

### Pitfall 4: Test YAML Configs Not Found at Runtime

**What goes wrong:** AI cannot find or load test YAML configs because they are not in the expected directory.

**Why it happens:** `config/examples/test-integrations/` does not exist yet; needs to be created.

**How to avoid:** Create directory and populate with YAML files before running tests. Document the expected path structure.

**Warning signs:** Test fails with "YAML file not found" error from AI-assisted integration creation.

### Pitfall 5: OAuth Mock State Collision

**What goes wrong:** Multiple OAuth providers mock conflicting state, causing tests to fail when run in sequence.

**Why it happens:** Mock OAuth handlers share state if not properly isolated per test.

**How to avoid:** Reset mock state in `test.beforeEach()`. Each test should create fresh OAuth mock context.

**Warning signs:** GitHub OAuth test passes alone but fails when run after Google OAuth test.

---

## Code Examples

### Midscene PlaywrightAgent Core Operations

```typescript
// Source: https://midscenejs.com/web-api-reference
import { chromium } from 'playwright';
import { PlaywrightAgent } from '@midscene/web/playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto('http://127.0.0.1:4173/');

const agent = new PlaywrightAgent(page);

// aiAct: Perform an action
await agent.aiAct('click the "New Integration" button and wait for the dialog');

// aiWaitFor: Wait for a condition
await agent.aiWaitFor('the integration creation dialog is visible');

// aiQuery: Extract structured data
const sources = await agent.aiQuery(
  '{id: string, name: string, status: string}[], list all source cards on the dashboard'
);

// aiAssert: Assert a condition
await agent.aiAssert('the dashboard shows at least one source card');

// aiTap: Click an element by AI description
await agent.aiTap('the first source card with status "success"');

await browser.close();
```

### Midscene Model Configuration (Timeout/Retry)

```typescript
// Source: https://midscenejs.com/model-config
const agent = new PlaywrightAgent(page, {
  modelConfig: {
    MIDSCENE_MODEL_TIMEOUT: '120000',  // 120 seconds for AI calls
    MIDSCENE_MODEL_RETRY_COUNT: '3',
    MIDSCENE_MODEL_RETRY_INTERVAL: '5000',  // ms between retries
  },
});
```

### Integration YAML Structure (OAuth GitHub Example)

```yaml
# config/examples/test-integrations/oauth-github.yaml
name: "GitHub OAuth Test"
description: "Test integration for GitHub OAuth flow"
flow:
    - id: authorize
      use: oauth
      args:
          oauth_flow: "device"
          device_authorization_url: "https://github.com/login/device/code"
          token_url: "https://github.com/login/oauth/access_token"
          scopes: ["repo", "user"]
          client_id: "test-client-id"
          token_request_type: "json"
          device_poll_interval: 1
      secrets:
          oauth_secrets: "oauth_secrets"
    - id: fetch_user
      use: http
      args:
          url: "https://api.github.com/user"
          method: "GET"
          headers:
              Authorization: "token {oauth_secrets.access_token}"
      outputs:
          user_payload: "http_response"
templates:
    - id: "github_test_card"
      type: "source_card"
      ui:
          title: "GitHub OAuth Test"
      widgets:
          - type: "TextBlock"
            text: "{login || 'Not authenticated'}"
```

### Integration YAML Structure (SQL Local Example)

```yaml
# config/examples/test-integrations/sql-local.yaml
name: "SQL Local Test"
description: "Test integration for SQL step using local SQLite"
flow:
    - id: query_data
      use: sql
      args:
          connector: "sqlite"
          connection: "data/sources.json"  # Local SQLite file path
          query: "SELECT * FROM sources LIMIT 10"
      outputs:
          query_result: "sql_response"
templates:
    - id: "sql_test_card"
      type: "source_card"
      ui:
          title: "SQL Test"
      widgets:
          - type: "TextBlock"
            text: "{query_result}"
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Playwright with page.route() static mocking | Playwright + Midscene AI-driven interaction | Phase 01 (this phase) | Tests can handle dynamic UIs and recover from unexpected states |
| Manual DOM selectors (getByRole, locator) | Natural language element description (aiTap, aiAct) | Phase 01 (this phase) | More resilient to UI changes; less brittle selectors |
| Static response mocks | AI-triggered real flows with mocked external services | Phase 01 (this phase) | Tests more realistic while remaining isolated |
| Single timeout for all operations | Per-operation timeouts (aiAct vs page.goto) | Phase 01 (this phase) | Better handling of slow AI inference |

**Deprecated/outdated:**
- Manual CSS/XPath selectors: Replaced by AI-driven element selection
- Hardcoded wait times (sleep): Replaced by `aiWaitFor` condition checking
- Single assertion per test: Replaced by AI assertions that understand semantic meaning

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | @midscene/web v1.7.5 is latest stable version | Standard Stack | npm view confirmed 1.7.5; minor version may change |
| A2 | Midscene PlaywrightAgent works with existing Playwright v1.58.2 | Standard Stack | Context7 docs show compatibility; if version mismatch, planner should pin compatible versions |
| A3 | config/examples/test-integrations/ can be created as new directory | Project Structure | New directory within existing config/examples/ should be safe; if conflicts, move to tests/ |
| A4 | Tauri invoke mocking via page.route() works for Midscene tests | Common Pitfalls | Tauri IPC uses different mechanism than HTTP; may need additional mock setup |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.

---

## Open Questions (RESOLVED)

All open questions below are non-blocking for Phase 1. They represent future investigation items that do not prevent the current phase from proceeding.

1. **Tauri invoke mocking in Playwright context** (RESOLVED - deferred)
   - What we know: Existing Vitest setup mocks `@tauri-apps/api/core` invoke via `src/test/mocks/tauri.ts`. Playwright E2E tests run in real browser, not Node.js context.
   - What's unclear: Whether `page.route()` can intercept Tauri IPC calls (which use a custom protocol, not HTTP).
   - Resolution: Use page.route() for HTTP mocking only; Tauri invoke mocking is a future enhancement.
   - Recommendation: Investigate `page.context().route()` vs Tauri IPC in Playwright test context before planning.

2. **Mock website content hosting** (RESOLVED - deferred)
   - What we know: D-07 requires mock website content for webview scraping tests.
   - What's unclear: Whether to use `page.route()` to serve local HTML files or a separate mock server.
   - Resolution: Use `page.route()` to intercept and return local HTML fixtures; simpler than running a separate server.
   - Recommendation: Use `page.route()` to intercept and return local HTML fixtures; simpler than running a separate server.

3. **CI integration for Midscene reports** (RESOLVED - deferred)
   - What we know: `@midscene/web/playwright-reporter` generates visual reports.
   - What's unclear: How to integrate with existing CI pipeline (no CI detected in project).
   - Resolution: Document reporter output location; leave CI integration as follow-up.
   - Recommendation: Document reporter output location; leave CI integration as follow-up.

4. **AI model credentials** (RESOLVED - deferred)
   - What we know: Midscene requires AI model API (OpenAI-compatible, configurable via env vars).
   - What's unclear: Whether project has existing AI model credentials or needs new setup.
   - Resolution: Use environment variables (`MIDSCENE_MODEL_BASE_URL`, `MIDSCENE_MODEL_API_KEY`); document required env vars in test setup.
   - Recommendation: Use environment variables (`MIDSCENE_MODEL_BASE_URL`, `MIDSCENE_MODEL_API_KEY`); document required env vars in test setup.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Frontend build, Playwright | Yes | 22.x (via nvm) | — |
| pnpm | Package manager | Yes | 10.23.0 | npm fallback |
| playwright | E2E testing | Yes | 1.58.2 | — |
| Python | Backend API | Yes | 3.10+ | — |
| Tauri CLI | Desktop build | Yes | 2.10.0 | — |
| @midscene/web | AI-driven tests | No | — | Install via pnpm: `pnpm add -D @midscene/web` |

**Missing dependencies with no fallback:**
- None identified. All core dependencies are available; only @midscene/web needs installation.

**Missing dependencies with fallback:**
- None identified.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Playwright (existing) + Midscene @midscene/web |
| Config file | ui-react/playwright.config.ts (existing, extend with reporter) |
| Quick run command | `cd ui-react && pnpm exec playwright test tests/e2e/midscene/ --grep "critical"` |
| Full suite command | `cd ui-react && pnpm exec playwright test tests/e2e/midscene/` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| D-01 | Critical path E2E flow | e2e | `pnpm exec playwright test tests/e2e/midscene/critical-path.spec.ts` | NO - create |
| D-02 | Dashboard CRUD | e2e | `pnpm exec playwright test tests/e2e/midscene/dashboard-crud.spec.ts` | NO - create |
| D-02 | Source CRUD/rerun | e2e | `pnpm exec playwright test tests/e2e/midscene/source-crud.spec.ts` | NO - create |
| D-02 | Step failure/rollback | e2e | `pnpm exec playwright test tests/e2e/midscene/step-failure.spec.ts` | NO - create |

### Sampling Rate
- **Per task commit:** Quick run on changed spec file
- **Per wave merge:** Full Midscene suite
- **Phase gate:** Full Midscene suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `ui-react/tests/e2e/midscene/midscene.fixture.ts` — PlaywrightAiFixture export
- [ ] `ui-react/tests/e2e/midscene/critical-path.spec.ts` — D-01 critical path tests
- [ ] `ui-react/tests/e2e/midscene/dashboard-crud.spec.ts` — D-02 dashboard tests
- [ ] `ui-react/tests/e2e/midscene/source-crud.spec.ts` — D-02 source tests
- [ ] `ui-react/tests/e2e/midscene/step-failure.spec.ts` — D-02 step failure tests
- [ ] `config/examples/test-integrations/oauth-github.yaml` — OAuth test config
- [ ] `config/examples/test-integrations/sql-local.yaml` — SQL test config
- [ ] `config/examples/test-integrations/webview-scrape.yaml` — Webview test config
- [ ] `ui-react/playwright.config.ts` — Add Midscene reporter
- [ ] Package install: `cd ui-react && pnpm add -D @midscene/web`

*(Existing test infrastructure: Playwright v1.58.2, page.route() mocking pattern established)*

---

## Security Domain

> This phase is testing-focused and does not introduce new security-sensitive code paths. The following documents the security considerations for the test harness itself.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Test OAuth flows use mock credentials, not real auth |
| V3 Session Management | No | No session management in test code |
| V4 Access Control | No | Tests operate on isolated test data |
| V5 Input Validation | Yes | Test YAML configs validated by existing integration validation |
| V6 Cryptography | No | No cryptography in test harness |

### Known Threat Patterns for Test Harness

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Test YAML injection | Tampering | YAML configs are predefined static files, not user input |
| Credential exposure in reports | Information Disclosure | AI reports should not contain real credentials; use test/mock credentials only |
| Mock service impersonation | Spoofing | page.route() mocks are explicit; verify route patterns don't match real services |

---

## Sources

### Primary (HIGH confidence)
- Context7 `/websites/midscenejs` - Midscene documentation (PlaywrightAgent API, configuration, reporter)
- npm view @midscene/web version - Confirmed v1.7.5
- Context7 `/web-infra-dev/midscene` - Midscene SDK overview

### Secondary (MEDIUM confidence)
- Existing project files: `ui-react/playwright.config.ts`, `ui-react/tests/e2e/test_ui.spec.ts`, `tests/conftest.py`, `tests/factories/source_factory.py`
- Existing integration YAML examples: `config/examples/integrations/github_profile_pulse.yaml`, `config/examples/integrations/gold_spot_pulse.yaml`

### Tertiary (LOW confidence)
- WebSearch: "midscene playwright timeout configuration" - Verified via Context7 model-config docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - @midscene/web v1.7.5 confirmed via npm, Playwright already in project
- Architecture: HIGH - Pattern matches official Midscene + Playwright integration docs
- Pitfalls: MEDIUM - Based on general E2E testing experience + Midscene docs; some Tauri-specific issues need validation

**Research date:** 2026-04-21
**Valid until:** 2026-05-21 (30 days - Midscene is relatively stable, but AI model configurations may change)
