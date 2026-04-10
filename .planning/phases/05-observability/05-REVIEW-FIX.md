---
phase: 05-observability
fixed_at: 2026-04-10T00:00:00Z
review_path: .planning/phases/05-observability/05-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 2
skipped: 1
status: partial
---

# Phase 05: Code Review Fix Report

**Fixed at:** 2026-04-10T00:00:00Z
**Source review:** .planning/phases/05-observability/05-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 3 (WR-01, WR-02, WR-03)
- Fixed: 2
- Skipped: 1

## Fixed Issues

### WR-01: OTEL SDK shutdown does not keep the process alive until flush completes

**Files modified:** `src/instrumentation.server.ts`
**Commit:** c3eaa85
**Applied fix:** Added `.finally(() => { process.exit(0); })` to the SIGTERM handler's promise chain so the process does not exit until the SDK has either completed flushing or timed out, preventing in-flight trace loss on Docker stop.

### WR-03: Raw database error object logged at health endpoint leaks internal details

**Files modified:** `src/routes/api/health/+server.ts`
**Commit:** 64451ff
**Applied fix:** Wrapped the `err` argument in `err instanceof Error ? err : new Error(String(err))` so Pino always receives a proper Error instance. This routes through Pino's built-in error serializer which trims the stack and avoids echoing raw postgres.js connection strings (which can contain DATABASE_URL passwords) into log output.

## Skipped Issues

### WR-02: `@opentelemetry/api` version (^1.9.1) may conflict with SDK 2.x bundled API

**File:** `package.json:66`
**Reason:** skipped: condition does not exist — `pnpm why @opentelemetry/api` shows a single resolved instance at 1.9.1 with no duplicate versions. No split-brain is present and no override is needed.
**Original issue:** Two versions of `@opentelemetry/api` could cause `trace.getSpan()` to silently return `undefined` for all spans.

---

_Fixed: 2026-04-10T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
