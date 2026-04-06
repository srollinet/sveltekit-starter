---
phase: 4
slug: database
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-06
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                      |
| ---------------------- | -------------------------- |
| **Framework**          | vitest                     |
| **Config file**        | vitest.config.ts           |
| **Quick run command**  | `pnpm run test:unit --run` |
| **Full suite command** | `pnpm run test:unit --run` |
| **Estimated runtime**  | ~10 seconds                |

---

## Sampling Rate

- **After every task commit:** Run `pnpm run test:unit --run`
- **After every plan wave:** Run `pnpm run test:unit --run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type   | Automated Command                             | File Exists | Status     |
| ------- | ---- | ---- | ----------- | ---------- | --------------- | ----------- | --------------------------------------------- | ----------- | ---------- |
| 4-01-01 | 01   | 1    | DB-02       | —          | N/A             | integration | `pnpm run db:push`                            | ✅          | ⬜ pending |
| 4-01-02 | 01   | 1    | DB-03       | —          | N/A             | static      | `pnpm run check`                              | ✅          | ⬜ pending |
| 4-01-03 | 01   | 2    | DB-04       | —          | N/A             | integration | `pnpm run db:generate && pnpm run db:migrate` | ✅          | ⬜ pending |
| 4-01-04 | 01   | 2    | DB-05       | —          | N/A             | integration | `pnpm run db:migrate`                         | ✅          | ⬜ pending |
| 4-01-05 | 01   | 3    | DB-06       | —          | N/A             | static      | `pnpm run check`                              | ✅          | ⬜ pending |
| 4-01-06 | 01   | 3    | DB-07       | —          | N/A             | static      | `pnpm run lint && pnpm run knip`              | ✅          | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior                                                          | Requirement | Why Manual                       | Test Instructions                                                                          |
| ----------------------------------------------------------------- | ----------- | -------------------------------- | ------------------------------------------------------------------------------------------ |
| `pnpm run db:studio` opens Drizzle Studio showing the posts table | DB-06       | Requires browser/GUI interaction | Run `pnpm run db:studio`, open browser, verify posts table is visible with correct columns |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
