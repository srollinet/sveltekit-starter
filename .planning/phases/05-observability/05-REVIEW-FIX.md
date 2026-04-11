---
phase: 05-observability
fixed_at: 2026-04-11T09:57:54Z
review_path: .planning/phases/05-observability/05-REVIEW.md
iteration: 3
findings_in_scope: 5
fixed: 4
skipped: 1
status: partial
---

# Phase 05: Code Review Fix Report

**Fixed at:** 2026-04-11T09:57:54Z
**Source review:** .planning/phases/05-observability/05-REVIEW.md
**Iteration:** 3

**Summary:**
- Findings in scope: 5
- Fixed: 4
- Skipped: 1 (previously fixed)

## Fixed Issues

### IN-01: `logger.ts` reads `LOG_LEVEL` directly from `process.env`, bypassing Zod validation

**Files modified:** `src/lib/server/logger.ts`
**Commit:** 71a2cfe
**Applied fix:** Added `import { env } from '$lib/server/env'` and replaced `process.env.LOG_LEVEL ?? 'info'` with `env.LOG_LEVEL`. The validated env module provides a Zod-enforced enum value with a default, so invalid values like `LOG_LEVEL=verbose` now cause a startup error rather than passing silently to Pino.

---

### IN-02: Stale comment in `.env.example` references Phase 4

**Files modified:** `.env.example`
**Commit:** 2aadfd8
**Applied fix:** Updated comment on line 14 from `# Full connection URL consumed by the app (and later by Drizzle in Phase 4)` to `# Full connection URL consumed by the app and Drizzle ORM`. Removes the stale phase reference since database integration is complete.

---

### IN-03: `svelte.config.js` enables both deprecated `tracing` flag and current `instrumentation` flag

**Files modified:** `svelte.config.js`
**Commit:** dd8adba
**Applied fix:** Removed the `experimental.tracing: { server: true }` block entirely. Only `experimental.instrumentation: { server: true }` remains, which is the current SvelteKit v2 entry point for `instrumentation.server.ts`.

---

### IN-04: `knip.config.ts` permanently suppresses dead-code detection for `src/lib/server/db/index.ts`

**Files modified:** `knip.config.ts`
**Commit:** 2f69ead
**Applied fix:** Replaced the generic comment `// DB client singleton — foundational export, no app code imports it yet` with `// TODO: remove when first app route imports db — Knip will then detect it naturally`. This signals to the next developer that the ignore entry should be removed once the db client has a consumer.

---

## Skipped Issues

### WR-01: `@opentelemetry/api` version may cause split-brain singleton with SDK 2.x

**File:** `package.json:66`
**Reason:** Previously fixed — `pnpm.overrides` block with `"@opentelemetry/api": "^1.9.1"` already present in `package.json` at the start of this iteration. No change required.
**Original issue:** `@opentelemetry/api` pinned to `^1.9.1` while SDK 2.x may resolve a different internal copy, risking a split-brain singleton where `trace.getSpan()` silently returns `undefined`.

---

_Fixed: 2026-04-11T09:57:54Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 3_
