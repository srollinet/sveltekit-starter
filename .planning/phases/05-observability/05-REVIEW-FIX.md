---
phase: 05-observability
fixed_at: 2026-04-11T10:06:16Z
review_path: .planning/phases/05-observability/05-REVIEW.md
iteration: 1
findings_in_scope: 1
fixed: 1
skipped: 0
status: all_fixed
---

# Phase 05: Code Review Fix Report

**Fixed at:** 2026-04-11T10:06:16Z
**Source review:** .planning/phases/05-observability/05-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 1 (CR-01 only; IN-01 and IN-02 are Info severity, excluded by fix_scope=critical_warning)
- Fixed: 1
- Skipped: 0

## Fixed Issues

### CR-01: Logs are not exported to OpenTelemetry — LoggerProvider and log exporter are absent

**Files modified:** `package.json`, `pnpm-lock.yaml`, `src/instrumentation.server.ts`, `src/lib/server/logger.ts`

**Commits:**
- `a3ebaab` — install `@opentelemetry/sdk-logs`, `@opentelemetry/exporter-logs-otlp-proto`, `pino-opentelemetry-transport`
- `9db3cc6` — wire `BatchLogRecordProcessor` + `OTLPLogExporter` into `NodeSDK` via `logRecordProcessors`
- `d23cfba` — bridge Pino to OTEL log export via `pino-opentelemetry-transport` transport target

**Applied fix:**

Three coordinated changes were made:

1. **Package installation** (`package.json` / `pnpm-lock.yaml`): Added `@opentelemetry/sdk-logs ^0.214.0`, `@opentelemetry/exporter-logs-otlp-proto ^0.214.0`, and `pino-opentelemetry-transport ^3.0.0` as runtime dependencies.

2. **`src/instrumentation.server.ts`**: Added imports for `OTLPLogExporter` and `BatchLogRecordProcessor`. Extracted a shared `otlpBase` variable (used by both trace and log exporters). Created a `logRecordProcessor` and passed it to `NodeSDK` via the `logRecordProcessors` array option. The `logs.setGlobalLoggerProvider()` call from the review suggestion was omitted — `NodeSDK` manages its internal `LoggerProvider` automatically when `logRecordProcessors` is provided, and `@opentelemetry/api-logs` is not a direct project dependency (only transitive, not resolvable as a direct import). TypeScript confirmed zero errors in the modified file.

3. **`src/lib/server/logger.ts`**: Replaced the bare `pino({...})` call with a multi-target transport configuration. Stdout (`pino/file` to fd 1) is always active. The `pino-opentelemetry-transport` target is added only when `process.env.OTEL_EXPORTER_OTLP_ENDPOINT` is explicitly set — this avoids connection errors in bare local dev without the Aspire container running. The existing `mixin()` is retained for trace correlation fields in stdout JSON.

**Adaptation note:** The review suggested `logs.setGlobalLoggerProvider()` via `@opentelemetry/api-logs`. That import is not resolvable as a direct project dependency. The `NodeSDK` `logRecordProcessors` option achieves the same result without requiring the direct import.

---

_Fixed: 2026-04-11T10:06:16Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
