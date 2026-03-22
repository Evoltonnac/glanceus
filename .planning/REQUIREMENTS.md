# Requirements: Glanceus v1.1 Security Audit Remediation

**Defined:** 2026-03-19
**Core Value:** Users can complete auth -> fetch -> parse -> render through config-only integrations without backend hardcoding, while keeping runtime and secrets safe.

## v1 Requirements

### Critical Security Findings

- [x] **SEC-01**: User can run integrations without plaintext secrets appearing in logs, API responses, or persisted runtime state snapshots.
- [x] **SEC-02**: User can rely on strict validation for security-sensitive API inputs (settings, secrets, auth callbacks) with deterministic rejection on malformed payloads.
- [x] **SEC-03**: User can execute integration flows without dangerous step input expansion (for example, unsafe URL/protocol or command-like payload injection paths).

### Runtime Integrity

- [x] **INT-01**: User can trust executor/auth error responses to avoid leaking sensitive internals while preserving actionable diagnostics.
- [x] **INT-02**: User can update existing integrations and keep backward-compatible behavior after security fixes are applied.

### Security Regression Gates

- [x] **GATE-01**: User can verify that critical auth/fetch/refresh paths still pass targeted regression tests after remediation.
- [x] **GATE-02**: User can verify milestone readiness through a documented security check gate with repeatable pass/fail criteria.

### Web Scraper Stability and Recovery

- [x] **PH4-01**: User can run WebView fallback flows without automatic foreground/focus stealing in backend/frontend/runtime recovery paths.
- [x] **PH4-02**: User can rely on bounded automatic retries for uncertain runtime failures with deterministic cap and backoff behavior.
- [x] **PH4-03**: User can rely on deterministic internal scraper fail classification that keeps manual-required auth walls separate from retryable uncertain failures.
- [x] **PH4-04**: User can trigger explicit foreground/manual recovery actions without implicit fallback metadata forcing focus behavior.
- [x] **PH4-05**: User can reference synchronized runtime/fallback contracts and regression inputs for manual-only fallback and retry behavior.

## v2 Requirements

### Defense in Depth (Deferred)

- **SEC-04**: User can enforce per-integration trust policies (domain allowlist / runtime capability profile) for high-risk steps.
- **SEC-05**: User can review historical security events and remediation evidence in a dedicated audit trail view.

## Out of Scope

| Feature | Reason |
|---------|--------|
| New scraping/auth capabilities | This milestone is remediation-first; no new platform capability expansion. |
| Multi-tenant permissions or account system | Product remains local-first personal usage in current milestone scope. |
| Large storage architecture changes | Not required to resolve current critical audit findings safely. |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEC-01 | Phase 3 | Complete |
| SEC-02 | Phase 3 | Complete |
| SEC-03 | Phase 3 | Complete |
| INT-01 | Phase 3 | Complete |
| INT-02 | Phase 3 | Complete |
| GATE-01 | Phase 3 | Complete |
| GATE-02 | Phase 3 | Complete |
| PH4-01 | Phase 4 | Complete |
| PH4-02 | Phase 4 | Complete |
| PH4-03 | Phase 4 | Complete |
| PH4-04 | Phase 4 | Complete |
| PH4-05 | Phase 4 | Complete |

**Coverage:**
- v1 requirements: 12 total
- Mapped to phases: 12
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-19*
*Last updated: 2026-03-20 after adding Phase 4 traceability requirements*
