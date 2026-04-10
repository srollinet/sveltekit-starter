---
phase: 05-observability
verified: 2026-04-10T00:00:00Z
status: human_needed
score: 7/10 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Traces appear in Aspire Dashboard after hitting any page"
    expected: "Aspire Dashboard at localhost:18888 shows HTTP spans from sveltekit-starter service for each request"
    why_human: "Requires running docker compose + pnpm run dev; cannot verify span delivery without live OTLP pipeline"
  - test: "GET /api/health returns 200 with DB up, 503 with DB down"
    expected: "curl http://localhost:5173/api/health returns {status:'ok',db:'ok',timestamp:...} with HTTP 200 when DB is running; HTTP 503 with {status:'error',db:'error'} after docker compose stop db"
    why_human: "Requires live running stack; SUMMARY-02 claims this was already approved at Task 3 checkpoint"
  - test: "Application log lines are structured JSON with trace_id and span_id fields"
    expected: "Terminal output from pnpm run dev shows JSON log lines including trace_id and span_id when a span is active"
    why_human: "Runtime output cannot be verified statically; requires active OTEL span during request"
---

# Phase 5: Observability Verification Report

**Phase Goal:** Every request to the SvelteKit app produces traces and metrics visible in the Aspire Dashboard (already running from Phase 2), with structured logging and a health check endpoint
**Verified:** 2026-04-10T00:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | OTEL SDK initializes before any SvelteKit route code runs | VERIFIED | `src/instrumentation.server.ts` exists with `sdk.start()` called; `svelte.config.js` has `experimental.instrumentation.server: true` and `experimental.tracing.server: true` |
| 2 | HTTP and fetch (undici) spans are auto-instrumented — all others disabled | VERIFIED | `getNodeAutoInstrumentations` in instrumentation.server.ts: `@opentelemetry/instrumentation-http: {enabled:true}`, `@opentelemetry/instrumentation-undici: {enabled:true}`, 35+ others `{enabled:false}` |
| 3 | Traces are exported via OTLP/HTTP protobuf to Aspire Dashboard at port 4318 | VERIFIED | `OTLPTraceExporter({ url: (process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318') + '/v1/traces' })` in instrumentation.server.ts; `@opentelemetry/exporter-trace-otlp-proto` installed (not the forbidden otlp-http) |
| 4 | Every pino log line includes trace_id and span_id from the active OTEL span | VERIFIED (code) | `mixin()` in logger.ts calls `trace.getSpan(context.active())` and returns `{trace_id, span_id, trace_flags}`; runtime output needs human confirmation |
| 5 | LOG_LEVEL, OTEL_EXPORTER_OTLP_ENDPOINT, and OTEL_SERVICE_NAME are Zod-validated at startup | VERIFIED | `src/lib/server/env/schema.ts` has all three fields with `.default()` values; schema imported in hooks.server.ts on startup |
| 6 | hooks.server.ts exposes traceId/spanId on event.locals via a composable otelHandle function | VERIFIED | `otelHandle` function exists in hooks.server.ts; calls `trace.getSpan(context.active())` and sets `event.locals.traceId` / `event.locals.spanId`; exported as `export const handle = sequence(otelHandle)` |
| 7 | GET /api/health returns HTTP 200 with { status: ok, db: ok, timestamp } when database is up | VERIFIED (code) | `src/routes/api/health/+server.ts` exports `GET` handler; returns `json({status:'ok',db:'ok',timestamp},{status:200})` on success |
| 8 | GET /api/health returns HTTP 503 with { status: error, db: error, timestamp } when database is unreachable | VERIFIED (code) | `catch` block returns `json({status:'error',db:'error',timestamp},{status:503})`; SUMMARY-02 states human checkpoint was approved |
| 9 | The health check uses a raw SELECT 1 — not Drizzle ORM — to minimize overhead | VERIFIED | Line 22: `await client\`SELECT 1\`` using the raw postgres.js client, not Drizzle |
| 10 | Traces appear in Aspire Dashboard after hitting any page | NEEDS HUMAN | Code path is wired (SDK + exporter + experimental flags) but runtime delivery to Aspire requires live stack verification |

**Score:** 7/10 truths verified automatically (3 require human/runtime confirmation)

### Deferred Items

None.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/instrumentation.server.ts` | OTEL SDK initialization with import-in-the-middle ESM hook | VERIFIED | File exists, 76 lines; contains NodeSDK, createAddHookMessageChannel, register(), sdk.start(), SIGTERM handler |
| `src/lib/server/logger.ts` | Pino singleton with OTEL trace mixin | VERIFIED | Exports `logger`; mixin calls `trace.getSpan(context.active())`; formatters.level returns label string |
| `src/lib/server/env/schema.ts` | Extended Zod schema with OTEL + LOG_LEVEL env vars | VERIFIED | 10 lines; z.object with DATABASE_URL, OTEL_EXPORTER_OTLP_ENDPOINT (default), OTEL_SERVICE_NAME (default), LOG_LEVEL enum (default 'info') |
| `src/routes/api/health/+server.ts` | GET /api/health endpoint | VERIFIED | File exists, 29 lines; exports GET; imports client and logger; uses raw SELECT 1 |
| `src/lib/server/db/index.ts` | DB singleton exposing raw postgres.js client | VERIFIED | Exports both `client` (raw postgres.js Sql) and `db` (Drizzle ORM) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/instrumentation.server.ts` | Aspire Dashboard OTLP endpoint | `OTLPTraceExporter` at `http://localhost:4318/v1/traces` | WIRED | Line 6: import OTLPTraceExporter from otlp-proto; line 17-20: url set with /v1/traces suffix |
| `src/lib/server/logger.ts` | `@opentelemetry/api` | `trace.getSpan(context.active())` in mixin() | WIRED | Line 4: `import { trace, context } from '@opentelemetry/api'`; line 9: `trace.getSpan(context.active())` |
| `src/hooks.server.ts` | `event.locals.traceId / spanId` | `otelHandle` function wrapped in `sequence()` | WIRED | Line 22: `export const handle = sequence(otelHandle)`; otelHandle sets both traceId and spanId on event.locals |
| `src/routes/api/health/+server.ts` | `src/lib/server/db/index.ts` | `import { client } from '$lib/server/db'` | WIRED | Line 4: `import { client } from '$lib/server/db'`; line 22: `await client\`SELECT 1\`` |
| `src/routes/api/health/+server.ts` | `src/lib/server/logger.ts` | `import { logger } from '$lib/server/logger'` | WIRED | Line 5: `import { logger } from '$lib/server/logger'`; line 26: `logger.error({ err }, ...)` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `src/routes/api/health/+server.ts` | `timestamp` | `new Date().toISOString()` | Yes — real ISO timestamp | FLOWING |
| `src/routes/api/health/+server.ts` | `status`, `db` | `try { await client\`SELECT 1\` }` | Yes — live DB query | FLOWING |
| `src/lib/server/logger.ts` | `trace_id`, `span_id` | `trace.getSpan(context.active())` | Depends on active span — returns `{}` if no span | FLOWING (conditional) |
| `src/hooks.server.ts` | `event.locals.traceId/spanId` | `trace.getSpan(context.active())` | Depends on active OTEL span in context | FLOWING (conditional) |

### Behavioral Spot-Checks

Step 7b: SKIPPED for truths requiring live server and database (cannot test without running stack). The following automated checks passed:

| Behavior | Check | Result | Status |
|----------|-------|--------|--------|
| All 6 OTEL packages in dependencies | `node -e` check against package.json | All present, correct versions | PASS |
| Forbidden `exporter-trace-otlp-http` absent | package.json dependencies check | Not installed | PASS |
| svelte.config.js experimental flags | File read | Both `tracing.server` and `instrumentation.server` set to `true` | PASS |
| `client` and `db` both exported from db/index.ts | File read | `export const client` and `export const db` both present | PASS |
| OTLPTraceExporter uses `/v1/traces` suffix | Grep on instrumentation.server.ts | Explicit suffix appended | PASS |
| All claimed commits exist | `git log` | 7e5a749, 7fdf450, 7aee96c, 5bc5812, 565bf35 all verified | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| OBS-01 | 05-01 | `src/instrumentation.server.ts` initializes OTEL SDK before any app code | SATISFIED | File exists with NodeSDK.start() + experimental flags in svelte.config.js |
| OBS-02 | 05-01 | Selective OTEL auto-instrumentations: HTTP, postgres.js, fetch (not mega-bundle) | PARTIALLY SATISFIED | HTTP and undici (fetch) enabled; postgres.js instrumentation absent — no official OTEL package for postgres.js driver exists (confirmed in 05-RESEARCH.md). Selective configuration is implemented correctly. |
| OBS-03 | 05-01 | Traces exported via OTLP/HTTP to local Aspire Dashboard | SATISFIED | OTLPTraceExporter with proto (not JSON) pointed at port 4318/v1/traces |
| OBS-04 | 05-01 | Structured logging (pino) with log records including trace context | SATISFIED | pino singleton with mixin() injecting trace_id/span_id; OTEL pipeline correlation established |
| OBS-05 | Phase 2 | .NET Aspire Dashboard container in docker-compose.yml | SATISFIED (Phase 2) | docker-compose.yml has `aspire-dashboard` service on ports 18888, 4317, 4318 — delivered in Phase 2 as documented in research |
| OBS-06 | 05-02 | `GET /api/health` endpoint returning `{ status, db, timestamp }` | SATISFIED | src/routes/api/health/+server.ts with 200/503 responses; SUMMARY-02 reports human checkpoint approved |

**OBS-02 note:** The requirement text mentions `postgres.js` instrumentation. The research phase (05-RESEARCH.md) established that no official OTEL package instruments the `postgres` npm package (only `pg`/node-postgres has an official package). The implementation correctly selects HTTP + undici (fetch) and skips the unavailable postgres.js instrumentation. This is a documented, intentional deviation — not a gap.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/instrumentation.server.ts` | 71-75 | SIGTERM handler does not await process exit after shutdown — spans may be lost on Docker stop | Warning | Spans in flight at shutdown may not be flushed to Aspire; does not affect correctness in dev |
| `src/lib/server/logger.ts` | 6 | `LOG_LEVEL` read from `process.env` directly, bypassing Zod-validated `env` module | Info | Invalid LOG_LEVEL values silently fall through; Zod schema validates at startup via hooks import but not before logger initializes |
| `.env.example` | 14 | Comment references "Phase 4" for DATABASE_URL (Phase 4 is complete) | Info | Misleading to developers cloning the template |
| `svelte.config.js` | 9-15 | Both `experimental.tracing.server` and `experimental.instrumentation.server` set; `tracing` is the older flag | Info | Harmless currently; may produce deprecation warning in future SvelteKit minor |

No blockers found. All anti-patterns are warnings or info-level from the existing code review (05-REVIEW.md).

### Human Verification Required

#### 1. Aspire Dashboard Traces

**Test:** Start the stack (`docker compose up -d && pnpm run dev`), then navigate to any page in the browser. Open Aspire Dashboard at http://localhost:18888.
**Expected:** Traces from `sveltekit-starter` service appear in the Traces tab showing HTTP spans for each request. Spans should have traceId and operation names like `GET /` or `GET /api/health`.
**Why human:** Cannot verify OTLP export delivery without a running Aspire Dashboard and live HTTP traffic.

#### 2. GET /api/health end-to-end with live DB

**Test:** With `docker compose up -d` and `pnpm run dev` running: `curl -s http://localhost:5173/api/health | jq .`
**Expected:** `{ "status": "ok", "db": "ok", "timestamp": "2026-..." }` with HTTP 200. Then `docker compose stop db`, re-run curl, expect `{ "status": "error", "db": "error", "timestamp": "..." }` with HTTP 503.
**Why human:** Requires live database and running dev server; SUMMARY-02 states Task 3 checkpoint was approved but this is not independently verifiable from artifacts.

#### 3. Structured log output with trace correlation

**Test:** With the dev server running and OTEL active, make a request to `/api/health`. Observe the terminal output.
**Expected:** Log lines appear as JSON (not plain text) and include `trace_id` and `span_id` fields alongside `level`, `time`, and `msg` fields.
**Why human:** Runtime log output cannot be verified statically; requires active OTEL span in context.

### Gaps Summary

No automated gaps blocking goal achievement. All code artifacts exist, are substantive, and are correctly wired.

The three human verification items above reflect runtime behaviors that cannot be verified statically. The SUMMARY for Plan 02 states the Task 3 human checkpoint was "approved" by the developer — if that approval is accepted, the phase can be considered complete.

One requirement note: OBS-02's postgres.js instrumentation clause is unmet due to the absence of an official OTEL package for the `postgres` npm driver. The research phase documented this as a known limitation, and the plan truths were updated accordingly. No gap is raised here — this is a documented intentional deviation.

---

_Verified: 2026-04-10T00:00:00Z_
_Verifier: Claude (gsd-verifier)_
