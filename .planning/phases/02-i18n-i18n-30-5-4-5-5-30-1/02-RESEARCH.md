# Phase 2: Usability Optimization - Research

**Researched:** 2026-03-16
**Scope:** Copy system, error formatting, EN/ZH internationalization, refresh policy defaults, encryption defaults
**Confidence:** High

## Current State Summary

- Product-facing strings are mostly hardcoded directly inside React components (not centrally managed).
- Runtime error display is partially normalized, but formatting is inconsistent across backend/API/frontend surfaces.
- Global refresh defaults are currently disabled by default (`0`) and option ranges are not aligned with the phase target.
- Encryption is currently opt-in; key generation occurs when encryption is enabled, but default-on experience is not implemented.
- Settings currently do not persist a `language/locale` field that can drive EN/ZH runtime translation.

## Locked Decisions From Phase Definition

1. UI wording must be product-like and concise, not technical/system-heavy.
2. Error output must follow a standardized formatted schema to support i18n.
3. Internationalization must support English and Chinese only for now.
4. Default language must be English.
5. Language switch must live in the Settings page.
6. Global refresh default is 30 minutes.
7. Refresh options should stay between 5 minutes and 1 day, with 4-5 practical choices.
8. Encryption must be enabled by default, and startup should provision a key once.

## Recommended Implementation Patterns

### 1. Translation-First UI Strings (No New Core Dependency)

- Introduce app-local dictionaries (`en`, `zh`) plus a tiny translation helper/hook in `ui-react/src/i18n/`.
- Keep translation keys semantic (e.g., `settings.refresh.default_interval`) and avoid embedding technical terms in user-visible labels.
- Persist chosen locale in backend-owned `SystemSettings` so desktop and web mode behavior remains consistent.

### 2. Standard Error Envelope

- Normalize runtime-facing errors into a stable shape:
  - `code` (machine-readable)
  - `summary` (short user-facing message)
  - `details` (expanded diagnostics)
  - `step_id` (optional flow context)
- Keep backend responsible for canonical error formatting; frontend only renders the envelope.
- Ensure fallback behavior still returns readable messages when envelope fields are missing.

### 3. Settings-Driven Language Switching

- Add `language` field to `SystemSettings` with allowed values `en`/`zh`, default `en`.
- Wire Settings page switcher to `api.updateSettings(...)` and apply locale immediately after save.
- Ensure app bootstrap reads persisted language before first full render where possible.

### 4. Refresh Policy Contract Update

- Move global default from `0` to `30` minutes.
- Constrain selectable options to a practical set matching requirement intent:
  - `5`, `30`, `60`, `1440` (minutes)
- Keep source-level and integration-level overrides intact via existing priority resolution.

### 5. Default-On Encryption Provisioning

- Set `encryption_enabled` default to `true`.
- On first-run (or existing file without key), ensure master key is provisioned once and persisted safely.
- Preserve migration logic for legacy plaintext/ciphertext records without forcing destructive rewrites.

## Validation Architecture

### Requirement-to-Test Mapping

| Requirement | Primary Areas | Verification Focus |
|-------------|---------------|--------------------|
| P2-REQ-01 | `ui-react/src/pages/*`, `ui-react/src/components/*` | Core copy becomes concise and product-facing; no obvious technical jargon in primary UX paths. |
| P2-REQ-02 | `core/executor.py`, `core/api.py`, frontend error displays | Error format remains consistent (summary/details/code semantics) across API + UI rendering. |
| P2-REQ-03 | `core/settings_manager.py`, `ui-react/src/i18n/*`, `Settings.tsx` | EN default, ZH switch, persistence through settings API. |
| P2-REQ-04 | `core/refresh_policy.py`, `core/settings_manager.py`, `main.py`, `Settings.tsx` | Default refresh is 30 with required options; encryption default-on + startup key generation behavior is stable. |

### Fast Feedback Gates

- Backend-focused loops:
  - `pytest tests/core/test_settings_manager.py -q`
  - `pytest tests/api/test_source_auto_refresh_api.py -q`
- Frontend-focused loops:
  - `make test-typecheck`
  - `make test-frontend`
- Final impacted gate:
  - `make test-impacted`

### Nyquist Notes

- Every implementation task should include at least one `<automated>` verification command.
- Avoid watch-mode test commands in plan tasks.
- Keep execution slices small enough to validate in wave-level increments.

## Risks and Mitigations

1. **Risk:** Large-scale text migration introduces inconsistent key naming.
   - **Mitigation:** Define namespace conventions in `ui-react/src/i18n/index.ts` and migrate by domain.
2. **Risk:** Default-on encryption breaks existing local dev assumptions.
   - **Mitigation:** Preserve import/export and migration paths; add startup resilience tests.
3. **Risk:** Refresh option contract change regresses source-level override behavior.
   - **Mitigation:** Extend API/scheduler tests to verify priority order remains `source > integration > global`.
