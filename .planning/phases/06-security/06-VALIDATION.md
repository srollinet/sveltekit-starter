---
phase: 6
slug: security
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-11
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                                                           |
| ---------------------- | ------------------------------------------------------------------------------- |
| **Framework**          | Vitest ^4.1.2                                                                   |
| **Config file**        | `vite.config.ts` (test: { environment: 'node', include: ['src/**/*.test.ts'] }) |
| **Quick run command**  | `pnpm run check && pnpm run lint`                                               |
| **Full suite command** | `pnpm run build && pnpm test:unit && pnpm run check && pnpm run lint`           |
| **Estimated runtime**  | ~30 seconds (quick), ~90 seconds (full)                                         |

---

## Sampling Rate

- **After every task commit:** Run `pnpm run check && pnpm run lint`
- **After every plan wave:** Run `pnpm run build && pnpm test:unit`
- **Before `/gsd-verify-work`:** Full suite must be green + curl smoke checks pass
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref                          | Secure Behavior                                  | Test Type      | Automated Command                                           | File Exists       | Status     |
| ------- | ---- | ---- | ----------- | ----------------------------------- | ------------------------------------------------ | -------------- | ----------------------------------------------------------- | ----------------- | ---------- |
| 6-01-01 | 01   | 1    | SEC-01      | XSS/Clickjacking/MIME/Referrer/HSTS | All 5 security headers present in every response | static + smoke | `grep noseconeHandle src/hooks.server.ts && pnpm run check` | ✅ after impl     | ⬜ pending |
| 6-01-02 | 01   | 1    | SEC-04      | All                                 | sequence() with noseconeHandle first             | static         | `grep "sequence(noseconeHandle" src/hooks.server.ts`        | ✅ after impl     | ⬜ pending |
| 6-02-01 | 01   | 1    | SEC-02      | CSRF                                | CSRF comment documented in hooks.server.ts       | static         | `grep -i csrf src/hooks.server.ts`                          | ✅ after impl     | ⬜ pending |
| 6-03-01 | 01   | 1    | SEC-03      | Secret leakage                      | $lib/server/ boundary documented                 | static         | `grep "lib/server" CLAUDE-DEV.md`                           | ✅ after impl     | ⬜ pending |
| 6-04-01 | 01   | 1    | SEC-04      | All                                 | Build passes (TS types, CSP config valid)        | build          | `pnpm run build && pnpm run check`                          | ✅ existing infra | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

None — Existing infrastructure covers all phase requirements.

Security header verification is done via curl/build smoke checks and static grep commands, not unit tests. The existing test infrastructure (Vitest, `pnpm test:unit`) is sufficient.

---

## Manual-Only Verifications

| Behavior                                     | Requirement | Why Manual                  | Test Instructions                                                                                                                                                                         |
| -------------------------------------------- | ----------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Security headers visible in browser DevTools | SEC-01      | Requires running dev server | Start `pnpm dev`, open DevTools → Network → any request → Response Headers, verify CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy                                    |
| CSRF rejects cross-origin POST               | SEC-02      | Requires running server     | `curl -X POST http://localhost:5173/ -H "Content-Type: application/x-www-form-urlencoded" -H "Origin: https://evil.example.com" -d "data=test" -v 2>&1 \| grep -E "HTTP\|403\|forbidden"` |
| All 5 headers present via curl               | SEC-01      | Requires running server     | `curl -I http://localhost:5173/ \| grep -iE "content-security-policy\|strict-transport-security\|x-frame-options\|x-content-type-options\|referrer-policy"`                               |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
