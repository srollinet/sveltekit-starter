---
phase: 7
slug: testing
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-11
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                                           |
| ---------------------- | --------------------------------------------------------------- |
| **Framework**          | Vitest 4.1.2 (unit + component) + Playwright 1.59.1 (E2E)       |
| **Config file**        | `vite.config.ts` (Vitest) + `playwright.config.ts` (Playwright) |
| **Quick run command**  | `pnpm test:unit`                                                |
| **Full suite command** | `pnpm test` (unit + E2E)                                        |
| **Estimated runtime**  | ~30 seconds (unit) + ~15 seconds (E2E)                          |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test:unit`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~45 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type        | Automated Command         | File Exists | Status     |
| ------- | ---- | ---- | ----------- | ---------- | --------------- | ---------------- | ------------------------- | ----------- | ---------- |
| 7-01-01 | 01   | 0    | TEST-01     | —          | N/A             | infrastructure   | `pnpm test:unit` (exit 0) | ❌ W0       | ⬜ pending |
| 7-01-02 | 01   | 0    | TEST-02     | —          | N/A             | component        | `pnpm test:unit`          | ❌ W0       | ⬜ pending |
| 7-01-03 | 01   | 0    | TEST-04     | —          | N/A             | integration      | `pnpm test:unit`          | ❌ W0       | ⬜ pending |
| 7-01-04 | 01   | 0    | TEST-05     | —          | N/A             | e2e              | `pnpm test:e2e`           | ❌ W0       | ⬜ pending |
| 7-01-05 | 01   | 1    | TEST-03     | —          | N/A             | unit             | `pnpm test:unit`          | ✅ existing | ⬜ pending |
| 7-01-06 | 01   | 2    | TEST-06     | —          | N/A             | integration gate | `pnpm test`               | ✅ (gate)   | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- [ ] `vite.config.ts` — migrate from single `environment: 'node'` to `test.projects` with `unit` (node) + `component` (jsdom) projects; covers TEST-01
- [ ] `vitest-setup.ts` — jest-dom setup file for component project; covers TEST-02
- [ ] `src/lib/components/StackBadge.svelte` — minimal demo component with DaisyUI badge; covers TEST-02
- [ ] `src/lib/components/StackBadge.svelte.test.ts` — component test using `render()` + `toBeInTheDocument()`; covers TEST-02
- [ ] `src/routes/api/health/health.test.ts` — integration test with testcontainers postgresql; covers TEST-04
- [ ] `tests/smoke.e2e.ts` — Playwright smoke test: home page renders + nav visible; covers TEST-05
- [ ] Package installs: `pnpm add -D jsdom @testcontainers/postgresql testcontainers`; covers TEST-01, TEST-02, TEST-04

---

## Manual-Only Verifications

| Behavior                                              | Requirement | Why Manual                       | Test Instructions                                                                            |
| ----------------------------------------------------- | ----------- | -------------------------------- | -------------------------------------------------------------------------------------------- |
| Tests pass on clean checkout with `docker compose up` | TEST-06     | Requires fresh environment reset | Clone repo, run `docker compose up -d`, run `pnpm install`, run `pnpm test`, verify all pass |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
