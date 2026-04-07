# Requirements: SvelteKit Battery-Included Starter

**Defined:** 2026-04-05
**Core Value:** Clone, run `docker compose up`, have a production-grade full-stack SvelteKit app with all tooling configured and passing -- in under 5 minutes.

## v1 Requirements

### Foundation

- [x] **FOUND-01**: SvelteKit 2 + Svelte 5 (runes) project configured with TypeScript in strict mode
- [x] **FOUND-02**: Tailwind CSS v4 configured with CSS-first setup (no `tailwind.config.js`)
- [x] **FOUND-03**: DaisyUI v5 configured as Tailwind plugin in CSS
- [x] **FOUND-04**: `@sveltejs/adapter-node` configured for production Docker/self-hosted deployment
- [x] **FOUND-05**: Base root layout (`+layout.svelte`) with mobile-responsive navigation using DaisyUI components
- [x] **FOUND-06**: Home page (`+page.svelte`) demonstrating the stack is working (not a blank page)
- [x] **FOUND-07**: Error page (`+error.svelte`) with DaisyUI styling

### Code Quality

- [x] **QUAL-01**: ESLint configured with SvelteKit-appropriate flat config (`eslint.config.js`)
- [x] **QUAL-02**: Prettier configured with `prettier-plugin-svelte` and consistent formatting rules
- [x] **QUAL-03**: Husky v9 installed with `pre-commit` hook running lint-staged
- [x] **QUAL-04**: lint-staged configured to run ESLint + Prettier only on staged `.ts`, `.svelte`, `.js` files
- [x] **QUAL-05**: Knip configured for SvelteKit's file-based routing entry points; `knip` script in `package.json`
- [x] **QUAL-06**: All quality tools pass on a clean checkout (no pre-existing lint errors)

### Database

- [x] **DB-01**: PostgreSQL 17 service defined in `docker-compose.yml` with named volume persistence and health check
- [x] **DB-02**: `postgres.js` driver installed and configured as the PostgreSQL client
- [x] **DB-03**: Drizzle ORM configured with a `drizzle.config.ts` pointing to `src/lib/server/db/schema/`
- [x] **DB-04**: Initial Drizzle schema file with at least one example table demonstrating the pattern
- [x] **DB-05**: First migration generated and committed to `drizzle/` directory
- [x] **DB-06**: `drizzle-kit` scripts in `package.json`: `db:generate`, `db:migrate`, `db:push`, `db:studio`
- [x] **DB-07**: Database client singleton in `src/lib/server/db/index.ts` (module-level, not per-request)

### Environment & Configuration

- [ ] **ENV-01**: `.env.example` documenting all required environment variables with comments and example values
- [ ] **ENV-02**: Zod schema validating all required server env vars in `src/lib/server/env.ts`; app fails fast on startup with clear error if vars are missing
- [ ] **ENV-03**: `$env/dynamic/private` used for secrets (not `$env/static/private`) to support Docker environment-per-deployment pattern

### Observability

- [ ] **OBS-01**: `src/instrumentation.server.ts` initializes OpenTelemetry SDK before any app code loads
- [ ] **OBS-02**: Selective OTEL auto-instrumentations configured: HTTP, `postgres.js`, `fetch` (not the mega-bundle)
- [ ] **OBS-03**: Traces and metrics exported via OTLP/HTTP to the local Aspire Dashboard
- [ ] **OBS-04**: Structured logging configured (pino or equivalent) with log records sent to the OTEL pipeline
- [ ] **OBS-05**: .NET Aspire Dashboard container in `docker-compose.yml` as the local OTEL collector + UI (OTLP port 4318, dashboard UI on port 18888)
- [ ] **OBS-06**: `GET /api/health` endpoint returning JSON `{ status, db, timestamp }` -- checks DB connectivity

### Security

- [ ] **SEC-01**: Security HTTP headers applied in `hooks.server.ts` via `@nosecone/sveltekit`: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- [ ] **SEC-02**: SvelteKit built-in CSRF origin checking configured and documented in `hooks.server.ts` comments
- [ ] **SEC-03**: `$lib/server/` directory enforced as server-only -- no accidental client-side imports of secrets
- [ ] **SEC-04**: `hooks.server.ts` uses `sequence()` to compose security headers, OTEL span enrichment, and locals population in a clean, testable pipeline

### Testing

- [ ] **TEST-01**: Vitest configured in `vite.config.ts` with `$lib` path aliases and SvelteKit module resolution
- [ ] **TEST-02**: `@testing-library/svelte` installed; at least one component unit test demonstrating the pattern
- [ ] **TEST-03**: At least one server-side unit test (e.g., testing a utility function or Drizzle query helper)
- [ ] **TEST-04**: API/integration tests for `GET /api/health` using SvelteKit test utilities or direct fetch against test server
- [ ] **TEST-05**: Playwright configured against the SvelteKit dev server; smoke E2E test verifying the app renders and nav works
- [ ] **TEST-06**: All tests pass on a clean checkout with `docker compose up` running

### Docker & Deployment

- [ ] **DOCK-01**: `docker-compose.yml` starts PostgreSQL + Aspire Dashboard with health checks; developer runs `docker compose up` for full dev stack
- [ ] **DOCK-02**: Production `Dockerfile` with multi-stage build: install deps -> build SvelteKit -> copy adapter-node output to slim final image
- [ ] **DOCK-03**: Production image runs as non-root user; optimized image size
- [ ] **DOCK-04**: `docker-compose.yml` environment variables reference `.env` file; no hardcoded secrets

### AI Agent Configuration

- [ ] **AI-01**: `CLAUDE.md` at project root with: project overview, tech stack, folder structure, key commands (`pnpm run dev`, `docker compose up`, test scripts, db scripts), coding conventions, and testing patterns
- [ ] **AI-02**: `.claude/settings.json` (or `mcp.json`) pre-configured with the official `@sveltejs/mcp` MCP server so Claude Code has Svelte/SvelteKit docs + `svelte-autofixer` available automatically

## v2 Requirements

### CI/CD

- **CI-01**: GitHub Actions workflow: lint + test + build on pull requests
- **CI-02**: Docker image build and push to registry on merge to main

## Out of Scope

| Feature                             | Reason                                                                                    |
| ----------------------------------- | ----------------------------------------------------------------------------------------- |
| Authentication / user management    | Project-specific; every app needs different auth. Keeping it out is a feature, not a gap. |
| State management library            | Svelte 5 runes cover all needs; external library is an anti-feature for a Svelte starter  |
| i18n / internationalization         | Massive complexity; project-specific requirement                                          |
| Email service integration           | Requires external accounts; violates zero-external-accounts principle                     |
| Sentry error tracking (v1)          | Requires external account; OTEL covers local needs; defer to v2 optional                  |
| GitHub Actions CI/CD                | Deployment-target specific; wrong for most users if included in v1                        |
| Storybook                           | Adds 50+ deps; most developers delete it                                                  |
| VS Code workspace config            | IDE lock-in; not every developer uses VS Code                                             |
| Commitlint / conventional commits   | Adds friction; teams choose their own conventions                                         |
| Payment integration                 | Domain-specific; requires external accounts                                               |
| Marketing / landing pages           | Infrastructure template, not a product                                                    |
| Cursor rules / Copilot instructions | Scoped to CLAUDE.md + Svelte MCP only for v1                                              |

## Traceability

| Requirement | Phase                                  | Status   |
| ----------- | -------------------------------------- | -------- |
| FOUND-01    | Phase 1: Foundation                    | Complete |
| FOUND-02    | Phase 1: Foundation                    | Complete |
| FOUND-03    | Phase 1: Foundation                    | Complete |
| FOUND-04    | Phase 1: Foundation                    | Complete |
| FOUND-05    | Phase 1: Foundation                    | Complete |
| FOUND-06    | Phase 1: Foundation                    | Complete |
| FOUND-07    | Phase 1: Foundation                    | Complete |
| DOCK-01     | Phase 2: Dev Infrastructure & AI Agent | Pending  |
| ENV-01      | Phase 2: Dev Infrastructure & AI Agent | Pending  |
| ENV-02      | Phase 2: Dev Infrastructure & AI Agent | Pending  |
| ENV-03      | Phase 2: Dev Infrastructure & AI Agent | Pending  |
| AI-01       | Phase 2: Dev Infrastructure & AI Agent | Pending  |
| AI-02       | Phase 2: Dev Infrastructure & AI Agent | Pending  |
| QUAL-01     | Phase 3: Code Quality                  | Complete |
| QUAL-02     | Phase 3: Code Quality                  | Complete |
| QUAL-03     | Phase 3: Code Quality                  | Complete |
| QUAL-04     | Phase 3: Code Quality                  | Complete |
| QUAL-05     | Phase 3: Code Quality                  | Complete |
| QUAL-06     | Phase 3: Code Quality                  | Complete |
| DB-01       | Phase 4: Database                      | Complete |
| DB-02       | Phase 4: Database                      | Complete |
| DB-03       | Phase 4: Database                      | Complete |
| DB-04       | Phase 4: Database                      | Complete |
| DB-05       | Phase 4: Database                      | Complete |
| DB-06       | Phase 4: Database                      | Complete |
| DB-07       | Phase 4: Database                      | Complete |
| OBS-01      | Phase 5: Observability                 | Pending  |
| OBS-02      | Phase 5: Observability                 | Pending  |
| OBS-03      | Phase 5: Observability                 | Pending  |
| OBS-04      | Phase 5: Observability                 | Pending  |
| OBS-05      | Phase 5: Observability                 | Pending  |
| OBS-06      | Phase 5: Observability                 | Pending  |
| SEC-01      | Phase 6: Security                      | Pending  |
| SEC-02      | Phase 6: Security                      | Pending  |
| SEC-03      | Phase 6: Security                      | Pending  |
| SEC-04      | Phase 6: Security                      | Pending  |
| TEST-01     | Phase 7: Testing                       | Pending  |
| TEST-02     | Phase 7: Testing                       | Pending  |
| TEST-03     | Phase 7: Testing                       | Pending  |
| TEST-04     | Phase 7: Testing                       | Pending  |
| TEST-05     | Phase 7: Testing                       | Pending  |
| TEST-06     | Phase 7: Testing                       | Pending  |
| DOCK-02     | Phase 8: Production Docker             | Pending  |
| DOCK-03     | Phase 8: Production Docker             | Pending  |
| DOCK-04     | Phase 8: Production Docker             | Pending  |

**Coverage:**

- v1 requirements: 45 total
- Mapped to phases: 45
- Unmapped: 0

---

_Requirements defined: 2026-04-05_
_Last updated: 2026-04-05 after roadmap revision (Phase 2 reorder)_
