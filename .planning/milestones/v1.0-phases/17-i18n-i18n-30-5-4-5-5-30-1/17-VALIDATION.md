---
phase: 02
slug: i18n-i18n-30-5-4-5-5-30-1
status: verified
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-16
verified: 2026-03-17
---

# Phase 02 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest + vitest |
| **Config file** | `pytest.ini`, `ui-react/vitest.config.ts` |
| **Quick run command** | `make test-impacted` |
| **Full suite command** | `make test-backend && make test-frontend && make test-typecheck` |
| **Estimated runtime** | ~180 seconds |

---

## Sampling Rate

- **After every task commit:** Run `make test-impacted`
- **After every plan wave:** Run `make test-backend && make test-frontend`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 180 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | P2-REQ-02 | unit | `pytest tests/core/test_error_formatter.py -q` | ✅ | ✅ green |
| 02-01-02 | 01 | 1 | P2-REQ-02 | api | `pytest tests/api/test_reload_error_boundary.py -q` | ✅ | ✅ green |
| 02-02-01 | 02 | 2 | P2-REQ-03 | unit | `pytest tests/core/test_settings_manager.py -q` | ✅ | ✅ green |
| 02-02-02 | 02 | 2 | P2-REQ-01,P2-REQ-03 | ui | `make test-typecheck` | ✅ | ✅ green |
| 02-02-03 | 02 | 2 | P2-REQ-03 | ui | `make test-frontend` | ✅ | ✅ green |
| 02-03-01 | 03 | 3 | P2-REQ-04 | api | `pytest tests/api/test_source_auto_refresh_api.py tests/core/test_refresh_scheduler.py -q` | ✅ | ✅ green |
| 02-03-02 | 03 | 3 | P2-REQ-04 | unit | `pytest tests/core/test_settings_manager.py tests/core/test_app_startup_resilience.py -q` | ✅ | ✅ green |
| 02-03-03 | 03 | 3 | P2-REQ-04 | mixed | `make test-impacted` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify commands
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 180s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved (2026-03-17, user acceptance)
