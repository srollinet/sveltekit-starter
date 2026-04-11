---
phase: 05-observability
reviewed: 2026-04-11T00:00:00Z
depth: standard
files_reviewed: 11
files_reviewed_list:
  - .env.example
  - knip.config.ts
  - package.json
  - src/app.d.ts
  - src/hooks.server.ts
  - src/instrumentation.server.ts
  - src/lib/server/env/schema.ts
  - src/lib/server/db/index.ts
  - src/lib/server/logger.ts
  - src/routes/api/health/+server.ts
  - svelte.config.js
findings:
  critical: 1
  warning: 0
  info: 2
  total: 3
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-04-11T00:00:00Z
**Depth:** standard
**Files Reviewed:** 11
**Status:** issues_found

## Summary

This pass was triggered specifically to investigate whether OTEL log export is implemented. It is not. Traces are fully wired (`instrumentation.server.ts` → `OTLPTraceExporter`), and structured logging with Pino is functional (stdout JSON with trace-correlation fields injected via `mixin()`). However, log records are never shipped to the OTEL collector — there is no `LoggerProvider`, no log exporter, and no relevant packages in `package.json`. This is classified Critical because shipping logs to OTEL is a stated phase requirement.

All previously-identified issues from the earlier review pass are confirmed resolved: the pnpm `@opentelemetry/api` override is present (`package.json:65-69`); `logger.ts` correctly reads `env.LOG_LEVEL` from the validated env module; `.env.example` comment is clean; `svelte.config.js` uses only the current `instrumentation` flag; and `knip.config.ts` already carries the TODO comment.

---

## Critical Issues

### CR-01: Logs are not exported to OpenTelemetry — LoggerProvider and log exporter are absent

**File:** `src/instrumentation.server.ts:14-65`

**Issue:** `instrumentation.server.ts` configures only a `traceExporter` (traces). No `LoggerProvider`, no `logRecordProcessor`, and no OTLP log exporter are configured. As a result, Pino log records are written to stdout only and never reach the Aspire Dashboard (or any OTEL collector).

The comment on line 57 reads:
```
'@opentelemetry/instrumentation-pino': { enabled: false }, // using manual mixin instead (D-11)
```
The `mixin()` in `logger.ts` injects `trace_id` / `span_id` fields into stdout JSON — which is useful for log correlation in a log aggregator — but it is not a substitute for OTEL log export. The mixin does not create OTEL `LogRecord` objects and does not send anything to the collector endpoint.

No OTEL log packages are installed:
- `@opentelemetry/sdk-logs` — absent from `package.json`
- `@opentelemetry/exporter-logs-otlp-proto` — absent from `package.json`
- `pino-opentelemetry-transport` — absent from `package.json`

**Fix:** Two complementary steps are required.

**Step 1 — Install packages:**
```bash
pnpm add @opentelemetry/sdk-logs @opentelemetry/exporter-logs-otlp-proto pino-opentelemetry-transport
```

**Step 2 — Add a `LoggerProvider` to `instrumentation.server.ts`:**

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-proto';
import { LoggerProvider, BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { createAddHookMessageChannel } from 'import-in-the-middle';
import { register } from 'node:module';

const { registerOptions } = createAddHookMessageChannel();
register('import-in-the-middle/hook.mjs', import.meta.url, registerOptions);

const logExporter = new OTLPLogExporter({
  url: (process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318') + '/v1/logs',
});

const loggerProvider = new LoggerProvider();
loggerProvider.addLogRecordProcessor(new BatchLogRecordProcessor(logExporter));

const sdk = new NodeSDK({
  serviceName: process.env.OTEL_SERVICE_NAME ?? 'sveltekit-starter',
  traceExporter: new OTLPTraceExporter({
    url: (process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318') + '/v1/traces',
  }),
  logRecordProcessor: new BatchLogRecordProcessor(logExporter),
  instrumentations: [
    getNodeAutoInstrumentations({ /* existing overrides unchanged */ }),
  ],
});

sdk.start();
```

**Step 3 — Bridge Pino to OTEL via `pino-opentelemetry-transport` in `logger.ts`:**

```typescript
import pino from 'pino';
import { env } from '$lib/server/env';

export const logger = pino({
  level: env.LOG_LEVEL,
  mixin() {
    // Keep mixin for stdout correlation — still useful for local dev log tailing
    const span = trace.getSpan(context.active());
    if (!span) return {};
    const ctx = span.spanContext();
    return { trace_id: ctx.traceId, span_id: ctx.spanId, trace_flags: ctx.traceFlags };
  },
  formatters: {
    level(label: string) { return { level: label }; },
  },
  transport: {
    targets: [
      // Human-readable stdout for local development
      { target: 'pino/file', options: { destination: 1 }, level: env.LOG_LEVEL },
      // OTEL log export to collector
      {
        target: 'pino-opentelemetry-transport',
        options: { loggerName: env.OTEL_SERVICE_NAME },
        level: env.LOG_LEVEL,
      },
    ],
  },
});
```

Note: `pino-opentelemetry-transport` uses the global OTEL `LoggerProvider` registered by the SDK, so `instrumentation.server.ts` must finish calling `sdk.start()` before the first log is emitted. SvelteKit's `instrumentation.server.ts` runs before `hooks.server.ts`, so the ordering is correct.

---

## Info

### IN-01: Misleading comment on pino instrumentation disable

**File:** `src/instrumentation.server.ts:57`

**Issue:** The comment `// using manual mixin instead (D-11)` implies the mixin satisfies the D-11 requirement for OTEL log export. It does not — the mixin only enriches stdout JSON. The comment creates false confidence that log export is handled.

**Fix:** Update the comment to reflect current reality and the intended follow-up:

```typescript
'@opentelemetry/instrumentation-pino': { enabled: false },
// Pino auto-instrumentation disabled; log export is handled via
// pino-opentelemetry-transport in logger.ts (see CR-01 for full setup).
```

---

### IN-02: `@nosecone/sveltekit` security middleware absent from `package.json`

**File:** `package.json`

**Issue:** `CLAUDE.md` lists `@nosecone/sveltekit` as a required security dependency. It is not installed. `hooks.server.ts` line 25 contains a forward-reference comment: `// Phase 6 can add handles before/after without refactoring`, suggesting this is an intentional deferral. This is noted for tracking purposes.

**Fix:** No immediate action required if Phase 6 is the designated delivery vehicle. Ensure Phase 6 scope explicitly includes installing and wiring `@nosecone/sveltekit` via `sequence(noseconeHandle, otelHandle)`.

---

_Reviewed: 2026-04-11T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
