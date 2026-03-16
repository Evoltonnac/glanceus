# Frontend Engineering Guide

Canonical frontend rules for `ui-react/`.

## Scope

- React UI implementation in `ui-react/src/`
- Data fetching and cache invalidation patterns
- Reliability rules for effects and runtime behavior

## Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- SWR
- Tauri v2 bridge

## Canonical Sources

- SDUI architecture: [`../sdui/01_architecture_and_guidelines.md`](../sdui/01_architecture_and_guidelines.md)
- Component taxonomy: [`../sdui/02_component_map_and_categories.md`](../sdui/02_component_map_and_categories.md)
- Template expression rules: [`../sdui/03_template_expression_spec.md`](../sdui/03_template_expression_spec.md)
- UI principles: [`../ui_design_guidelines.md`](../ui_design_guidelines.md)
- AI engineering contract: [`../../AGENTS.md`](../../AGENTS.md)

## Data Fetching Standard

Use hooks from `ui-react/src/hooks/useSWR.ts` first.

Available hooks:

- `useSources()`
- `useSourceData(sourceId)`
- `useViews()`
- `useSettings()`
- `useIntegrationFiles()`
- `useIntegrationPresets()`
- `useIntegrationMetadata()`
- `useIntegrationFile(filename)`
- `useIntegrationSources(filename)`

Cache helpers:

- `invalidateSources()`
- `invalidateViews()`
- `invalidateSettings()`
- `invalidateIntegrationFiles()`
- `optimisticUpdateSources(...)`
- `optimisticRemoveSource(sourceId)`
- `optimisticUpdateSourceStatus(sourceId, status)`

## Effect Safety and StrictMode

React 18 StrictMode re-runs effects in development.

Rules:

- Always add cleanup for side effects.
- Guard one-time effects with a ref.
- Keep request/retry logic idempotent.

```tsx
const initializedRef = useRef(false);

useEffect(() => {
  if (initializedRef.current) return;
  initializedRef.current = true;

  // one-time side effect

  return () => {
    initializedRef.current = false;
  };
}, []);
```

## API Client Notes

`ui-react/src/api/client.ts` owns backend calls and base URL resolution.

- Public API methods currently do not expose caller-level cancellation (`signal`).
- Add explicit `signal` plumbing in `ApiClient` before using cancellation in new paths.

## Mutation Pattern

After create/update/delete:

1. call API method
2. apply optimistic update if needed
3. invalidate relevant SWR keys

Do not place business state transitions in purely presentational components.

## Documentation Policy

Keep long-lived frontend docs under `docs/`, not `ui-react/`.
