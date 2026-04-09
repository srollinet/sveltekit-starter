# Phase 5: Observability — Research

**Researched:** 2026-04-09
**Domain:** OpenTelemetry + SvelteKit 2 + pino structured logging
**Confidence:** HIGH (core patterns verified against official docs and npm registry)

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Use `src/instrumentation.server.ts` — the SvelteKit standard hook for server-side initialization before any app code loads.
- **D-02:** Use `@opentelemetry/sdk-node` NodeSDK class for one-shot setup. Do not use the legacy `BasicTracerProvider` pattern.
- **D-03:** The OTEL SDK must be initialized with `sdk.start()` (not awaited — synchronous start) before SvelteKit loads routes.
- **D-04:** Use `@opentelemetry/auto-instrumentations-node` but configure it selectively — disable all except `@opentelemetry/instrumentation-http`, `@opentelemetry/instrumentation-undici` (Node.js fetch), and postgres.js instrumentation.
- **D-05:** Do NOT use the mega-bundle (all instrumentations enabled). Explicitly pass `getNodeAutoInstrumentations` with per-instrumentation `enabled: false`.
- **D-06:** `import-in-the-middle` is required as an ESM loader hook. Install as a runtime dependency.
- **D-07:** Use `@opentelemetry/exporter-trace-otlp-proto` (protobuf over HTTP) — NOT `otlp-http`.
- **D-08:** OTLP endpoint: `http://localhost:4318` (base URL — `/v1/traces` is appended automatically by the exporter).
- **D-09:** Service name: `sveltekit-starter`.
- **D-10:** Use `pino` for structured logging.
- **D-11:** Configure pino with `mixin` to include OpenTelemetry trace/span IDs in every log record.
- **D-12:** Export a singleton `logger` from `src/lib/server/logger.ts`.
- **D-13:** Log level controlled via `LOG_LEVEL` env var (default: `info`). Add to `.env.example` and Zod schema.
- **D-14:** Route: `src/routes/api/health/+server.ts`
- **D-15:** Health check runs `SELECT 1` via postgres.js client directly.
- **D-16:** Response shape: `{ status: 'ok' | 'error', db: 'ok' | 'error', timestamp: string (ISO 8601) }`
- **D-17:** HTTP 200 when healthy, 503 when DB check fails.
- **D-18:** Health check does NOT use Drizzle ORM query builder — uses underlying postgres.js client.
- **D-19:** Add to `.env.example` and Zod schema: `OTEL_EXPORTER_OTLP_ENDPOINT` (default `http://localhost:4318`), `OTEL_SERVICE_NAME` (default `sveltekit-starter`), `LOG_LEVEL` (default `info`).
- **D-20:** OTEL SDK reads `OTEL_EXPORTER_OTLP_ENDPOINT` and `OTEL_SERVICE_NAME` from env vars natively.
- **D-21:** Enrich `hooks.server.ts` to add trace context to response locals; keep as separate handle function so Phase 6 can compose with `sequence()`.

### Claude's Discretion

- Exact pino configuration options (transport, prettyPrint for dev vs prod)
- Whether to add `OTEL_EXPORTER_OTLP_ENDPOINT` to the existing Zod env schema or keep it optional with a fallback
- Specific disabled instrumentations list in `getNodeAutoInstrumentations` config

### Deferred Ideas (OUT OF SCOPE)

- Log shipping to Aspire via OTEL log exporter
- Metrics export (beyond traces)
- Rate limiting on health check endpoint
- Error tracking integration (e.g., Sentry)
  </user_constraints>

<phase_requirements>

## Phase Requirements

| ID     | Description                                                                        | Research Support                                                                                                                                    |
| ------ | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| OBS-01 | `src/instrumentation.server.ts` — OTEL SDK init before any app code loads          | SvelteKit official docs confirm this file is the correct location; experimental flags required                                                      |
| OBS-02 | Selective auto-instrumentations (HTTP, postgres.js, fetch — NOT the mega-bundle)   | `getNodeAutoInstrumentations` supports per-key `enabled: false`; note: no official postgres.js instrumentation in the bundle (see Critical Finding) |
| OBS-03 | Traces via OTLP/HTTP to Aspire Dashboard (port 4318)                               | `OTLPTraceExporter` with base URL `http://localhost:4318`; appends `/v1/traces` automatically                                                       |
| OBS-04 | Structured logging (pino) with trace correlation IDs in every log line             | pino `mixin()` with `trace.getSpan(context.active())` from `@opentelemetry/api`                                                                     |
| OBS-05 | Aspire Dashboard already in docker-compose.yml — DO NOT modify                     | Already satisfied; no action needed                                                                                                                 |
| OBS-06 | `GET /api/health` returns `{ status, db, timestamp }` — 200 healthy, 503 unhealthy | SvelteKit `+server.ts` with raw postgres.js `SELECT 1`                                                                                              |

</phase_requirements>

---

## Summary

OpenTelemetry integration with SvelteKit 2 uses the `src/instrumentation.server.ts` file, which requires two experimental flags in `svelte.config.js`: `experimental.tracing.server` and `experimental.instrumentation.server`. Both flags were introduced in SvelteKit 2.31.0 and are documented as experimental but stable for use. The `instrumentation.server.ts` is guaranteed to run before any application code, making it the correct location for `sdk.start()`.

**Critical finding on postgres.js instrumentation:** The official `@opentelemetry/auto-instrumentations-node` bundle does NOT include instrumentation for the `postgres` package (postgres.js). It includes `@opentelemetry/instrumentation-pg` which instruments the `pg` (node-postgres) driver only. This project uses `postgres.js` (the `postgres` npm package). There is no official OTEL instrumentation for postgres.js; community alternatives exist but are not suitable for a production starter template. For this phase, DB tracing is handled via the health check endpoint only — postgres.js queries will not produce OTEL spans from the auto-instrumentation bundle.

Structured logging with pino uses the `mixin()` function to inject `trace_id` and `span_id` from the active OpenTelemetry span context into every log record. The OTEL API's `trace.getSpan(context.active())` provides access to the current span.

**Primary recommendation:** Wire `instrumentation.server.ts` with selective HTTP + undici instrumentations only (skip postgres.js claim from CONTEXT.md D-04 since no official package exists), use pino mixin for trace correlation, and expose `/api/health` with raw `SELECT 1`.

---

## Standard Stack

### Core

| Library                                     | Version  | Purpose                                         | Why Standard                                                                                                  |
| ------------------------------------------- | -------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `@opentelemetry/sdk-node`                   | ^0.214.0 | NodeSDK one-shot OTEL setup                     | Official Node.js SDK; `NodeSDK` class handles tracer provider, context propagation, and exporters in one call |
| `@opentelemetry/auto-instrumentations-node` | ^0.72.0  | Auto-instrument HTTP, undici, and 30+ libraries | Umbrella package; provides `getNodeAutoInstrumentations()` with per-library opt-out                           |
| `@opentelemetry/exporter-trace-otlp-proto`  | ^0.214.0 | OTLP/HTTP protobuf exporter                     | CLAUDE.md requires proto variant; more efficient than JSON over HTTP                                          |
| `@opentelemetry/api`                        | ^1.9.1   | OTEL API for span context access                | Required for `trace.getSpan(context.active())` in pino mixin; peer dep of sdk-node                            |
| `import-in-the-middle`                      | ^3.0.0   | ESM module hook loader                          | Required for auto-instrumentation to intercept ESM modules in Node.js                                         |
| `pino`                                      | ^10.3.1  | Structured JSON logger                          | Fastest Node.js JSON logger; `mixin()` enables trace correlation                                              |

### Supporting

| Library                               | Version | Purpose                        | When to Use                                                                                  |
| ------------------------------------- | ------- | ------------------------------ | -------------------------------------------------------------------------------------------- |
| `@opentelemetry/instrumentation-pino` | ^0.60.0 | Automatic pino trace injection | Alternative to manual `mixin()` — auto-injects trace fields without code in logger singleton |

**Note on `@opentelemetry/instrumentation-pino`:** This package is included in the auto-instrumentations-node bundle and can automatically inject trace context into pino records. However, it requires pino to be instrumented (module-hooked via import-in-the-middle). The manual `mixin()` approach is simpler and does not depend on module hooking order. Decision D-11 mandates `mixin()` — use that.

### Alternatives Considered

| Instead of                   | Could Use                             | Tradeoff                                                                                                     |
| ---------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| pino mixin                   | `@opentelemetry/instrumentation-pino` | Pino instrumentation is auto but depends on hook registration order; mixin is explicit and reliable          |
| `OTLPTraceExporter` (proto)  | `OTLPTraceExporter` (JSON)            | CLAUDE.md explicitly forbids the JSON variant; proto is the requirement                                      |
| Manual `BasicTracerProvider` | `NodeSDK`                             | NodeSDK is the current documented pattern; BasicTracerProvider requires manual wiring of context propagators |

**Installation:**

```bash
pnpm add @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-trace-otlp-proto @opentelemetry/api import-in-the-middle pino
```

**Version verification:** [VERIFIED: npm registry, 2026-04-09]

- `@opentelemetry/sdk-node`: 0.214.0
- `@opentelemetry/auto-instrumentations-node`: 0.72.0
- `@opentelemetry/exporter-trace-otlp-proto`: 0.214.0
- `@opentelemetry/api`: 1.9.1
- `import-in-the-middle`: 3.0.1
- `pino`: 10.3.1

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── instrumentation.server.ts    # OTEL SDK init (runs before all app code)
├── hooks.server.ts              # Enriched with otelHandle for trace-to-locals
├── lib/
│   └── server/
│       ├── env/
│       │   ├── index.ts         # (existing) Zod-validated env — add OTEL vars
│       │   └── schema.ts        # (existing) Zod schema — add 3 new fields
│       ├── db/
│       │   └── index.ts         # (existing) — expose raw postgres client for health check
│       └── logger.ts            # NEW: pino singleton with OTEL mixin
└── routes/
    └── api/
        └── health/
            └── +server.ts       # NEW: GET /api/health
```

### svelte.config.js Changes Required

Both experimental flags are required for `instrumentation.server.ts` to work:

```javascript
// Source: https://svelte.dev/docs/kit/observability
/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    experimental: {
      tracing: {
        server: true,
      },
      instrumentation: {
        server: true,
      },
    },
  },
};
```

[VERIFIED: https://svelte.dev/docs/kit/observability and https://svelte.dev/blog/sveltekit-integrated-observability]

### Pattern 1: instrumentation.server.ts — OTEL SDK Initialization

**What:** ESM-compatible OTEL setup using `import-in-the-middle` message channel + `NodeSDK`
**When to use:** Always — this is the only supported pattern for ESM SvelteKit with auto-instrumentation

```typescript
// Source: https://svelte.dev/docs/kit/observability + https://svelte.dev/blog/sveltekit-integrated-observability
// src/instrumentation.server.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { createAddHookMessageChannel } from 'import-in-the-middle';
import { register } from 'node:module';

// Required for ESM auto-instrumentation — registers the import hook
const { registerOptions } = createAddHookMessageChannel();
register('import-in-the-middle/hook.mjs', import.meta.url, registerOptions);

const sdk = new NodeSDK({
  // OTEL_SERVICE_NAME env var is read natively by NodeSDK — fallback for safety
  serviceName: process.env.OTEL_SERVICE_NAME ?? 'sveltekit-starter',
  traceExporter: new OTLPTraceExporter({
    // OTEL_EXPORTER_OTLP_ENDPOINT env var is read natively — fallback for safety
    // The exporter appends /v1/traces to the base URL automatically
    url: (process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318') + '/v1/traces',
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      // Disable all by default, enable only what we need
      '@opentelemetry/instrumentation-http': { enabled: true },
      '@opentelemetry/instrumentation-undici': { enabled: true }, // Node.js native fetch
      // Everything else explicitly disabled
      '@opentelemetry/instrumentation-amqplib': { enabled: false },
      '@opentelemetry/instrumentation-aws-lambda': { enabled: false },
      '@opentelemetry/instrumentation-aws-sdk': { enabled: false },
      '@opentelemetry/instrumentation-bunyan': { enabled: false },
      '@opentelemetry/instrumentation-cassandra-driver': { enabled: false },
      '@opentelemetry/instrumentation-connect': { enabled: false },
      '@opentelemetry/instrumentation-cucumber': { enabled: false },
      '@opentelemetry/instrumentation-dataloader': { enabled: false },
      '@opentelemetry/instrumentation-dns': { enabled: false },
      '@opentelemetry/instrumentation-express': { enabled: false },
      '@opentelemetry/instrumentation-fs': { enabled: false },
      '@opentelemetry/instrumentation-generic-pool': { enabled: false },
      '@opentelemetry/instrumentation-graphql': { enabled: false },
      '@opentelemetry/instrumentation-grpc': { enabled: false },
      '@opentelemetry/instrumentation-hapi': { enabled: false },
      '@opentelemetry/instrumentation-ioredis': { enabled: false },
      '@opentelemetry/instrumentation-kafkajs': { enabled: false },
      '@opentelemetry/instrumentation-knex': { enabled: false },
      '@opentelemetry/instrumentation-koa': { enabled: false },
      '@opentelemetry/instrumentation-lru-memoizer': { enabled: false },
      '@opentelemetry/instrumentation-mongodb': { enabled: false },
      '@opentelemetry/instrumentation-mongoose': { enabled: false },
      '@opentelemetry/instrumentation-mysql': { enabled: false },
      '@opentelemetry/instrumentation-mysql2': { enabled: false },
      '@opentelemetry/instrumentation-nestjs-core': { enabled: false },
      '@opentelemetry/instrumentation-net': { enabled: false },
      '@opentelemetry/instrumentation-openai': { enabled: false },
      '@opentelemetry/instrumentation-oracledb': { enabled: false },
      '@opentelemetry/instrumentation-pg': { enabled: false }, // we use postgres.js, not pg
      '@opentelemetry/instrumentation-pino': { enabled: false }, // using manual mixin instead
      '@opentelemetry/instrumentation-redis': { enabled: false },
      '@opentelemetry/instrumentation-restify': { enabled: false },
      '@opentelemetry/instrumentation-runtime-node': { enabled: false },
      '@opentelemetry/instrumentation-socket.io': { enabled: false },
      '@opentelemetry/instrumentation-winston': { enabled: false },
    }),
  ],
});

// sdk.start() is synchronous (returns void, not Promise)
sdk.start();

// Graceful shutdown — sdk.shutdown() returns Promise<void>
process.on('SIGTERM', () => {
  sdk.shutdown().catch((err) => {
    console.error('Error shutting down OTEL SDK:', err);
  });
});
```

**Alternative: use OTEL_NODE_ENABLED_INSTRUMENTATIONS env var** (simpler but less explicit):

```bash
OTEL_NODE_ENABLED_INSTRUMENTATIONS=http,undici
```

This is equivalent but relies on env var convention rather than code. The explicit code approach is preferred for a starter template since it's self-documenting.

### Pattern 2: pino logger singleton with OTEL trace correlation

**What:** Singleton pino logger that injects trace_id and span_id from the active OTEL span into every log line
**When to use:** Import this logger everywhere instead of `console.log`

```typescript
// Source: pino docs + @opentelemetry/api trace.getSpan pattern
// src/lib/server/logger.ts
import pino from 'pino';
import { trace, context } from '@opentelemetry/api';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  mixin() {
    const span = trace.getSpan(context.active());
    if (!span) return {};
    const ctx = span.spanContext();
    return {
      trace_id: ctx.traceId,
      span_id: ctx.spanId,
      trace_flags: ctx.traceFlags,
    };
  },
  formatters: {
    level(label) {
      return { level: label }; // Use label string instead of number for readability
    },
  },
  // In development, use pino-pretty via transport (optional — planner can decide)
  // transport: process.env.NODE_ENV === 'development'
  //   ? { target: 'pino-pretty', options: { colorize: true } }
  //   : undefined,
});
```

**Log output shape (every line):**

```json
{
  "level": "info",
  "time": 1712600000000,
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "span_id": "00f067aa0ba902b7",
  "trace_flags": 1,
  "msg": "Request received"
}
```

### Pattern 3: hooks.server.ts enrichment for OTEL span-to-locals

**What:** Separate `otelHandle` function that adds trace context to `event.locals` for downstream use; compatible with Phase 6's `sequence()` composition

```typescript
// Source: SvelteKit handle pattern + @opentelemetry/api
// src/hooks.server.ts
import '$lib/server/env';
import type { Handle } from '@sveltejs/kit';
import { trace, context } from '@opentelemetry/api';
import { sequence } from '@sveltejs/kit/hooks';

const otelHandle: Handle = async ({ event, resolve }) => {
  const span = trace.getSpan(context.active());
  if (span) {
    const ctx = span.spanContext();
    event.locals.traceId = ctx.traceId;
    event.locals.spanId = ctx.spanId;
  }
  return resolve(event);
};

// Export using sequence() so Phase 6 can add nosecone handle before/after
export const handle = sequence(otelHandle);
```

**app.d.ts additions required:**

```typescript
// src/app.d.ts
declare global {
  namespace App {
    interface Locals {
      traceId?: string;
      spanId?: string;
    }
  }
}
export {};
```

### Pattern 4: Health check endpoint

**What:** Minimal DB liveness probe using raw postgres.js client (not Drizzle ORM)

```typescript
// src/routes/api/health/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { logger } from '$lib/server/logger';

export const GET: RequestHandler = async () => {
  const timestamp = new Date().toISOString();

  try {
    // Access the underlying postgres.js client from the drizzle instance
    // Drizzle exposes the client via db.$client (the raw postgres.js sql object)
    await db.$client`SELECT 1`;

    return json({ status: 'ok', db: 'ok', timestamp }, { status: 200 });
  } catch (err) {
    logger.error({ err }, 'Health check DB query failed');
    return json({ status: 'error', db: 'error', timestamp }, { status: 503 });
  }
};
```

**Important:** Drizzle exposes the raw postgres.js client as `db.$client` (the typed `sql` tagged template tag). This avoids importing the raw postgres client separately. [ASSUMED — verify `db.$client` accessor exists in drizzle-orm 0.45.x; alternative is to export `client` directly from `src/lib/server/db/index.ts`]

### Pattern 5: Environment variable additions

**Zod schema additions** (`src/lib/server/env/schema.ts`):

```typescript
import { z } from 'zod';

export const envSchema = z.object({
  DATABASE_URL: z.url({
    error: 'DATABASE_URL must be a valid connection URL (e.g. postgres://user:pass@host:5432/db)',
  }),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.url().default('http://localhost:4318'),
  OTEL_SERVICE_NAME: z.string().min(1).default('sveltekit-starter'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
});
```

**Note on Zod 4 syntax:** The project uses `zod@^4.3.6`. In Zod 4, `.default()` and `.optional()` work the same as Zod 3. The `z.url()` validator works for HTTP URLs. [VERIFIED: package.json shows zod ^4.3.6]

**Note on env var usage in instrumentation.server.ts:** The instrumentation file runs before the Zod env module loads (it runs before ALL app code). Therefore `instrumentation.server.ts` must use `process.env` directly with fallbacks — it cannot import from `$lib/server/env`. The validated `env` module is only available in hooks, routes, and server-side code.

**`.env.example` additions:**

```bash
# OpenTelemetry
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_SERVICE_NAME=sveltekit-starter

# Logging
LOG_LEVEL=info
```

### Anti-Patterns to Avoid

- **Importing from `$lib/server/env` in `instrumentation.server.ts`:** The Zod env module runs after instrumentation — only `process.env` is available there.
- **Using `@opentelemetry/exporter-trace-otlp-http`:** CLAUDE.md explicitly requires `otlp-proto`. The JSON variant is forbidden.
- **Enabling the full auto-instrumentation mega-bundle:** Every enabled instrumentation adds startup cost and potential false spans. Be selective.
- **Using `@opentelemetry/instrumentation-pg` for postgres.js:** The `pg` instrumentation only hooks the `pg` npm package (node-postgres). It does nothing for postgres.js (`postgres` package).
- **Awaiting `sdk.start()`:** `start()` returns `void`, not `Promise<void>`. Awaiting it is a type error.
- **Not registering import-in-the-middle:** Without `register('import-in-the-middle/hook.mjs', ...)`, auto-instrumentation cannot hook ESM modules and will silently produce no spans.
- **Using `sdk.start()` after SvelteKit routes load:** Instrumentation must be registered before any instrumented modules are imported. `instrumentation.server.ts` guarantees this ordering.

---

## Critical Finding: postgres.js Has No Official OTEL Instrumentation

**This is the most important research finding for OBS-02.**

CONTEXT.md D-04 says to include "postgres.js instrumentation" in the selective list. **This is not possible with the official OTEL packages.**

The `@opentelemetry/auto-instrumentations-node` bundle includes `@opentelemetry/instrumentation-pg`, which instruments the **`pg` (node-postgres) driver only**. This project uses **`postgres.js`** (npm package `postgres`) — a different driver entirely.

There are two community packages for postgres.js OTEL instrumentation:

- `otel-instrumentation-postgres` (v1.0.0) [VERIFIED: npm registry]
- `opentelemetry-instrumentation-postgres` (v0.0.3) [VERIFIED: npm registry]

Neither is part of the official OTEL ecosystem, and v0.0.3 signals pre-production quality. **These should NOT be used in a production starter template.**

**Recommendation:** Do not include postgres.js-level OTEL tracing in this phase. HTTP spans from `@opentelemetry/instrumentation-http` will cover the request lifecycle. DB health is covered by the `/api/health` endpoint. This is an honest limitation to document.

---

## Don't Hand-Roll

| Problem                   | Don't Build                            | Use Instead                                              | Why                                                                                      |
| ------------------------- | -------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| OTLP export               | Custom HTTP POST to Aspire             | `OTLPTraceExporter`                                      | Handles retry, batching, protobuf encoding, header management                            |
| ESM module hooking        | Custom Node.js `--require` flag        | `import-in-the-middle` via `createAddHookMessageChannel` | Official approach for ESM; handles async module graph correctly                          |
| Trace context propagation | Manual W3C TraceContext header parsing | `NodeSDK` default propagators                            | NodeSDK includes W3C TraceContext + Baggage propagation by default                       |
| Log correlation           | Manual request ID middleware           | pino `mixin()` + `@opentelemetry/api`                    | Active span context is always available in the async context; no manual threading needed |
| DB health check ORM       | Drizzle query to check liveness        | Raw `sql\`SELECT 1\``                                    | ORM overhead unnecessary for a health check; raw client is deterministic                 |

**Key insight:** The `mixin()` pattern works because OTEL uses Node.js AsyncLocalStorage under the hood — the active span is always in scope for the current async execution context, even without passing it explicitly.

---

## Common Pitfalls

### Pitfall 1: instrumentation.server.ts not loading

**What goes wrong:** Traces never appear in Aspire Dashboard; no errors in logs.
**Why it happens:** Both `experimental.tracing.server` and `experimental.instrumentation.server` must be set in `svelte.config.js`. Missing either flag silently skips the file.
**How to avoid:** Add both flags to the `kit.experimental` block.
**Warning signs:** No spans in Aspire Dashboard despite app responding normally.

### Pitfall 2: import-in-the-middle not registered

**What goes wrong:** SDK starts without error but auto-instrumentations do nothing. HTTP requests produce no spans.
**Why it happens:** ESM modules are loaded statically and cannot be patched after the fact. `import-in-the-middle` must intercept module loading — if `register()` isn't called first, the hook never fires.
**How to avoid:** Ensure `createAddHookMessageChannel()` + `register()` calls appear at the TOP of `instrumentation.server.ts`, before the `NodeSDK` import or instantiation.
**Warning signs:** `NodeSDK` starts (no errors) but zero spans in Aspire Dashboard.

### Pitfall 3: OTLP endpoint URL path duplication

**What goes wrong:** Traces not received by Aspire; 404 or connection refused at `/v1/traces/v1/traces`.
**Why it happens:** If you pass the full path `http://localhost:4318/v1/traces` as `OTEL_EXPORTER_OTLP_ENDPOINT` and the SDK also appends `/v1/traces`, you get a doubled path.
**How to avoid:** Use the base URL only: `http://localhost:4318`. The `OTLPTraceExporter` automatically appends `/v1/traces`. In code, when constructing the `url` option manually, append `/v1/traces` explicitly (as shown in Pattern 1 above) OR use the OTEL env var convention (base URL only) and let the SDK handle path construction.
**Warning signs:** HTTP 404 from Aspire Dashboard; check the actual URL being called via OTEL debug logging: `OTEL_LOG_LEVEL=debug`.

### Pitfall 4: pino mixin returns empty object outside spans

**What goes wrong:** Log lines missing `trace_id` for startup logs or logs outside request handlers.
**Why it happens:** There is no active OTEL span at startup or in non-request code paths.
**How to avoid:** The `if (!span) return {}` guard in the mixin handles this correctly — logs without an active span simply omit the trace fields. This is expected behavior, not a bug.
**Warning signs:** None — this is correct. Only request-scoped log lines will have trace context.

### Pitfall 5: `db.$client` may not be the correct accessor

**What goes wrong:** TypeScript error on `db.$client` or runtime error trying to use it as a tagged template.
**Why it happens:** The Drizzle client accessor name may differ depending on drizzle-orm version. [ASSUMED]
**How to avoid:** Verify at implementation time. If `db.$client` is not available, export the raw postgres client from `src/lib/server/db/index.ts`:

```typescript
// src/lib/server/db/index.ts — add this export
export { client }; // the raw postgres.js sql object
```

Then import in health check: `import { client } from '$lib/server/db';`
**Warning signs:** TypeScript error `Property '$client' does not exist`.

### Pitfall 6: Zod 4 URL validation rejects `http://localhost:4318`

**What goes wrong:** Server fails to start with Zod validation error for `OTEL_EXPORTER_OTLP_ENDPOINT`.
**Why it happens:** Some Zod URL validators reject localhost URLs or require a path component. [ASSUMED — needs implementation-time check]
**How to avoid:** If `z.url()` rejects the format, fall back to `z.string().url()` or `z.string().min(1)` with a manual URL pattern. Alternative: use `z.string().default('http://localhost:4318')` without URL validation.

---

## Code Examples

### OTLP endpoint format (verified from OTEL spec)

```
// Base URL: http://localhost:4318
// Traces path: appended by exporter as /v1/traces
// Full URL: http://localhost:4318/v1/traces

// When using env var OTEL_EXPORTER_OTLP_ENDPOINT:
//   Set value to: http://localhost:4318  (base URL only)
//   The SDK reads this and appends /v1/traces automatically

// When setting url in OTLPTraceExporter constructor:
//   Must include the path: http://localhost:4318/v1/traces
//   The constructor url is the complete URL, not a base URL
```

[VERIFIED: https://opentelemetry.io/docs/specs/otel/protocol/exporter/]

### OTEL span context access pattern

```typescript
// Source: @opentelemetry/api — verified pattern for trace correlation
import { trace, context } from '@opentelemetry/api';

const span = trace.getSpan(context.active());
if (span) {
  const ctx = span.spanContext();
  // ctx.traceId — 32-char hex string
  // ctx.spanId  — 16-char hex string
  // ctx.traceFlags — 0 (not sampled) or 1 (sampled)
}
```

### NodeSDK start/shutdown lifecycle

```typescript
// sdk.start() is void — synchronous, no await
sdk.start();

// sdk.shutdown() is Promise<void> — must catch errors
process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(() => console.log('OTEL SDK shut down'))
    .catch((err) => console.error('OTEL SDK shutdown error', err));
});
```

[VERIFIED: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_sdk-node.NodeSDK.html]

---

## State of the Art

| Old Approach                        | Current Approach                              | When Changed              | Impact                                                                          |
| ----------------------------------- | --------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------- |
| `BasicTracerProvider` manual wiring | `NodeSDK` one-shot setup                      | OTEL JS SDK 2.x           | Much simpler; handles propagators, samplers, and context managers automatically |
| `require()` hook for CJS            | `import-in-the-middle` + `register()` for ESM | Node.js 22 / ESM adoption | Required for ESM projects; CJS `--require` flag doesn't work with ESM           |
| `@tailwind` directives              | Not applicable here                           | —                         | —                                                                               |
| SvelteKit OTEL via third-party      | `instrumentation.server.ts` built-in          | SvelteKit 2.31.0          | First-class official support; no Vercel/adapter-specific SDK needed             |

**Deprecated/outdated:**

- `experimental.tracing` alone (without `experimental.instrumentation`): BOTH flags are required as of the current API surface [VERIFIED: svelte.dev/docs/kit/observability]
- `pino-pretty` as a production dependency: dev-only; if used, install as devDependency

---

## Project Constraints (from CLAUDE.md)

| Directive                                                       | Impact on Phase 5                                                                                                       |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Use `@opentelemetry/exporter-trace-otlp-proto`, NOT `otlp-http` | Only install and import the proto variant                                                                               |
| Zero external accounts                                          | Aspire Dashboard runs locally — already satisfied                                                                       |
| Runtime env vars via `$env/dynamic/private`                     | OTEL vars go through Zod schema + validated env module; but `instrumentation.server.ts` must use `process.env` directly |
| TypeScript everywhere                                           | `instrumentation.server.ts` is TypeScript; logger.ts is TypeScript                                                      |
| pnpm is the package manager                                     | Use `pnpm add` for all installs                                                                                         |
| Server-only code in `src/lib/server/`                           | `logger.ts` goes in `src/lib/server/logger.ts`                                                                          |
| No `$env/static/private` for secrets                            | Correct — using `$env/dynamic/private` via the env module                                                               |

---

## Assumptions Log

| #   | Claim                                                                                                          | Section                  | Risk if Wrong                                                                                     |
| --- | -------------------------------------------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------- |
| A1  | `db.$client` exposes the raw postgres.js tagged template function in drizzle-orm 0.45.x                        | Pattern 4 (health check) | TypeScript error; fix: export `client` directly from db/index.ts                                  |
| A2  | `z.url()` in Zod 4 accepts `http://localhost:4318` format                                                      | Pattern 5 (env schema)   | Startup failure; fix: use `z.string().default(...)` instead                                       |
| A3  | Both experimental flags (`tracing` + `instrumentation`) are still required in current SvelteKit 2.56.x         | Architecture Patterns    | instrumentation.server.ts silently not loading; fix: check svelte.dev docs at implementation time |
| A4  | The pino `mixin()` receiving an empty active context (outside requests) silently returns `{}` without throwing | Pattern 2 (logger)       | Runtime errors in startup logging; fix: ensure `if (!span) return {}` guard                       |

---

## Open Questions

1. **`db.$client` accessor in Drizzle 0.45.x**
   - What we know: Drizzle exposes the underlying driver; the exact accessor name may be `.$client`, `.$driver`, or requires a separate export
   - What's unclear: The exact property name in drizzle-orm 0.45.x for the postgres.js `sql` object
   - Recommendation: At task execution time, run `console.log(Object.keys(db))` or check drizzle-orm source; if absent, export `client` from db/index.ts

2. **Whether `experimental.tracing` + `experimental.instrumentation` will be stabilized before release**
   - What we know: Both are flagged as "experimental, subject to change without notice" in official docs
   - What's unclear: Timeline for promotion out of experimental in SvelteKit 2.x
   - Recommendation: Proceed with experimental flags; add a comment in svelte.config.js noting they are experimental; monitor SvelteKit changelog

3. **pino transport in dev mode**
   - What we know: `pino-pretty` provides human-readable output; requires a separate devDependency
   - What's unclear: Whether the planner should include `pino-pretty` in Wave 0 or leave as optional
   - Recommendation: Use pino without transport for Phase 5; add `pino-pretty` as a follow-up if developer UX requires it

---

## Environment Availability

| Dependency                   | Required By                           | Available                               | Version                        | Fallback                               |
| ---------------------------- | ------------------------------------- | --------------------------------------- | ------------------------------ | -------------------------------------- |
| Node.js 22 LTS               | OTEL `import-in-the-middle` ESM hooks | ✓                                       | 24.14.1                        | — (24 > 22, compatible)                |
| pnpm                         | Package installation                  | ✓                                       | 10.33.0 (packageManager field) | —                                      |
| Aspire Dashboard (port 4318) | OTLP trace export                     | Must be running via `docker compose up` | N/A at research time           | Run `docker compose up` before testing |
| PostgreSQL (port 5432)       | Health check endpoint                 | Must be running via `docker compose up` | N/A at research time           | Health check returns 503 gracefully    |

**Missing dependencies with no fallback:** None — all runtime dependencies are available.

**Missing dependencies with fallback:** Aspire Dashboard and PostgreSQL require `docker compose up`; health check endpoint handles DB unavailability by returning 503.

---

## Validation Architecture

### Test Framework

| Property           | Value                                                    |
| ------------------ | -------------------------------------------------------- |
| Framework          | Vitest ^4.1.2 + Playwright ^1.59.1                       |
| Config file        | `vite.config.ts` (Vitest) / `playwright.config.ts` (E2E) |
| Quick run command  | `pnpm test:unit`                                         |
| Full suite command | `pnpm test`                                              |

### Phase Requirements → Test Map

| Req ID | Behavior                                                    | Test Type          | Automated Command                          | File Exists? |
| ------ | ----------------------------------------------------------- | ------------------ | ------------------------------------------ | ------------ |
| OBS-01 | `instrumentation.server.ts` loads without error; SDK starts | smoke              | Manual — can't unit-test module load order | N/A          |
| OBS-02 | Selective instrumentations only — no mega-bundle overhead   | manual             | Inspect Aspire Dashboard spans             | N/A          |
| OBS-03 | OTLP traces appear in Aspire Dashboard at localhost:18888   | manual/integration | Docker up + app request + visual check     | N/A          |
| OBS-04 | pino logger outputs JSON with `trace_id`/`span_id` fields   | unit               | `pnpm test:unit -- logger`                 | ❌ Wave 0    |
| OBS-05 | Aspire Dashboard already in docker-compose.yml              | N/A                | Already satisfied                          | ✓            |
| OBS-06 | `GET /api/health` returns correct shape and status codes    | integration        | Playwright E2E or Vitest + `fetch`         | ❌ Wave 0    |

### Sampling Rate

- **Per task commit:** `pnpm test:unit`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green + manual Aspire Dashboard verification before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/tests/unit/logger.test.ts` — unit test for pino mixin trace injection (OBS-04)
- [ ] `tests/api-health.spec.ts` — Playwright E2E test for `/api/health` endpoint (OBS-06)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category         | Applies | Standard Control                                                               |
| --------------------- | ------- | ------------------------------------------------------------------------------ |
| V2 Authentication     | no      | Health endpoint is unauthenticated by design                                   |
| V3 Session Management | no      | No session in this phase                                                       |
| V4 Access Control     | partial | `/api/health` should not expose sensitive internals (DB version, stack traces) |
| V5 Input Validation   | no      | No user input in this phase                                                    |
| V6 Cryptography       | no      | OTEL over HTTP (localhost only in dev)                                         |

### Known Threat Patterns for OTEL/Logging Stack

| Pattern                                      | STRIDE                 | Standard Mitigation                                                                                      |
| -------------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------- |
| Health endpoint information disclosure       | Information Disclosure | Return only `{ status, db, timestamp }` — never DB connection strings, error messages, or stack traces   |
| Log injection via user input in log messages | Tampering              | pino's JSON serialization prevents newline injection; never interpolate raw user input into log strings  |
| Trace data exposure                          | Information Disclosure | OTEL endpoint is internal (localhost:4318); do not expose port 4318 outside Docker network in production |

---

## Sources

### Primary (HIGH confidence)

- [SvelteKit Observability Docs](https://svelte.dev/docs/kit/observability) — `instrumentation.server.ts` pattern, experimental flags, SDK example
- [SvelteKit Integrated Observability Blog](https://svelte.dev/blog/sveltekit-integrated-observability) — complete code example for instrumentation.server.ts
- [OTEL NodeSDK API Reference](https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_sdk-node.NodeSDK.html) — `start()` returns void, `shutdown()` returns Promise
- [OTEL Protocol Exporter Spec](https://opentelemetry.io/docs/specs/otel/protocol/exporter/) — base URL vs full path behavior for OTLP/HTTP
- npm registry (2026-04-09) — all package versions verified via `npm view`

### Secondary (MEDIUM confidence)

- [oneuptime.com — Disable Auto-Instrumentation](https://oneuptime.com/blog/post/2026-02-06-disable-unnecessary-auto-instrumentation-reduce-noise/view) — `getNodeAutoInstrumentations` selective config syntax (cross-verified with signoz.io)
- [signoz.io — Selective Instrumentation](https://signoz.io/docs/instrumentation/manual-instrumentation/javascript/nodejs-selective-instrumentation/) — per-key `enabled: false` syntax
- [oneuptime.com — Pino Trace Injection](https://oneuptime.com/blog/post/2026-02-06-inject-trace-ids-application-logs-opentelemetry/view) — pino mixin pattern for OTEL trace correlation
- [OTEL Exporters JS Docs](https://opentelemetry.io/docs/languages/js/exporters/) — OTLP exporter configuration

### Tertiary (LOW confidence)

- npm registry finding: `otel-instrumentation-postgres` (v1.0.0) and `opentelemetry-instrumentation-postgres` (v0.0.3) exist but are not official OTEL packages — excluded from recommendations

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all versions verified against npm registry 2026-04-09
- Architecture patterns: HIGH — instrumentation.server.ts verified against official SvelteKit docs
- postgres.js instrumentation finding: HIGH — confirmed absence from official bundle via npm search
- pino mixin pattern: MEDIUM — pattern widely documented; exact API verified against @opentelemetry/api
- db.$client accessor: LOW — assumed; needs verification at implementation time

**Research date:** 2026-04-09
**Valid until:** 2026-05-09 (30 days; SvelteKit 2.x stable, OTEL 0.214.x stable)
