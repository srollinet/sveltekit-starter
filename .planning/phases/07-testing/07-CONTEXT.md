# Phase 7: Testing - Context

**Gathered:** 2026-04-11 (discuss mode)
**Status:** Ready for planning

<domain>
## Phase Boundary

The template ships with working test examples at every level — unit, component, API integration, and E2E — all passing on a clean checkout. This phase wires up the remaining test patterns (component tests, health check integration test, E2E smoke test) so any developer who clones the repo has runnable examples of every test type.

**Already in place (do not re-implement):**

- Vitest configured in `vite.config.ts` — environment: node, `*.test.ts` included
- 1 existing server unit test: `src/lib/server/env/index.test.ts` (covers TEST-03)
- Playwright configured in `playwright.config.ts` — webServer on port 4173, matches `*.e2e.{ts,js}`
- 1 existing E2E test: `src/routes/demo/playwright/page.svelte.e2e.ts` (checks /demo/playwright h1)
- Health endpoint at `src/routes/api/health/+server.ts` ready to test
- Named hook handles exported from `hooks.server.ts` (noseconeHandle, otelHandle, loggingHandle)

**What this phase delivers:**

- Vitest workspaces config enabling dual environments (node + jsdom)
- A small demo Svelte component + component test (TEST-01, TEST-02)
- Health check integration test using testcontainers (TEST-04)
- E2E smoke test for main page + nav (TEST-05)
- All tests passing on clean checkout (TEST-06)

</domain>

<decisions>
## Implementation Decisions

### Vitest Environment Configuration

- **D-01:** Migrate `vite.config.ts` from a single global `environment: 'node'` to a **Vitest workspaces** configuration with two named projects:
  - `unit` project: `environment: 'node'`, includes `src/**/*.test.ts` (server/utility tests)
  - `component` project: `environment: 'jsdom'`, includes `src/**/*.svelte.test.ts` (component tests)
- **D-02:** Remove the `exclude: ['src/**/*.svelte.test.ts']` line — the workspace config handles this by routing them to the component project instead.
- **D-03:** Use `jsdom` (not happy-dom) for the component project environment — already listed as a peer dep in the stack.

### Demo Component + Component Test

- **D-04:** Create a **small dedicated demo component** as the component test target — not a page or layout. Something purpose-built for demonstration (e.g., `src/lib/components/StackBadge.svelte` displaying a technology name with a badge style). Keeps the test decoupled from page structure.
- **D-05:** Component test file: `src/lib/components/StackBadge.svelte.test.ts` — matches the `*.svelte.test.ts` pattern routed to the jsdom workspace.
- **D-06:** Test uses `render()` from `@testing-library/svelte` and at least one assertion (`toBeInTheDocument()` from `@testing-library/jest-dom`). Demonstrates the full component test pattern.

### API Integration Test (Health Check)

- **D-07:** Use **`@testcontainers/postgresql`** to spin up a throwaway PostgreSQL container for the health check integration test. Tests are self-contained — do not depend on the docker compose postgres being up.
- **D-08:** The integration test file: `src/routes/api/health/health.test.ts` — runs in the `unit` (node) workspace project since it's a `.test.ts` file with no DOM needs.
- **D-09:** Test flow: start PostgreSQL testcontainer → set `DATABASE_URL` → import and call the health endpoint handler directly (not via HTTP) → assert `{ status: 'ok', db: 'ok' }` response → stop container in teardown.
- **D-10:** `@testcontainers/postgresql` is a devDependency. Docker daemon must be running, but no docker compose required.

### E2E Smoke Test

- **D-11:** Add a **new** `src/routes/smoke.e2e.ts` (or `tests/smoke.e2e.ts`) — dedicated smoke test separate from the demo playwright test.
- **D-12:** Smoke test coverage: load the home page (`/`), assert the app renders (check for a visible heading or page content), verify at least one nav link is visible and clickable (e.g., "Home" nav item in the DaisyUI drawer/navbar).
- **D-13:** The existing `page.svelte.e2e.ts` demo test stays unchanged — it remains as an example of collocating E2E tests with pages.

### Claude's Discretion

- Exact name and content of the demo StackBadge component — keep it minimal
- Whether to put `smoke.e2e.ts` under `src/` or a top-level `tests/` directory (follow whatever pattern feels more natural for Playwright)
- Exact assertions in the smoke test beyond "home page renders + nav visible"
- Whether `@testing-library/jest-dom` setup file is needed in vite.config.ts (`setupFiles`) or if inline imports suffice

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements

- `.planning/REQUIREMENTS.md` §Testing (TEST-01 through TEST-06) — exact acceptance criteria

### Technology Stack

- `CLAUDE.md` §Testing — Vitest, @testing-library/svelte, jsdom, @playwright/test versions and purposes
- `CLAUDE.md` §Technology Stack — Node.js 22 LTS, pnpm as package manager

### Existing Test Infrastructure

- `vite.config.ts` — current Vitest config to refactor (single env → workspaces)
- `playwright.config.ts` — existing Playwright config (webServer on 4173, `*.e2e.{ts,js}` matcher)
- `src/lib/server/env/index.test.ts` — existing server unit test pattern to follow
- `src/routes/demo/playwright/page.svelte.e2e.ts` — existing E2E test (do not modify)

### Endpoints to Test

- `src/routes/api/health/+server.ts` — health check handler (uses `client` from `$lib/server/db`)
- `src/lib/server/db/index.ts` — exports `db` (Drizzle) and `client` (raw pg Pool)

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `src/lib/server/env/index.test.ts` — pattern for Vitest describe/it/expect usage; testcontainer test should follow same structure
- `src/routes/demo/playwright/page.svelte.e2e.ts` — minimal Playwright test pattern; smoke test follows same import/test style
- `src/hooks.server.ts` — exports named handles (noseconeHandle, otelHandle, loggingHandle); available for isolated handle testing if needed

### Established Patterns

- pnpm is the package manager — use `pnpm add -D` for devDependencies
- TypeScript everywhere — all test files are `.ts` (or `.svelte.test.ts` for components)
- Server-only code in `src/lib/server/` — test helpers for server tests go there
- Vitest import style: `import { describe, it, expect } from 'vitest'` (explicit, not global)

### Integration Points

- Health check imports `client` from `$lib/server/db` — testcontainer test must set `DATABASE_URL` env var before the module imports (or mock the import)
- Phase 8 (Production Docker): tests should still pass with docker compose up (TEST-06) — testcontainers approach is additive, not a replacement for the compose stack

</code_context>

<specifics>
## Specific Ideas

- The demo component (StackBadge) should be something visually present on the home page or demo page — so it's not dead code in the template. Consider rendering a technology badge (e.g., "SvelteKit", "Drizzle") using DaisyUI's badge component.
- For the testcontainer test: use `@testcontainers/postgresql` `PostgreSqlContainer` class, run migrations (or at least create the pg schema) before calling the health handler, so `SELECT 1` works against the real schema.
- The Playwright smoke test file location: `tests/smoke.e2e.ts` at project root if Playwright config supports it, or collocated at `src/routes/smoke.e2e.ts` following the existing pattern.

</specifics>

<deferred>
## Deferred Ideas

- Testing individual hook handles in isolation (noseconeHandle, otelHandle, loggingHandle) — the named exports make this possible, but no requirement specifies it. Backlog candidate.
- Coverage reporting (`vitest --coverage`) — useful but not required by TEST-01 through TEST-06. Future phase or v2 enhancement.
- CI test running (GitHub Actions) — explicitly out of scope in PROJECT.md (v2 requirement CI-01).
- `vitest-environment-postgres` as a lighter alternative to testcontainers — considered but user prefers the official `@testcontainers/postgresql` package.

</deferred>

---

_Phase: 07-testing_
_Context gathered: 2026-04-11_
