---
phase: 05-observability
reviewed: 2026-04-10T00:00:00Z
depth: standard
files_reviewed: 11
files_reviewed_list:
  - src/instrumentation.server.ts
  - src/lib/server/logger.ts
  - src/lib/server/env/schema.ts
  - .env.example
  - svelte.config.js
  - src/hooks.server.ts
  - src/app.d.ts
  - knip.config.ts
  - package.json
  - src/routes/api/health/+server.ts
  - src/lib/server/db/index.ts
findings:
  critical: 0
  warning: 3
  info: 4
  total: 7
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-04-10T00:00:00Z
**Depth:** standard
**Files Reviewed:** 11
**Status:** issues_found

## Summary

This phase adds OpenTelemetry tracing, structured logging with Pino, Zod-validated environment variables, a health-check endpoint, and the SvelteKit `instrumentation.server.ts` entry point. The implementation is structurally sound and follows the project's documented decisions. No critical (security or crash) issues were found.

Three warnings surface: the OTEL SDK's `shutdown()` is called without awaiting process exit (meaning the process can exit before spans are flushed), the `@opentelemetry/api` version is pinned below the SDK's bundled API version which can produce a dual-API split-brain, and the health endpoint returns a full stack trace via `err` in a Pino structured log that will include the raw DB error string in production log output.

Four info-level items cover a stale `.env.example` comment, an absent `nosecone`/security-headers dependency that is referenced in a code comment, a `LOG_LEVEL` env var that is read directly from `process.env` in `logger.ts` instead of going through the validated `env` module, and a missing `@nosecone/sveltekit` in `knip.config.ts` `ignoreDependencies` (though the package is not yet installed, so this is forward-looking).

---

## Warnings

### WR-01: OTEL SDK shutdown does not keep the process alive until flush completes

**File:** `src/instrumentation.server.ts:71-75`

**Issue:** The `SIGTERM` handler calls `sdk.shutdown()` but does not delay process exit. On Docker stop, Node.js receives SIGTERM and the default behaviour is to exit after all `process.on('SIGTERM')` handlers return. Because `sdk.shutdown()` returns a promise that is only `.catch()`-ed (not awaited with a process hold), the process may exit before the SDK finishes flushing buffered spans to the OTLP endpoint. In-flight traces will be lost on every clean shutdown.

**Fix:** Hold the process open until shutdown resolves:

```typescript
process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .catch((err: unknown) => {
      console.error('Error shutting down OTEL SDK:', err);
    })
    .finally(() => {
      process.exit(0);
    });
});
```

This pattern is documented in the official OpenTelemetry JS SDK examples and ensures the Node process does not exit until the SDK has either flushed or timed out.

---

### WR-02: `@opentelemetry/api` version (^1.9.1) may conflict with SDK 2.x bundled API

**File:** `package.json:66`

**Issue:** `@opentelemetry/api` is pinned to `^1.9.1` in `dependencies`. The `@opentelemetry/sdk-node@^0.214.0` (SDK 2.x line) bundles and re-exports API 1.x internally. When two different versions of `@opentelemetry/api` are resolved in `node_modules`, the singleton global (`opentelemetry.api.global`) used by `trace.getSpan()` and `context.active()` in `hooks.server.ts` and `logger.ts` may refer to a different instance than the one the SDK registered. This causes `trace.getSpan(context.active())` to silently return `undefined` for all spans, meaning the trace-ID mixin in `logger.ts` always emits empty objects and `event.locals.traceId` is never set.

**Fix:** Verify that pnpm resolves a single `@opentelemetry/api` instance:

```bash
pnpm why @opentelemetry/api
```

If multiple versions appear, add a resolution override in `package.json`:

```json
"pnpm": {
  "overrides": {
    "@opentelemetry/api": "^1.9.1"
  }
}
```

This forces pnpm to deduplicate the API package to the declared version, preventing split-brain.

---

### WR-03: Raw database error object logged at health endpoint leaks internal details

**File:** `src/routes/api/health/+server.ts:26`

**Issue:** `logger.error({ err }, 'Health check DB query failed')` passes the full error object (including its `.message`, `.stack`, and any postgres.js-specific fields such as connection strings embedded in error messages) to Pino. Pino serialises unknown objects with its default serialiser, which will include `err.message` verbatim. A postgres.js connection error message can contain the full `DATABASE_URL` (including password) if the driver echoes the DSN into the error. While the log stays server-side, it can expose credentials in centralised log aggregation pipelines (Aspire Dashboard, log forwarding).

**Fix:** Use Pino's built-in error serialiser which trims the stack and sanitises the message, or redact the connection string explicitly:

```typescript
import { logger } from '$lib/server/logger';

// Option A — use Pino's err serialiser (recommended)
logger.error({ err: err instanceof Error ? err : new Error(String(err)) }, 'Health check DB query failed');

// Option B — log only the message, never the full object
logger.error({ message: err instanceof Error ? err.message : String(err) }, 'Health check DB query failed');
```

Also add a Pino `redact` option in `logger.ts` to strip any field that contains `DATABASE_URL` or password patterns as a defence-in-depth measure.

---

## Info

### IN-01: `logger.ts` reads `LOG_LEVEL` directly from `process.env`, bypassing Zod validation

**File:** `src/lib/server/logger.ts:6`

**Issue:** `process.env.LOG_LEVEL ?? 'info'` is used instead of importing `env.LOG_LEVEL` from `$lib/server/env`. This means an invalid value (e.g. `LOG_LEVEL=verbose`) silently falls through to Pino without a validation error, because the Zod schema only runs when `$lib/server/env` is imported. The schema does define and validate `LOG_LEVEL` — it is simply not used here.

**Fix:**

```typescript
import { env } from '$lib/server/env';

export const logger = pino({
  level: env.LOG_LEVEL,
  // ...
});
```

Note: be mindful of import order — `logger.ts` must not be imported before `$lib/server/env` has been initialised. Since `hooks.server.ts` already imports `$lib/server/env` first, this is safe for server-side usage.

---

### IN-02: Stale comment in `.env.example` references "Phase 4"

**File:** `.env.example:14`

**Issue:** The comment reads `# Full connection URL consumed by the app (and later by Drizzle in Phase 4)`. Phase 4 (database integration) is complete — Drizzle is already in use. The comment is misleading for developers cloning the template.

**Fix:** Update the comment:

```
# Full connection URL consumed by the app and Drizzle ORM
DATABASE_URL=postgres://postgres:postgres@localhost:5432/app
```

---

### IN-03: `svelte.config.js` enables both `tracing.server` and `instrumentation.server` under `experimental`

**File:** `svelte.config.js:9-15`

**Issue:** Both `experimental.tracing.server` and `experimental.instrumentation.server` are set to `true`. The SvelteKit docs (as of v2) describe `instrumentation` as the successor entry point for `instrumentation.server.ts`. The `tracing` key is the older experimental flag. Enabling both is harmless today, but it signals a copy-paste from an outdated example. If SvelteKit removes the old `tracing` key in a future minor, a deprecation warning will appear at startup.

**Fix:** Remove the `tracing` block, keeping only `instrumentation`:

```js
experimental: {
  instrumentation: {
    server: true,
  },
},
```

---

### IN-04: `knip.config.ts` suppresses `src/lib/server/db/index.ts` globally rather than waiting for first consumer

**File:** `knip.config.ts:19`

**Issue:** `src/lib/server/db/index.ts` is added to Knip's `ignore` list with the comment "no app code imports it yet." This suppresses the Knip warning permanently, meaning it will not alert if the file is accidentally deleted or if exports are removed without any consumers noticing. This is a template-quality concern — the starter is intended to be the foundation other apps build on, so dead-code detection should be active once consumers exist.

**Fix:** This is low-priority for a template where the DB client is an expected foundational export. Consider replacing the blanket `ignore` with `ignoreExportsUsedInFile: true` at the file level, or leaving a TODO comment so it is removed when the first app-level consumer is added:

```ts
// TODO: remove when first app route imports db
'src/lib/server/db/index.ts',
```

---

_Reviewed: 2026-04-10T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
