---
phase: 05-observability
reviewed: 2026-04-10T12:00:00Z
depth: standard
files_reviewed: 11
files_reviewed_list:
  - .env.example
  - knip.config.ts
  - package.json
  - src/app.d.ts
  - src/hooks.server.ts
  - src/instrumentation.server.ts
  - src/lib/server/db/index.ts
  - src/lib/server/env/schema.ts
  - src/lib/server/logger.ts
  - src/routes/api/health/+server.ts
  - svelte.config.js
findings:
  critical: 0
  warning: 1
  info: 4
  total: 5
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-04-10T12:00:00Z
**Depth:** standard
**Files Reviewed:** 11
**Status:** issues_found

## Summary

This phase adds OpenTelemetry tracing, structured logging with Pino, Zod-validated environment variables, a health-check endpoint, and the SvelteKit `instrumentation.server.ts` entry point. Two previously-identified warnings (WR-01: OTEL SDK graceful shutdown, WR-03: raw error object in health endpoint log) have been fixed and are confirmed resolved. No critical issues were found.

One warning remains: `@opentelemetry/api` is pinned to `^1.9.1` while the SDK 2.x line may resolve a different internal copy, risking a split-brain singleton where `trace.getSpan()` silently returns `undefined` on every request.

Four info-level items remain open: `logger.ts` reads `LOG_LEVEL` directly from `process.env` instead of the validated `env` module; a stale Phase 4 comment in `.env.example`; `svelte.config.js` enables both the old `tracing` experimental flag and the current `instrumentation` flag; and `knip.config.ts` permanently suppresses dead-code detection for `src/lib/server/db/index.ts`.

---

## Warnings

### WR-01: `@opentelemetry/api` version may cause split-brain singleton with SDK 2.x

**File:** `package.json:66`

**Issue:** `@opentelemetry/api` is pinned to `^1.9.1` in `dependencies`. The `@opentelemetry/sdk-node@^0.214.0` (SDK 2.x line) carries its own internal API dependency. If pnpm resolves two separate copies of `@opentelemetry/api` in `node_modules`, the global singleton used by `trace.getSpan()` and `context.active()` in `hooks.server.ts` and `logger.ts` will refer to a different registry than the one the SDK registered. The symptom is silent: `trace.getSpan(context.active())` returns `undefined` for every request, so the Pino trace-ID mixin always emits empty objects and `event.locals.traceId` is never populated.

**Fix:** Verify deduplication first:

```bash
pnpm why @opentelemetry/api
```

If multiple versions appear, add a pnpm resolution override in `package.json` to force a single copy:

```json
"pnpm": {
  "overrides": {
    "@opentelemetry/api": "^1.9.1"
  }
}
```

---

## Info

### IN-01: `logger.ts` reads `LOG_LEVEL` directly from `process.env`, bypassing Zod validation

**File:** `src/lib/server/logger.ts:6`

**Issue:** `process.env.LOG_LEVEL ?? 'info'` is used instead of importing `env.LOG_LEVEL` from `$lib/server/env`. The Zod schema in `env/schema.ts` defines an enum for `LOG_LEVEL` (`trace | debug | info | warn | error | fatal`) and applies a default, but that validation only runs when `$lib/server/env` is imported. An invalid value such as `LOG_LEVEL=verbose` silently passes through to Pino without a startup error.

**Fix:**

```typescript
import { env } from '$lib/server/env';

export const logger = pino({
  level: env.LOG_LEVEL,
  // ...
});
```

Import order is safe: `hooks.server.ts` already imports `$lib/server/env` before `$lib/server/logger`, so the validated `env` object will be available.

---

### IN-02: Stale comment in `.env.example` references Phase 4

**File:** `.env.example:14`

**Issue:** The comment reads `# Full connection URL consumed by the app (and later by Drizzle in Phase 4)`. Phase 4 (database integration) is complete and Drizzle is in active use. The comment is misleading for developers cloning the template.

**Fix:**

```
# Full connection URL consumed by the app and Drizzle ORM
DATABASE_URL=postgres://postgres:postgres@localhost:5432/app
```

---

### IN-03: `svelte.config.js` enables both deprecated `tracing` flag and current `instrumentation` flag

**File:** `svelte.config.js:9-15`

**Issue:** Both `experimental.tracing.server: true` and `experimental.instrumentation.server: true` are set. Per the SvelteKit v2 docs, `instrumentation` is the current entry point for `instrumentation.server.ts`. The `tracing` key predates it and is redundant. Enabling both is harmless today but risks a deprecation warning at startup in a future SvelteKit minor.

**Fix:** Remove the `tracing` block:

```js
experimental: {
  instrumentation: {
    server: true,
  },
},
```

---

### IN-04: `knip.config.ts` permanently suppresses dead-code detection for `src/lib/server/db/index.ts`

**File:** `knip.config.ts:19`

**Issue:** `src/lib/server/db/index.ts` is added to Knip's `ignore` list with the comment "no app code imports it yet." This silences Knip permanently, so a future accidental deletion or export removal on this file will not produce any warning. For a template repository where the DB client is a critical foundational export, ongoing detection is desirable once the first consumer is added.

**Fix:** Low priority for a template. Add a TODO comment so it is removed when the first app-level consumer imports the module:

```ts
// TODO: remove when first app route imports db — Knip will then detect it naturally
'src/lib/server/db/index.ts',
```

---

_Reviewed: 2026-04-10T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
