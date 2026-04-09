# Phase 5: Observability — Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire OpenTelemetry into the SvelteKit app so that every request produces traces visible in the Aspire Dashboard already running from Phase 2. This phase also adds structured logging with trace correlation and a health check endpoint.

**Already in place (do not re-implement):**

- Aspire Dashboard running in docker-compose.yml on ports 18888 (UI), 4317 (OTLP gRPC), 4318 (OTLP HTTP)
- PostgreSQL 17 running from Phase 2
- Drizzle ORM DB client singleton at `src/lib/server/db/index.ts`
- Zod-validated env module at `src/lib/server/env/`
- `hooks.server.ts` with basic `handle` function (imports env for startup validation)
- OBS-05 (Aspire Dashboard in docker-compose.yml) is already satisfied — do NOT modify docker-compose.yml

**What this phase delivers:**

- `src/instrumentation.server.ts` — OTEL SDK initialization (OBS-01)
- Selective auto-instrumentations for HTTP, postgres.js, fetch (OBS-02)
- OTLP/HTTP export to Aspire Dashboard (OBS-03)
- Structured logging with trace correlation (OBS-04)
- `GET /api/health` endpoint (OBS-06)

</domain>

<decisions>
## Implementation Decisions

### OTEL SDK Initialization

- **D-01:** Use `src/instrumentation.server.ts` — the SvelteKit standard hook for server-side initialization before any app code loads. This is the documented pattern from https://svelte.dev/docs/kit/observability
- **D-02:** Use `@opentelemetry/sdk-node` NodeSDK class for one-shot setup. Do not use the legacy `BasicTracerProvider` pattern.
- **D-03:** The OTEL SDK must be initialized with `sdk.start()` (not awaited — synchronous start) before SvelteKit loads routes.

### Auto-Instrumentation Strategy

- **D-04:** Use `@opentelemetry/auto-instrumentations-node` but configure it selectively — disable all instrumentations except `@opentelemetry/instrumentation-http`, `@opentelemetry/instrumentation-undici` (Node.js fetch), and postgres.js instrumentation.
- **D-05:** Do NOT use the mega-bundle (all instrumentations enabled). Explicitly pass `getNodeAutoInstrumentations` with per-instrumentation `enabled: false` for all except the three needed.
- **D-06:** `import-in-the-middle` is required as an ESM loader hook for auto-instrumentation to work with ESM modules. Install as a runtime dependency.

### OTLP Exporter

- **D-07:** Use `@opentelemetry/exporter-trace-otlp-proto` (protobuf over HTTP) — NOT the JSON variant (`otlp-http`). CLAUDE.md explicitly requires this.
- **D-08:** OTLP endpoint: `http://localhost:4318/v1/traces` (the OTLP HTTP port mapped from Aspire's internal 18890).
- **D-09:** Service name: `sveltekit-starter` (matches project name).

### Structured Logging

- **D-10:** Use `pino` for structured logging — fastest Node.js JSON logger, well-supported, zero-dependency.
- **D-11:** Configure pino with `formatters.log` to include OpenTelemetry trace/span IDs in every log record for correlation.
- **D-12:** Export a singleton `logger` from `src/lib/server/logger.ts` — server-only, imported wherever logging is needed.
- **D-13:** Log level controlled via `LOG_LEVEL` env var (default: `info`). Add `LOG_LEVEL` to `.env.example` and Zod schema.

### Health Check Endpoint

- **D-14:** Route: `src/routes/api/health/+server.ts`
- **D-15:** `GET /api/health` checks DB connectivity by running a simple `SELECT 1` via the Drizzle client.
- **D-16:** Response shape: `{ status: 'ok' | 'error', db: 'ok' | 'error', timestamp: string (ISO 8601) }`
- **D-17:** Returns HTTP 200 when healthy, 503 when DB check fails.
- **D-18:** Health check does NOT use Drizzle ORM query builder — uses the underlying `postgres.js` client for a minimal `SELECT 1` to avoid ORM overhead.

### Environment Variables

- **D-19:** Add to `.env.example` and Zod schema:
  - `OTEL_EXPORTER_OTLP_ENDPOINT` — default `http://localhost:4318` (OTLP HTTP base URL)
  - `OTEL_SERVICE_NAME` — default `sveltekit-starter`
  - `LOG_LEVEL` — default `info`
- **D-20:** The OTEL SDK reads `OTEL_EXPORTER_OTLP_ENDPOINT` and `OTEL_SERVICE_NAME` from env vars directly (standard OTEL env var convention) — these are also accepted by the OTEL Node SDK natively.

### hooks.server.ts Enrichment

- **D-21:** After OTEL is wired, enrich `hooks.server.ts` to add trace context to response locals (for use by logging middleware). Keep the existing `sequence()` placeholder approach in mind — Phase 6 will use `sequence()` for security headers, so leave the door open.

### Claude's Discretion

- Exact pino configuration options (transport, prettyPrint for dev vs prod)
- Whether to add `OTEL_EXPORTER_OTLP_ENDPOINT` to the existing Zod env schema or keep it optional with a fallback
- Specific disabled instrumentations list in `getNodeAutoInstrumentations` config (which ones to pass `enabled: false`)

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements

- `.planning/REQUIREMENTS.md` §Observability — OBS-01 through OBS-06 define exact acceptance criteria

### Technology Stack

- `CLAUDE.md` §Technology Stack — OTEL package names and versions
- `CLAUDE.md` §What NOT to Use — use `otlp-proto`, NOT `otlp-http`

### Existing Infrastructure (Phases 2-4)

- `docker-compose.yml` — Aspire Dashboard already configured (ports 18888, 4317, 4318); PostgreSQL on 5432
- `src/lib/server/env/` — Zod-validated env module; add OTEL + LOG_LEVEL vars here
- `src/lib/server/db/index.ts` — Drizzle DB client singleton; health check imports from here
- `src/hooks.server.ts` — Basic handle function; Phase 5 enriches it with OTEL span correlation

### SvelteKit Observability Docs

- https://svelte.dev/docs/kit/observability — instrumentation.server.ts pattern (HIGH confidence)

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `src/lib/server/env/index.ts` — exports validated `env` object; OTEL vars added here
- `src/lib/server/db/index.ts` — exports `db` (Drizzle client); health check can use underlying postgres client
- `src/hooks.server.ts` — existing handle function; will be enriched with OTEL span correlation locals

### Established Patterns

- pnpm is the package manager
- Server-only code in `src/lib/server/` — logger singleton goes there
- TypeScript everywhere — `instrumentation.server.ts` is TypeScript
- Runtime env vars via `$env/dynamic/private` (through validated env module)
- No auto-migration on startup; same principle applies to OTEL — initialize eagerly but cleanly

### Integration Points

- Phase 6 (Security): `hooks.server.ts` will be refactored to use `sequence()` — Phase 5 should add OTEL enrichment as a separate `handle` function so Phase 6 can compose it cleanly
- Phase 7 (Testing): Health check endpoint will be tested in API integration tests
- Phase 8 (Production Docker): OTEL endpoint will need to be configurable per-deployment via env vars (already handled by D-19/D-20)

### Current hooks.server.ts

```typescript
import '$lib/server/env';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  return resolve(event);
};
```

</code_context>

<specifics>
## Specific Ideas

- `instrumentation.server.ts` runs in the SvelteKit server before any route/hook code — the right place for `sdk.start()`
- Use `process.on('SIGTERM', () => sdk.shutdown())` for graceful shutdown
- Pino's `mixin` option can inject OTEL trace context into every log line automatically
- The health check route should be lightweight — no auth, no heavy processing, just DB ping
- State blocker noted in STATE.md: "Phase 5 (Observability): SvelteKit OTEL uses `experimental.tracing` flag -- may need to verify API stability" — research must confirm whether `experimental.tracing` is still needed in current SvelteKit 2.x

</specifics>

<deferred>
## Deferred Ideas

- Log shipping to Aspire via OTEL log exporter (OBS-04 scoped to structured JSON only, not OTEL log pipeline)
- Metrics export (beyond traces) — deferred to v2
- Rate limiting on health check endpoint — deferred to Phase 6 or v2
- Error tracking integration (e.g., Sentry) — out of scope (external account required)

</deferred>

---

_Phase: 05-observability_
_Context gathered: 2026-04-09_
