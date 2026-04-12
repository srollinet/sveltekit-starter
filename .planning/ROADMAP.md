# Roadmap: SvelteKit Battery-Included Starter

## Overview

This roadmap delivers a production-quality SvelteKit starter template in 8 phases. We start with the framework foundation and UI, then immediately stand up the dev infrastructure (Docker Compose with PostgreSQL + Aspire) and AI agent configuration so every subsequent phase builds on real running services and Claude has full project context from the start. Code quality tooling comes next to gate all future work. Database, observability, and security phases follow -- each leveraging infrastructure already running from Phase 2. Testing validates the full stack. Finally, we package the production Docker image.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - SvelteKit + Tailwind + DaisyUI + TypeScript strict + adapter-node + base pages
- [x] **Phase 2: Dev Infrastructure & AI Agent** - Docker Compose dev stack (PostgreSQL + Aspire) + env config + CLAUDE.md + MCP config (completed 2026-04-09)
- [x] **Phase 3: Code Quality** - ESLint + Prettier + Husky + lint-staged + Knip configured and passing (completed 2026-04-06)
- [x] **Phase 4: Database** - Drizzle ORM + initial schema + migrations + DB client singleton (PostgreSQL already running from Phase 2) (completed 2026-04-07)
- [x] **Phase 5: Observability** - OTEL SDK + instrumentation.server.ts + structured logging + health check (Aspire already running from Phase 2) (completed 2026-04-10)
- [x] **Phase 6: Security** - HTTP headers via nosecone + CSRF + server-only enforcement + hooks pipeline (completed 2026-04-11)
- [x] **Phase 7: Testing** - Vitest + component tests + API integration tests + Playwright E2E (completed 2026-04-12)
- [ ] **Phase 8: Production Docker** - Multi-stage production Dockerfile + docker-compose finalization

## Phase Details

### Phase 1: Foundation

**Goal**: A running SvelteKit app with Tailwind + DaisyUI styling, TypeScript strict mode, and adapter-node -- the base every other phase builds on
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06, FOUND-07
**Success Criteria** (what must be TRUE):

1. `pnpm run dev` starts the SvelteKit app and serves the home page in a browser
2. Home page renders styled DaisyUI components proving Tailwind + DaisyUI are working
3. Mobile-responsive navigation is visible and functional on narrow viewports
4. Navigating to a nonexistent route shows a styled error page (not the default SvelteKit error)
5. `pnpm run build` succeeds using adapter-node and produces a `build/` directory

**Plans**: 4 plans

Plans:

- [x] 01-01-PLAN.md -- Scaffold SvelteKit skeleton and configure adapter-node + TypeScript strict
- [x] 01-02-PLAN.md -- Install and configure Tailwind CSS v4 + DaisyUI v5 (CSS-first)
- [x] 01-03-PLAN.md -- Build root layout (navbar + drawer + theme toggle), home page, error page
- [x] 01-04-PLAN.md -- Automated build verification + human visual sign-off

**UI hint**: yes

### Phase 2: Dev Infrastructure & AI Agent

**Goal**: A developer can run `docker compose up` to get PostgreSQL and Aspire Dashboard running, env vars are validated with Zod, and Claude has full project context via CLAUDE.md and MCP config -- all before any application code depends on these services
**Depends on**: Phase 1
**Requirements**: DOCK-01, ENV-01, ENV-02, ENV-03, AI-01, AI-02
**Success Criteria** (what must be TRUE):

1. `docker compose up` starts PostgreSQL (with health check passing) and the Aspire Dashboard container; both are reachable from the host
2. `.env.example` documents all required environment variables with comments; copying it to `.env` provides working defaults for local dev
3. The app starts successfully when all env vars are set; it crashes immediately with a clear Zod error when a required var is missing
4. `CLAUDE.md` at the project root documents the tech stack, planned folder structure, key commands, and coding conventions (some commands marked TBD until later phases fill them in)
5. `.claude/settings.json` includes the `@sveltejs/mcp` server configuration so Claude Code has Svelte/SvelteKit docs available

**Plans**: 3 plans

Plans:

- [x] 02-01-PLAN.md -- Vitest config + Zod env validation with unit tests + hooks.server.ts
- [x] 02-02-PLAN.md -- Docker Compose dev stack (PostgreSQL + Aspire Dashboard) + .env.example
- [x] 02-03-PLAN.md -- CLAUDE-DEV.md developer quick-reference + MCP config in .claude/settings.json

### Phase 3: Code Quality

**Goal**: All code quality tools are configured and pass cleanly on the existing codebase -- every future commit is automatically checked
**Depends on**: Phase 2
**Requirements**: QUAL-01, QUAL-02, QUAL-03, QUAL-04, QUAL-05, QUAL-06
**Success Criteria** (what must be TRUE):

1. `pnpm run lint` runs ESLint with SvelteKit flat config and reports zero errors on the codebase
2. `pnpm run format` runs Prettier with svelte plugin and produces no changes on an already-formatted codebase
3. Making a commit with a lint error in a staged `.svelte` file triggers Husky + lint-staged and blocks the commit
4. `pnpm run knip` runs dead code detection configured for SvelteKit file-based routing and reports zero issues

**Plans**: 1 plan

Plans:

- [x] 03-01-PLAN.md -- Install prettier-plugin-tailwindcss + knip; update scripts; verify all quality gates pass

### Phase 4: Database

**Goal**: Drizzle ORM is configured, an initial schema and migration exist, and the app connects to the PostgreSQL instance already running from Phase 2
**Depends on**: Phase 2 (PostgreSQL running), Phase 3 (quality gates active)
**Requirements**: DB-01, DB-02, DB-03, DB-04, DB-05, DB-06, DB-07
**Success Criteria** (what must be TRUE):

1. `pnpm run db:migrate` applies the initial migration and creates the example table in PostgreSQL
2. `pnpm run db:studio` opens Drizzle Studio showing the example table and its schema
3. The database client singleton in `$lib/server/db/index.ts` connects using `$env/dynamic/private` (not static)
4. All four drizzle-kit scripts are available: `db:generate`, `db:migrate`, `db:push`, `db:studio`

**Plans**: 2 plans

Plans:

- [x] 04-01-PLAN.md -- Scaffold Drizzle ORM, create posts schema with UUIDv7, DB client singleton, and db:\* scripts
- [x] 04-02-PLAN.md -- Push schema to PostgreSQL, generate first migration, verify migration applies cleanly

### Phase 5: Observability

**Goal**: Every request to the SvelteKit app produces traces and metrics visible in the Aspire Dashboard (already running from Phase 2), with structured logging and a health check endpoint
**Depends on**: Phase 4 (DB available for health check and DB span instrumentation)
**Requirements**: OBS-01, OBS-02, OBS-03, OBS-04, OBS-05, OBS-06
**Success Criteria** (what must be TRUE):

1. After hitting any page, traces appear in the Aspire Dashboard UI at `localhost:18888` showing HTTP and database spans
2. `GET /api/health` returns JSON with `status`, `db`, and `timestamp` fields -- returns healthy when DB is up, unhealthy (503) when DB is down
3. Application logs are structured JSON (not plain text) and include trace correlation IDs
4. The OTEL SDK initializes in `instrumentation.server.ts` before any app code loads (verified by traces existing for the first request after cold start)

**Plans**: 2 plans

Plans:

- [x] 05-01-PLAN.md -- OTEL SDK + selective auto-instrumentation + pino structured logging + env vars + hooks enrichment
- [x] 05-02-PLAN.md -- Health check endpoint (GET /api/health) with DB connectivity check

### Phase 6: Security

**Goal**: The app applies security best-practice HTTP headers on every response and enforces server-only boundaries -- all wired through a clean hooks pipeline
**Depends on**: Phase 5 (OTEL span enrichment needed for sequence() composition)
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04
**Success Criteria** (what must be TRUE):

1. Every response includes security headers: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, and Referrer-Policy (verifiable via browser DevTools or curl)
2. CSRF origin checking is active -- a POST request from a different origin is rejected by SvelteKit
3. Importing any module from `$lib/server/` in client-side code causes a build error
4. `hooks.server.ts` uses `sequence()` composing separate handle functions for security, OTEL enrichment, and locals population

**Plans**: 1 plan

Plans:

- [x] 06-01-PLAN.md -- Install @nosecone/sveltekit, configure nonce-based CSP, refactor hooks.server.ts to 3-handle sequence, document $lib/server/ boundary

### Phase 7: Testing

**Goal**: The template ships with working test examples at every level -- unit, component, API integration, and E2E -- all passing on a clean checkout
**Depends on**: Phase 6 (full stack in place so tests validate real behavior)
**Requirements**: TEST-01, TEST-02, TEST-03, TEST-04, TEST-05, TEST-06
**Success Criteria** (what must be TRUE):

1. `pnpm run test:unit` passes Vitest tests including at least one component test (using @testing-library/svelte) and one server-side unit test
2. `pnpm run test:unit` includes an API integration test that hits `GET /api/health` and asserts the response shape
3. `npx playwright test` passes at least one E2E test that loads the app in a browser and verifies navigation works
4. All tests pass on a clean checkout with `docker compose up` running (no manual setup beyond that)

**Plans**: 2 plans

Plans:

- [x] 07-01-PLAN.md -- Vitest workspaces (node + jsdom), StackBadge component + component test, knip cleanup
- [x] 07-02-PLAN.md -- Health endpoint integration test (testcontainers) + Playwright E2E smoke test

### Phase 8: Production Docker

**Goal**: The template includes a production-ready Docker image and the docker-compose file is finalized with no hardcoded secrets -- ready to clone and deploy
**Depends on**: Phase 7 (all features complete and tested)
**Requirements**: DOCK-02, DOCK-03, DOCK-04
**Success Criteria** (what must be TRUE):

1. `docker build -f docker/Dockerfile .` produces a working production image under 200MB that runs as a non-root user
2. `docker-compose.yml` references `.env` for all secrets -- no hardcoded passwords in the compose file
3. `CLAUDE.md` is updated with finalized commands, folder structure, and any conventions that evolved during development

**Plans**: 2 plans

Plans:

- [ ] 08-01-PLAN.md -- Multi-stage Dockerfile + .dockerignore + production docker-compose + Docker build verification
- [ ] 08-02-PLAN.md -- Full audit update of CLAUDE.md (conventions, architecture, commands, env vars)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8

| Phase                            | Plans Complete | Status      | Completed  |
| -------------------------------- | -------------- | ----------- | ---------- |
| 1. Foundation                    | 4/4            | Done        | 2026-04-05 |
| 2. Dev Infrastructure & AI Agent | 3/3            | Complete    | 2026-04-09 |
| 3. Code Quality                  | 1/1            | Complete    | 2026-04-06 |
| 4. Database                      | 2/2            | Complete    | 2026-04-07 |
| 5. Observability                 | 2/2            | Complete    | 2026-04-10 |
| 6. Security                      | 1/1            | Complete    | 2026-04-11 |
| 7. Testing                       | 0/2            | Not started | -          |
| 8. Production Docker             | 0/2            | Not started | -          |
