---
phase: 05-observability
plan: 01
subsystem: observability
tags: [otel, pino, instrumentation, tracing, logging]
dependency_graph:
  requires: [04-database-02]
  provides: [otel-sdk-init, pino-logger-singleton, otel-env-schema, hooks-trace-locals]
  affects: [src/hooks.server.ts, src/app.d.ts, src/lib/server/env/schema.ts]
tech_stack:
  added:
    - "@opentelemetry/sdk-node 0.214.0"
    - "@opentelemetry/auto-instrumentations-node 0.72.0"
    - "@opentelemetry/exporter-trace-otlp-proto 0.214.0"
    - "@opentelemetry/api 1.9.1"
    - "import-in-the-middle 3.0.0"
    - "pino 10.3.1"
  patterns:
    - "NodeSDK with import-in-the-middle ESM hook for SvelteKit OTEL"
    - "Selective auto-instrumentation (HTTP + undici only)"
    - "OTLP/HTTP protobuf export to Aspire Dashboard"
    - "Pino singleton with OTEL trace mixin for log-trace correlation"
    - "sequence(otelHandle) pattern for composable SvelteKit hooks"
key_files:
  created:
    - src/instrumentation.server.ts
    - src/lib/server/logger.ts
  modified:
    - src/lib/server/env/schema.ts
    - .env.example
    - svelte.config.js
    - src/hooks.server.ts
    - src/app.d.ts
    - knip.config.ts
    - package.json
    - pnpm-lock.yaml
decisions:
  - "Use selective auto-instrumentation (HTTP + undici only) to minimize startup cost and false spans"
  - "instrumentation.server.ts reads process.env directly — cannot use $lib/server/env (runs before SvelteKit modules)"
  - "logger.ts reads LOG_LEVEL from process.env directly — pino initializes at module load time before Zod validation"
  - "sequence(otelHandle) used now so Phase 6 can add noseconeHandle without refactoring"
  - "pino and logger.ts added to knip ignoreDependencies/ignore — logger singleton not yet consumed in routes"
metrics:
  duration: "~8 minutes"
  completed_date: "2026-04-10"
  tasks_completed: 3
  files_changed: 10
---

# Phase 05 Plan 01: OTEL Instrumentation and Pino Logger Summary

OTEL SDK initialized with ESM-compatible import-in-the-middle hook, selective HTTP+undici auto-instrumentation, OTLP proto export to Aspire Dashboard, and pino logger singleton with trace correlation mixin.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install OTEL packages and pino | 7e5a749 | package.json, pnpm-lock.yaml |
| 2 | Extend Zod env schema and .env.example | 7fdf450 | src/lib/server/env/schema.ts, .env.example |
| 3 | Create instrumentation, logger, hooks | 7aee96c | src/instrumentation.server.ts, svelte.config.js, src/lib/server/logger.ts, src/hooks.server.ts, src/app.d.ts, knip.config.ts |

## Decisions Made

- **Selective auto-instrumentation**: Only `@opentelemetry/instrumentation-http` and `@opentelemetry/instrumentation-undici` enabled. All 35+ other instrumentations explicitly disabled to avoid startup cost and false spans from unused libraries.
- **process.env in instrumentation.server.ts**: Cannot use `$lib/server/env` — this file runs before SvelteKit module aliases are available. Uses `process.env` with fallbacks; Zod validation still runs at startup for hooks/routes.
- **process.env in logger.ts**: Pino initializes at module load time. Reading LOG_LEVEL from process.env directly is belt-and-suspenders alongside Zod validation.
- **sequence(otelHandle) now**: Wrapping the single handle in `sequence()` from the start means Phase 6 can add `noseconeHandle` (security headers) as `sequence(noseconeHandle, otelHandle)` without structural refactoring.
- **knip ignore for logger.ts and pino**: The logger singleton is a foundational export not yet consumed in routes. Added to knip ignore/ignoreDependencies to be removed when routes start using it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] knip failing due to drizzle.config.ts DATABASE_URL check**
- **Found during:** Task 3 verification (`pnpm run knip`)
- **Issue:** `drizzle.config.ts` throws `Error('DATABASE_URL is not set')` when loaded without the env var — a pre-existing condition that caused knip to exit with code 2 before reaching the OTEL-related checks
- **Fix:** Ran knip with `DATABASE_URL=postgres://...` prefix to bypass the error and see actual knip output
- **Files modified:** None (workaround via env prefix; this is a pre-existing issue in the repo)

**2. [Rule 2 - Missing Critical] knip flagging logger.ts as unused file and pino as unused dependency**
- **Found during:** Task 3 verification (knip output)
- **Issue:** `src/lib/server/logger.ts` is a foundational singleton not yet imported by any route — knip correctly identifies it as unused. `pino` is flagged as unused dependency for the same reason.
- **Fix:** Added `src/lib/server/logger.ts` to `knip.config.ts` `ignore` array and `pino` to `ignoreDependencies`, matching the pattern already used for `src/lib/server/db/index.ts`
- **Files modified:** knip.config.ts
- **Commit:** 7aee96c

**3. [Rule 2 - Missing Critical] knip hint: remove src/instrumentation.server.ts from ignore**
- **Found during:** Task 3 verification (knip configuration hint)
- **Issue:** Initial knip.config.ts draft included `src/instrumentation.server.ts` in `ignore` array, but knip's SvelteKit plugin already knows about it as an entry point and flagged the explicit ignore as unnecessary
- **Fix:** Removed `src/instrumentation.server.ts` from `ignore` array; knip traces it via SvelteKit plugin automatically
- **Files modified:** knip.config.ts
- **Commit:** 7aee96c

## Verification Results

All quality gates passed:

- `pnpm run check`: 1188 files, 0 errors, 0 warnings
- `pnpm run lint`: ESLint clean across all modified files
- `pnpm run knip` (with DATABASE_URL): No unused files, exports, or dependencies

Package verification:
```
all 6 packages in dependencies
```

All six artifacts from must_haves confirmed present:
- `src/instrumentation.server.ts`: NodeSDK + import-in-the-middle ESM hook + selective instrumentations + OTLP proto exporter + SIGTERM handler
- `src/lib/server/logger.ts`: pino singleton with `trace.getSpan(context.active())` mixin
- `src/lib/server/env/schema.ts`: OTEL_EXPORTER_OTLP_ENDPOINT, OTEL_SERVICE_NAME, LOG_LEVEL with defaults
- `src/hooks.server.ts`: `sequence(otelHandle)` setting `event.locals.traceId`/`spanId`
- `src/app.d.ts`: `App.Locals` with `traceId?: string` and `spanId?: string`
- `svelte.config.js`: `experimental.tracing.server: true` and `experimental.instrumentation.server: true`

## Known Stubs

None — all artifacts are fully wired. The logger singleton is not yet consumed by routes but that is intentional (Phase 5 Plan 2 or application code will add usage).

## Threat Flags

No new threat surface beyond what is documented in the plan's threat model. The OTLP endpoint remains localhost-only, logger.ts is server-only under `$lib/server/`, and span context IDs in locals are non-secret observability identifiers.

## Self-Check: PASSED

Files exist:
- src/instrumentation.server.ts: FOUND
- src/lib/server/logger.ts: FOUND
- src/lib/server/env/schema.ts: FOUND (modified)
- src/hooks.server.ts: FOUND (modified)
- src/app.d.ts: FOUND (modified)
- svelte.config.js: FOUND (modified)
- knip.config.ts: FOUND (modified)

Commits exist:
- 7e5a749: FOUND
- 7fdf450: FOUND
- 7aee96c: FOUND
