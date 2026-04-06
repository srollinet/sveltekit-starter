---
phase: 2
slug: dev-infrastructure-ai-agent
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-06
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------ |
| **Framework**          | Vitest (in devDependencies — needs `test` block added to `vite.config.ts` in Wave 0) |
| **Config file**        | `vite.config.ts` — no `test` block yet; Wave 0 adds it                               |
| **Quick run command**  | `pnpm test:unit`                                                                     |
| **Full suite command** | `pnpm test`                                                                          |
| **Estimated runtime**  | ~5 seconds                                                                           |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test:unit`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd-verify-work`:** Full suite must be green + manual Docker smoke
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior                                           | Test Type     | Automated Command                                  | File Exists | Status     |
| ------- | ---- | ---- | ----------- | ---------- | --------------------------------------------------------- | ------------- | -------------------------------------------------- | ----------- | ---------- |
| 2-01-01 | 01   | 0    | ENV-02      | —          | N/A                                                       | unit setup    | `pnpm test:unit`                                   | ❌ W0       | ⬜ pending |
| 2-01-02 | 01   | 1    | ENV-02      | T-2-01     | Zod rejects missing DATABASE_URL with descriptive error   | unit          | `pnpm test:unit -- src/lib/server/env.test.ts`     | ❌ W0       | ⬜ pending |
| 2-01-03 | 01   | 1    | ENV-03      | —          | `$env/dynamic/private` import (not static)                | code review   | n/a — structural check                             | N/A         | ⬜ pending |
| 2-02-01 | 02   | 1    | DOCK-01     | T-2-02     | PostgreSQL and Aspire healthy; no secrets in compose file | manual smoke  | `docker compose up && curl http://localhost:18888` | N/A         | ⬜ pending |
| 2-03-01 | 03   | 1    | AI-01       | —          | N/A                                                       | manual review | n/a                                                | N/A         | ⬜ pending |
| 2-03-02 | 03   | 1    | AI-02       | —          | N/A                                                       | manual review | n/a                                                | N/A         | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- [ ] `vite.config.ts` — add `test` block with `environment: 'node'` and SvelteKit module resolver (enables Vitest to run at all)
- [ ] `src/lib/server/env.test.ts` — stub file with test for ENV-02 (Zod fail-fast on missing DATABASE_URL)

_These are prerequisites. No Wave 1+ tasks may run without Wave 0 complete._

---

## Manual-Only Verifications

| Behavior                                                | Requirement | Why Manual              | Test Instructions                                                                       |
| ------------------------------------------------------- | ----------- | ----------------------- | --------------------------------------------------------------------------------------- |
| PostgreSQL health check passes; container reachable     | DOCK-01     | Requires running Docker | `docker compose up -d && docker compose ps` → both services healthy                     |
| Aspire Dashboard UI accessible at port 18888            | DOCK-01     | Requires running Docker | `curl -s http://localhost:18888` → returns HTML                                         |
| `.env.example` copied to `.env` gives working dev stack | ENV-01      | Requires running app    | `cp .env.example .env && pnpm dev` → server starts without Zod errors                   |
| CLAUDE-DEV.md has 4 required sections                   | AI-01       | Content review          | Open file, verify: Key Commands, Folder Structure, Coding Conventions, Testing Patterns |
| `.claude/settings.json` has mcpServers.svelte           | AI-02       | JSON inspection         | `cat .claude/settings.json \| grep -A3 svelte` → shows command/args                     |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
