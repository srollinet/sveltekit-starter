---
phase: 05-observability
plan: 02
subsystem: observability
tags: [health-check, postgres, api, liveness-probe, otel]
dependency_graph:
  requires:
    - phase: 05-01
      provides: pino logger singleton and OTEL instrumentation (used by health endpoint for error logging and trace correlation)
    - phase: 04-database-02
      provides: Drizzle db singleton and postgres.js client pattern
  provides:
    - GET /api/health endpoint returning { status, db, timestamp }
    - Raw postgres.js client exported from DB module for direct SQL access
  affects: [src/lib/server/db/index.ts, src/routes/api/health/+server.ts]
tech_stack:
  added: []
  patterns:
    - "Export raw postgres.js client alongside Drizzle ORM for health checks and low-overhead SQL"
    - "SvelteKit RequestHandler with structured JSON responses and appropriate HTTP status codes"
    - "Liveness probe pattern: SELECT 1 with catch logging error via pino; no DB error details in response"
key_files:
  created:
    - src/routes/api/health/+server.ts
  modified:
    - src/lib/server/db/index.ts
key_decisions:
  - "Export raw postgres.js client (not Drizzle) for health check — SELECT 1 without ORM overhead per D-18"
  - "Health endpoint returns generic error shape ({ status: error, db: error }) — no DB error message exposed to caller"
  - "Route is unauthenticated by design — suitable for Docker/k8s probes calling before app is fully ready"
patterns_established:
  - "Health check pattern: raw client`SELECT 1` in try/catch, logger.error on failure, json() with explicit status"
requirements_completed: [OBS-06]
duration: ~5min
completed: 2026-04-10
---

# Phase 05 Plan 02: Health Endpoint Summary

**GET /api/health liveness probe using raw postgres.js SELECT 1, returning { status, db, timestamp } with HTTP 200/503, wired to pino logger and verified with Aspire Dashboard traces.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-10
- **Completed:** 2026-04-10
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint)
- **Files modified:** 2

## Accomplishments

- Exported raw `client` (postgres.js Sql instance) from `src/lib/server/db/index.ts` alongside the existing Drizzle `db` export — minimal change, `const` to `export const`
- Created `GET /api/health` endpoint that runs `client\`SELECT 1\`` and returns `{ status: 'ok', db: 'ok', timestamp }` (HTTP 200) on success or `{ status: 'error', db: 'error', timestamp }` (HTTP 503) on DB failure
- Human-verified end-to-end: endpoint returns expected JSON with HTTP 200, Aspire Dashboard shows traces from sveltekit-starter service

## Task Commits

Each task was committed atomically:

1. **Task 1: Export raw postgres client from DB module** - `5bc5812` (feat)
2. **Task 2: Create GET /api/health endpoint** - `565bf35` (feat)
3. **Task 3: Human verify checkpoint** - approved (no code commit; checkpoint gate)

## Files Created/Modified

- `src/lib/server/db/index.ts` - Added `export` to `client` constant; both `client` and `db` now exported
- `src/routes/api/health/+server.ts` - New file: GET handler using `client\`SELECT 1\``, logs errors via pino, returns structured JSON

## Decisions Made

- **Raw postgres.js for health**: Using `client\`SELECT 1\`` directly avoids Drizzle ORM overhead and keeps the probe as lightweight as possible (D-18).
- **No error leakage**: The `catch` block logs the full error server-side via `logger.error` but only returns generic `{ status: 'error', db: 'error' }` to callers — DB internals never reach the HTTP response body.
- **Unauthenticated route**: Health probes must be callable by Docker/k8s infrastructure before auth context is available; no authentication applied by design.

## Deviations from Plan

None — plan executed exactly as written. Both automated tasks completed without deviation, and the human checkpoint was approved as expected.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required beyond running `docker compose up` (postgres + Aspire Dashboard) and `pnpm run dev`.

## Known Stubs

None — the endpoint is fully wired: DB client imported, SELECT 1 executed, logger invoked on error, JSON returned with correct HTTP status.

## Threat Flags

No new threat surface beyond what is documented in the plan's threat model:

- T-05-06 mitigated: error body contains only generic `{ status: 'error', db: 'error' }`, no DB message
- T-05-07 accepted: rate limiting deferred to Phase 6
- T-05-08 accepted: hardcoded `SELECT 1` literal, no user input interpolation
- T-05-09 mitigated: `client` exported from `$lib/server/` — SvelteKit prevents browser-side import at build time

## Next Phase Readiness

- `/api/health` is ready for use as a Docker HEALTHCHECK target in Phase 7 (testing/docker)
- The `client` export pattern is established for any future raw SQL needs
- Phase 6 (security headers) can add `noseconeHandle` to the existing `sequence()` without touching this file

## Self-Check: PASSED

Files exist:
- src/routes/api/health/+server.ts: FOUND
- src/lib/server/db/index.ts: FOUND (modified)

Commits exist:
- 5bc5812: FOUND
- 565bf35: FOUND

---
*Phase: 05-observability*
*Completed: 2026-04-10*
