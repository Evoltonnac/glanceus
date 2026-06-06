# Midscene AI Testing Guide

Project-specific Midscene testing conventions. For general CLI operations, see [browser-automation Skill](../.agents/skills/browser-automation/SKILL.md).

---

## Fixture Config

File: `midscene.fixture.ts`

Keep the shared fixture deterministic and cost-bounded:

```typescript
export const test = base.extend(
  PlaywrightAiFixture({
    waitForNetworkIdleTimeout: 1000,
    replanningCycleLimit: 5,
    screenshotShrinkFactor: 1,
  }),
);
```

Do not enable shared cache by default for this suite. The E2E environment uses persistent isolated state under `ui-react/tests-e2e-temp/`, so stale AI action cache can hide real UI drift between clean and resumed runs.

---

## Prompt Writing

### Use Structured APIs Instead of Complex Logic

| API | Purpose |
|-----|---------|
| `aiQuery('string[], ...')` | Extract list data |
| `aiBoolean('check if ...')` | Conditional check |
| `aiString('the ...')` | Extract single text |
| `aiNumber('the number of ...')` | Extract number |

```typescript
const recordList = await agent.aiQuery('string[], the record list');
for (const record of recordList) {
  const hasCompleted = await agent.aiBoolean(`check if "${record}" contains "completed"`);
  if (!hasCompleted) await agent.aiTap(record);
}
```

### Similar Buttons Must Explicitly State Differences

**Core: Describe what the AI can "see".**

| Difference Type | How to Describe |
|-----------------|-----------------|
| Text presence | `'the Integration button (has text), not the Dashboard button (no text)'` |
| Position | `'the right toggle in the center tab bar'` |
| Color/style | `'the green active toggle, not the gray inactive one'` |

**Header Slider Toggle (Dashboard / Integration):**

```typescript
// ❌ Bad: Cannot distinguish similar buttons
await agent.aiTap('the Integration button');

// ✅ Good: Explicitly state the difference
await agent.aiTap('the Integration toggle in the center tab bar — it is the right one, it has text "Integration" while Dashboard on the left has no text');
```

### Do Not Use aiWaitFor + aiAssert Together

Both are AI calls with overlapping functionality. `aiAct` + `aiAssert` is sufficient.

---

## Self-Analysis Iteration Workflow

Use this workflow before tuning or deleting Midscene tests. The goal is to make failures explainable before changing test code.

### Loop

1. Start from a deliberately simple user-level prompt for the target path.
2. Run the single target spec or test case and preserve the report, trace, screenshot, and console output paths.
3. Classify the failure from evidence, not from guesses.
4. Apply one conservative test-only fix when the evidence supports it.
5. Re-run the same target.
6. Stop after 2 automatic repair rounds for the same test. If it still fails, write the diagnosis and ask for human input or move to a debug workflow.

### Automatic Repair Boundary

Allowed automatic changes:

- Prompt wording that describes visible UI more precisely.
- Wait/assert wording when the expected UI state is correct but the AI waited for or asserted the wrong thing.
- Splitting a large scenario into clearer steps.
- Removing or merging redundant test steps that cover the same risk.

Requires human confirmation or a separate debug workflow:

- Product code changes.
- Business meaning changes in mocks or fixture data.
- Changes to the expected user flow.
- Suspected product bugs.
- Mock semantics that create an unrealistic state or contradict the test narrative.
- Buttons or interactions that cannot be reliably driven from functional text alone and need precise human visual instructions.

### Failure Classification

Use this order:

| Category | Evidence | Action |
|----------|----------|--------|
| Environment/setup failure | App does not start, backend health fails, port conflict, missing dependency, missing Midscene/API env, auth server unavailable | Stop automatic repair; fix environment or ask for setup input |
| Product suspected bug | Trace or screenshot shows the UI state violates the intended behavior; expected button/page is truly absent; business API/state machine returns the wrong state | Stop automatic repair; open a debug task with evidence |
| Mock semantics problem | Mock data contradicts the scenario, makes the UI impossible, or hides the real business behavior being tested | Stop automatic repair; ask for mock expectation confirmation |
| Human visual-spec needed | The control is icon-only, visually ambiguous, or hard to locate without precise position/shape/state guidance | Ask the human for exact visual wording, then encode that wording in the prompt template |
| Prompt/test description problem | Screenshot shows the correct target is visible and the app is in the expected state, but Midscene clicked, waited, or asserted the wrong element/state | Apply one conservative prompt/wait/assert fix and re-run |

### Iteration Record

For each repair round, keep a short record in the test report, PR notes, or working log:

```markdown
- Target: ui-react/tests/e2e/midscene/<spec>.ts::<test name>
- Run command:
- Attempt: 1/2 or 2/2
- Failure summary:
- Evidence: report/trace/screenshot paths
- Classification: environment | product-bug | mock-semantics | human-visual-spec | prompt-description
- Change made:
- Next action:
```

### Test Retention Strategy

Keep:

- One full functional smoke path that proves the app can complete the core user journey end to end.
- Important branches or boundaries that the smoke path cannot cover.

Remove or merge:

- Repeated CRUD steps that validate the same interaction risk.
- Tests that only repeat navigation already covered by `smoke-navigation.spec.ts`.
- Broad scenarios whose failures cannot be attributed to one user path.

Recommended tuning order:

1. Keep `smoke-navigation.spec.ts` as the baseline style reference.
2. Tune the full critical path next.
3. Tune only branch/boundary CRUD or failure-state specs that add coverage not already proven by the full path.
4. Delete or merge redundant specs after the retained path and branch coverage are stable.

---


### Only Mock Infrastructure APIs

Allowed: health checks, monitoring metrics, OAuth/SAML auth flows, and deterministic local third-party APIs that exercise integration execution without external accounts.

Forbidden: mocking Glanceus business APIs.

### Mock Data Must Match Page State

AI gets confused when what it sees differs from expectations.

---

## Known Limitations

| Limitation | Workaround |
|------------|------------|
| No multi-tab support | Split into separate tests, or use `page.bringToFront()` |
| Small elements are hard to locate | Use `aiWaitFor` first to ensure visibility |
| Elements outside viewport | Scroll first: `aiAct('scroll down')` |
| Cannot handle complex conditional logic | Use structured APIs + JS loops |

For general troubleshooting, see [Skill Troubleshooting](../.agents/skills/browser-automation/SKILL.md#troubleshooting).

---

## Project-Specific Conventions

### UI Component Descriptions

| UI Pattern | How to Describe |
|------------|-----------------|
| Sidebar nav link | Quoted full text: `'click the "Integrations" link in the sidebar'` |
| Button | Color (if applicable) + text: `'click the green "New Integration" button'` |
| Form input | Label or placeholder: `'fill in the integration name field'` |
| Card list item | Index or feature: `'click the first source card'` |
| Modal/dialog | Wait until visible: `'click "Confirm" in the confirmation dialog'` |
| Toast | Use `aiWaitFor`: `await agent.aiWaitFor('the success toast disappears')` |

### Icon-Only Buttons and Tabs

Many UI elements in this project are **icon-only** (no visible text label). This creates a challenge for AI-driven tests because:

- Two visually similar icons (e.g., `Blocks` vs `LayoutDashboard`) may be hard to distinguish by shape alone.
- The active tab shows a text label; the inactive tab shows only the icon with `sr-only` text.
- Hovering or focusing an icon-only button may reveal a tooltip.

**Strategies (in order of preference):**

1. **Use tooltip text** — Hovering the element shows a tooltip with the action name. Reference the tooltip text: `'click the settings button (shows tooltip "Settings" on hover)'`.

2. **Describe the active vs inactive state** — For nav tabs, the active tab has visible text while the inactive tab does not: `'click the Integrations tab — it has visible text, while the Dashboard tab next to it shows no text'` or `'click the right-side pill in the center nav — it has the text "Integrations" visible'`.

3. **Describe the icon's visual metaphor** — Describe what the icon depicts:
   - `Blocks` (Integrations): a grid of small squares
   - `LayoutDashboard` (Dashboard): a dashboard with bars/chart columns
   - `Settings` (gear): a standard gear/cog wheel
   - `ChevronLeft`: a left-pointing angle bracket (`<`)

4. **Describe position + interaction style** — Icon-only buttons often appear in predictable positions:
   - Header right side: Settings gear (`Settings` icon, top-right)
   - Center nav pill: Dashboard (`LayoutDashboard`) left, Integrations (`Blocks`) right
   - Page top-left: back button (`ChevronLeft`)

5. **Chain `aiWaitFor` before `aiAct`** — When unsure, wait for the element to be visible or hover to ensure the correct element is active: `await agent.aiWaitFor('the settings gear icon is visible in the header')` before clicking.

6. **Describe button shape vs nav pill shape** — Settings button is circular; nav tabs are pill/rounded-rectangle shaped: `'click the circular gear button in the top-right, not the pill-shaped nav tab'`.

**Forbidden descriptions and alternatives:**

| Forbidden | Better Alternative |
|-----------|--------------------|
| `'click the button'` | `'click the button with a gear icon in the top-right header'` |
| `'click the integrations tab'` | `'click the right tab in the center nav pill — it has visible text "Integrations", while the left tab has no text'` |
| `'click the back button'` | `'click the left-pointing chevron button in the top-left of the Settings page header'` |
| `'click the icon'` | `'hover to see the tooltip, then describe by that label — e.g., "the button with tooltip \"Settings\""'` |
| `'click the settings button'` | `'click the circular gear icon button in the top-right corner — it is circular, not the pill-shaped nav tabs'` |

### Fixed-Position UI Elements

For elements with **fixed positions** in the page layout, describe them by their structural location combined with visual characteristics:

| Element Type | Description Strategy |
|-------------|---------------------|
| Top navigation | `'the top navigation bar'` or `'the header area'` + icon/tooltip |
| Center nav pill | `'the center navigation pill'` + active/inactive state |
| Top-right actions | `'the button in the top-right area of the header'` |
| Sidebar | `'the sidebar on the left'` or `'the file list in the sidebar'` |
| Bottom section | `'the section at the bottom of the page'` |
| Modal dialog | `'the dialog/modal'` + position context if helpful |

**Key visual distinctions:**
- Settings gear button: **circular** button (not pill-shaped)
- Nav tabs: **pill/rounded-rectangle** shaped, grouped together in a container
- Action buttons: may have **plus icons** for create actions

### Plus Icon Buttons (New / Add actions)

Many "create" actions use a **plus icon button** in the page header top-right area:

| Action | Prompt Template |
|--------|----------------|
| New Dashboard | `click the "New Dashboard" button — it has the text "New Dashboard", usually found in the top-right area of the page header` |
| New Integration | `click the "New Integration" button with a plus icon, in the top-right area of the Integrations page header` |
| New Source | `click the "New Source" button — it has a plus icon and is typically located at the top of the sources list page` |
| Add Widget | `click the "Add Widget" button with a plus icon, located in the top-right area of the Dashboard page header` |
| Add Source | `click the "Add Source" button with a plus icon in the integration detail header` |

### Card-Level Actions (edit, delete, sync)

CRUD operations on cards use icon buttons with tooltips:

| Action | Prompt Template |
|--------|----------------|
| Edit card | `click the pencil icon on the first [card type] card to edit it — the tooltip shows "Edit" on hover` |
| Delete card | `click the trash icon on the first [card type] card to delete it — the tooltip shows "Delete" on hover` |
| Sync/Refresh | `click the sync/refresh button with a circular arrow icon on the first source card — the tooltip shows "Sync" or "Refresh" on hover` |
| Retry | `click the retry button with a circular arrow icon — tooltip shows "Retry" or "Rerun" on hover` |

### Card Navigation (clicking cards for details)

Some cards are clickable to open a detail view:

| Action | Prompt Template |
|--------|----------------|
| Open integration detail | `click on the first integration card in the list` |
| Open source detail | `click the source card with name "[SourceName]" to view its details` |

### Confirmation Dialogs

Always name the action button explicitly:

```
click "Confirm" in the confirmation dialog to proceed with deletion
click the "Delete" button in the confirmation dialog to confirm the deletion
```

### OAuth/Integration Type Selection

When selecting from a list of integration types or presets:

```
in the integration type list, click the option with a GitHub icon or "GitHub" label to select the GitHub OAuth preset
```

### Known Issues

| Issue | Solution |
|-------|----------|
| Header Dashboard/Integration toggle buttons look similar, AI clicks wrong one | Use active-tab-has-text strategy or describe icon visual metaphor |
| Settings page has no logo clickable — only a ChevronLeft back button | Click the chevron, not the logo |
