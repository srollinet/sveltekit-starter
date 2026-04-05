# SvelteKit Battery-Included Starter

## What This Is

A production-quality SvelteKit full-stack starter template designed to be cloned and used as the foundation for any project. It ships with a curated, opinionated set of tools pre-configured and ready to use: database, observability, testing, code quality, security, and AI coding agent configuration — so developers can focus on product work from day one.

## Core Value

A developer should be able to clone this repo, run `docker compose up`, and have a fully working, production-grade full-stack SvelteKit app with all tooling configured and passing — in under 5 minutes.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] SvelteKit full-stack app with Node.js adapter for Docker/self-hosted deployment
- [ ] Tailwind CSS + DaisyUI pre-configured as the UI foundation
- [ ] PostgreSQL database (Docker Compose for dev) + Drizzle ORM with migrations
- [ ] Docker Compose dev stack: PostgreSQL + .NET Aspire dashboard (OTEL collector + UI)
- [ ] OpenTelemetry SDK integrated — traces/metrics exported to local Aspire dashboard
- [ ] Health check endpoint at `/api/health` (database + app status)
- [ ] Vitest configured for unit and component testing
- [ ] Playwright configured for end-to-end browser tests
- [ ] API/integration tests configured for SvelteKit server routes
- [ ] ESLint + Prettier configured with SvelteKit-appropriate rules
- [ ] Husky + lint-staged enforcing quality on commit
- [ ] TypeScript in strict mode
- [ ] Knip configured for dead code detection
- [ ] Security HTTP headers (CSP, HSTS, X-Frame-Options, etc.) via SvelteKit hooks
- [ ] CSRF protection pre-wired in SvelteKit hooks
- [ ] CLAUDE.md with project-specific AI coding agent instructions
- [ ] Environment variable validation with Zod at startup (fail fast on missing vars)

### Out of Scope

- Authentication / user management — intentionally excluded to keep the template lean; auth is project-specific
- Cursor rules / GitHub Copilot instructions — only CLAUDE.md targeted for AI agent config
- Makefile / task runner — scripts in package.json are sufficient
- VS Code workspace settings — not included to avoid IDE lock-in
- GitHub Actions CI — not included; deployment CI is project-specific
- Sentry error tracking — excluded to avoid requiring external account setup for a starter

## Context

- This is a greenfield SvelteKit template repo — the existing code in the repository is the SvelteKit scaffold being extended, not a separate brownfield application.
- The target user is a developer (or AI coding agent) starting a new project who wants professional production tooling without manual configuration.
- PostgreSQL runs in Docker Compose for local dev; the Node.js adapter enables straightforward Docker-based production deployment.
- The .NET Aspire Dashboard is used as a lightweight zero-config OTEL collector + UI — single container, no external accounts required, supports OTLP protocol natively.
- "Configured and ready to use with AI coding agent" means CLAUDE.md contains accurate project structure, commands, and conventions so Claude Code works effectively out of the box.

## Constraints

- **Tech Stack**: SvelteKit + Node adapter + Tailwind + DaisyUI + PostgreSQL + Drizzle — no swapping these out
- **Zero external accounts**: Everything in the dev stack must run locally; no SaaS required to run the starter
- **Template usability**: The starter must be deletable (clean git history friendly) and not assume a specific app domain
- **Node.js compatibility**: Must run on current LTS Node.js; no Bun or Deno requirement

## Key Decisions

| Decision                                | Rationale                                                                                             | Outcome   |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------- |
| DaisyUI over shadcn-svelte              | User preference; simpler class-based components vs. copied component files                            | — Pending |
| .NET Aspire Dashboard for OTEL          | Lightweight single-container with built-in OTLP support and clean UI; no Grafana stack complexity     | — Pending |
| No auth included                        | Auth is highly project-specific; including it creates bloat and opinions that don't fit every project | — Pending |
| Zod env validation                      | Fail fast on startup if required env vars are missing — prevents mysterious runtime failures          | — Pending |
| PostgreSQL in Docker Compose only (dev) | Template defines the dev wiring; production DB connection is project-specific                         | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):

1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):

1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---

_Last updated: 2026-04-05 after initialization_
