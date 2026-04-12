<!-- GSD:project-start source:PROJECT.md -->

## Project

**SvelteKit Battery-Included Starter**

A production-quality SvelteKit full-stack starter template designed to be cloned and used as the foundation for any project. It ships with a curated, opinionated set of tools pre-configured and ready to use: database, observability, testing, code quality, security, and AI coding agent configuration — so developers can focus on product work from day one.

**Core Value:** A developer should be able to clone this repo, run `docker compose up`, and have a fully working, production-grade full-stack SvelteKit app with all tooling configured and passing — in under 5 minutes.

### Constraints

- **Tech Stack**: SvelteKit + Node adapter + Tailwind + DaisyUI + PostgreSQL + Drizzle — no swapping these out
- **Zero external accounts**: Everything in the dev stack must run locally; no SaaS required to run the starter
- **Template usability**: The starter must be deletable (clean git history friendly) and not assume a specific app domain
- **Node.js compatibility**: Must run on current LTS Node.js; no Bun or Deno requirement
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->

## Technology Stack

## Recommended Stack

### Core Framework

| Technology | Version | Purpose                   | Why                                                                                     |
| ---------- | ------- | ------------------------- | --------------------------------------------------------------------------------------- |
| SvelteKit  | ^2.56.1 | Full-stack meta-framework | Only choice for Svelte SSR/SSG/API routes; v2 is stable with active releases            |
| Svelte     | ^5.55.1 | UI framework (runes)      | Svelte 5 is the current stable; runes replace stores for reactivity                     |
| TypeScript | ^6.0.2  | Type safety               | Strict mode catches errors at compile time; TS 6.x is current LTS                       |
| Node.js    | 22 LTS  | Runtime                   | Current LTS (active until Oct 2027); required for OTEL `import-in-the-middle` ESM hooks |

### Adapter & Build

| Technology                   | Version    | Purpose               | Why                                                                        |
| ---------------------------- | ---------- | --------------------- | -------------------------------------------------------------------------- |
| @sveltejs/adapter-node       | ^5.5.4     | Node.js server output | Required for Docker/self-hosted deployment; outputs standalone Node server |
| @sveltejs/vite-plugin-svelte | ^7.0.0     | Vite integration      | Required by SvelteKit; handles `.svelte` file compilation                  |
| Vite                         | (peer dep) | Build tool            | Bundled with SvelteKit; no separate install needed                         |

### UI Layer

| Technology   | Version | Purpose                 | Why                                                                                             |
| ------------ | ------- | ----------------------- | ----------------------------------------------------------------------------------------------- |
| Tailwind CSS | ^4.2.2  | Utility CSS framework   | v4 is a ground-up rewrite: 5x faster builds, CSS-first config, no `tailwind.config.js` needed   |
| DaisyUI      | ^5.5.19 | Component class library | v5 is a zero-dependency rewrite for Tailwind v4; 34 kB compressed CSS; configured in CSS not JS |

### Database

| Technology         | Version  | Purpose             | Why                                                                                                               |
| ------------------ | -------- | ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| PostgreSQL         | 17       | Primary database    | Industry standard RDBMS; runs in Docker for dev                                                                   |
| pg (node-postgres) | ^8.20.0  | PostgreSQL driver   | OpenTelemetry auto-instrumentation support; used with drizzle-orm/node-postgres; Pool-based connection management |
| drizzle-orm        | ^0.45.2  | ORM / query builder | Type-safe SQL with zero runtime overhead; schema-as-code; supports node-postgres natively                         |
| drizzle-kit        | ^0.31.10 | Migration tooling   | Generates SQL migrations from schema diffs; `drizzle-kit push` for dev, `drizzle-kit migrate` for production      |

### Observability

| Technology                                | Version  | Purpose                       | Why                                                                                   |
| ----------------------------------------- | -------- | ----------------------------- | ------------------------------------------------------------------------------------- |
| @opentelemetry/sdk-node                   | ^0.214.0 | OTEL Node.js SDK              | Official SDK 2.0 line; provides NodeSDK class for one-shot setup                      |
| @opentelemetry/auto-instrumentations-node | ^0.72.0  | Auto-instrumentation          | Automatically instruments HTTP, fetch, postgres, and 30+ libraries                    |
| @opentelemetry/exporter-trace-otlp-proto  | ^0.214.0 | OTLP exporter (protobuf/HTTP) | Sends traces to Aspire Dashboard via OTLP/HTTP; proto is more efficient than JSON     |
| import-in-the-middle                      | ^3.0.0   | ESM hook loader               | Required by SvelteKit's `instrumentation.server.ts` for ESM auto-instrumentation      |
| .NET Aspire Dashboard                     | latest   | OTEL collector + UI           | Single container; receives OTLP gRPC/HTTP; zero config; beautiful trace/metric viewer |

### Security

| Technology              | Version    | Purpose            | Why                                                                                                                           |
| ----------------------- | ---------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| @nosecone/sveltekit     | ^1.3.1     | Security headers   | Type-safe defaults for CSP, HSTS, X-Frame-Options, X-Content-Type-Options; PCI DSS 4.0 compliant; integrates via `sequence()` |
| SvelteKit built-in CSRF | (built-in) | CSRF protection    | SvelteKit checks `Origin` header on all non-GET requests by default; no library needed                                        |
| Zod                     | ^4.3.6     | Env var validation | Validates environment variables at startup; fail-fast on missing/invalid config                                               |

### Testing

| Technology                | Version    | Purpose                  | Why                                                                     |
| ------------------------- | ---------- | ------------------------ | ----------------------------------------------------------------------- |
| Vitest                    | ^4.1.2     | Unit + component tests   | Vite-native; shares SvelteKit's Vite config; fast HMR-aware test runner |
| @testing-library/svelte   | ^5.3.1     | Component test utilities | DOM-based component rendering; `render()`, `fireEvent()`, queries       |
| jsdom                     | (peer dep) | DOM environment          | Lightweight browser simulation for component tests                      |
| @testing-library/jest-dom | (latest)   | DOM matchers             | `toBeInTheDocument()`, `toHaveTextContent()`, etc.                      |
| @playwright/test          | ^1.59.1    | E2E browser tests        | Official Playwright; cross-browser; SvelteKit `webServer` integration   |

### Code Quality

| Technology                  | Version | Purpose                | Why                                                                            |
| --------------------------- | ------- | ---------------------- | ------------------------------------------------------------------------------ |
| ESLint                      | ^10.2.0 | Linting                | v10 is current; flat config only (no `.eslintrc`)                              |
| eslint-plugin-svelte        | ^3.17.0 | Svelte linting         | v3 supports flat config only; parses `.svelte` files with svelte-eslint-parser |
| typescript-eslint           | ^8.58.0 | TS linting             | Type-aware linting rules; flat config compatible                               |
| Prettier                    | ^3.8.1  | Code formatting        | Opinionated formatter; already in the repo                                     |
| prettier-plugin-svelte      | ^3.5.1  | Svelte formatting      | Formats `.svelte` files; must load before tailwind plugin                      |
| prettier-plugin-tailwindcss | ^0.7.2  | Tailwind class sorting | Auto-sorts utility classes; must load LAST in plugin chain                     |
| Husky                       | ^9.1.7  | Git hooks              | v9 is current; already in the repo; runs lint-staged on pre-commit             |
| lint-staged                 | ^16.4.0 | Staged file processing | Already in the repo; runs ESLint + Prettier on staged files                    |
| Knip                        | ^6.3.0  | Dead code detection    | Finds unused files, exports, dependencies; has built-in Svelte plugin          |

## Docker Compose Dev Stack

# docker-compose.yml

- `18888:18888` -- Dashboard UI at http://localhost:18888
- `4317:18889` -- Standard OTLP gRPC port mapped to Aspire's internal gRPC port
- `4318:18890` -- Standard OTLP HTTP port mapped to Aspire's internal HTTP port

## Environment Variables (.env)

### Database

| Variable            | Required | Default                                           | Description                                                                                           |
| ------------------- | -------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `POSTGRES_USER`     | Yes      | `postgres`                                        | PostgreSQL username                                                                                   |
| `POSTGRES_PASSWORD` | Yes      | `postgres`                                        | PostgreSQL password                                                                                   |
| `POSTGRES_DB`       | Yes      | `app`                                             | PostgreSQL database name                                                                              |
| `DATABASE_URL`      | Yes      | `postgres://postgres:postgres@localhost:5432/app` | Full connection URL (use service name `postgres` instead of `localhost` in Docker Compose production) |

### OpenTelemetry

| Variable                      | Required | Default                 | Description                   |
| ----------------------------- | -------- | ----------------------- | ----------------------------- |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Yes      | `http://localhost:4318` | OTLP HTTP endpoint for traces |
| `OTEL_SERVICE_NAME`           | Yes      | `sveltekit-starter`     | Service name in traces        |

### Logging

| Variable    | Required | Default | Description                                        |
| ----------- | -------- | ------- | -------------------------------------------------- |
| `LOG_LEVEL` | No       | `info`  | Pino log level (trace/debug/info/warn/error/fatal) |

### Production

| Variable | Required  | Default | Description                                                          |
| -------- | --------- | ------- | -------------------------------------------------------------------- |
| `ORIGIN` | Prod only | —       | Full origin URL for CSRF validation (e.g., `https://yourdomain.com`) |
| `PORT`   | No        | `3000`  | HTTP port for adapter-node                                           |

## Alternatives Considered

| Category         | Recommended         | Alternative            | Why Not                                                                                                                              |
| ---------------- | ------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| PG driver        | pg (node-postgres)  | postgres.js            | postgres.js lacks OpenTelemetry auto-instrumentation support; pg is used with drizzle-orm/node-postgres                              |
| ORM              | Drizzle             | Prisma                 | Prisma has a heavy binary engine, slower cold starts, and generates a client that obscures SQL. Drizzle is SQL-first and lightweight |
| Component lib    | DaisyUI             | shadcn-svelte          | Project constraint: DaisyUI chosen for class-based simplicity over copied component files                                            |
| Security headers | @nosecone/sveltekit | Manual hooks.server.ts | Manual implementation is error-prone and hard to audit; Nosecone provides typed defaults                                             |
| OTEL collector   | Aspire Dashboard    | Jaeger / Grafana+Tempo | Aspire is a single container with built-in UI; Jaeger/Grafana require multi-container setup                                          |
| CSRF             | SvelteKit built-in  | sveltekit-rate-limiter | Built-in origin checking is sufficient; rate limiting is a separate concern                                                          |
| Test runner      | Vitest              | Jest                   | Vitest is Vite-native; Jest requires separate bundler config for Svelte/TS                                                           |
| Dead code        | Knip                | ts-prune               | Knip detects unused files, deps, AND exports; has Svelte plugin; ts-prune only finds exports                                         |
| Env validation   | Zod                 | t3-env                 | Zod is already a dependency; t3-env adds unnecessary abstraction over a 10-line Zod schema                                           |

## What NOT to Use

| Technology                                | Why Not                                                                        |
| ----------------------------------------- | ------------------------------------------------------------------------------ |
| `@sveltejs/adapter-auto`                  | Assumes Vercel/Netlify deployment; we need explicit Node.js adapter for Docker |
| `@sveltejs/adapter-static`                | No SSR/API routes; defeats the purpose of a full-stack starter                 |
| `tailwind.config.js`                      | Tailwind v4 uses CSS-first config; JS config is legacy                         |
| `@tailwind` directives                    | Replaced by `@import "tailwindcss"` in v4                                      |
| Drizzle v1 beta                           | Breaking changes; not stable for a starter template                            |
| `$env/static/private` for secrets         | Bakes values at build time; Docker deployments need runtime env vars           |
| `.eslintrc.js` / `.eslintrc.json`         | ESLint 10 supports flat config only; legacy config is deprecated               |
| sveltekit-rate-limiter for CSRF           | Conflates two concerns; SvelteKit has built-in CSRF                            |
| Sentry SDK                                | Requires external account; violates zero-external-accounts constraint          |
| `@opentelemetry/exporter-trace-otlp-http` | Use `otlp-proto` instead; protobuf is more efficient than JSON over HTTP       |

## Installation

# Create SvelteKit project (if starting fresh)

# Core framework

# UI

# Database

# Observability

# Security

# Testing

# Code quality

## Sources

- SvelteKit Observability Docs: https://svelte.dev/docs/kit/observability (HIGH confidence)
- SvelteKit Adapter Node Docs: https://svelte.dev/docs/kit/adapter-node (HIGH confidence)
- Aspire Dashboard Standalone Docs: https://aspire.dev/dashboard/standalone/ (HIGH confidence)
- Tailwind CSS v4 Blog: https://tailwindcss.com/blog/tailwindcss-v4 (HIGH confidence)
- DaisyUI v5 Release Notes: https://daisyui.com/docs/v5/ (HIGH confidence)
- OpenTelemetry JS SDK 2.0 Announcement: https://opentelemetry.io/blog/2025/otel-js-sdk-2-0/ (HIGH confidence)
- Drizzle ORM PostgreSQL Docs: https://orm.drizzle.team/docs/get-started/postgresql-new (HIGH confidence)
- eslint-plugin-svelte User Guide: https://sveltejs.github.io/eslint-plugin-svelte/user-guide/ (HIGH confidence)
- Nosecone SvelteKit Docs: https://docs.arcjet.com/nosecone/quick-start?f=sveltekit (HIGH confidence)
- Knip Svelte Plugin: https://knip.dev/reference/plugins/svelte (HIGH confidence)
- Svelte Testing Docs: https://svelte.dev/docs/svelte/testing (HIGH confidence)
- npm registry version checks: run 2026-04-05 (HIGH confidence)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

### Svelte 5 Runes (NOT Stores)

- Use `$state`, `$derived`, `$effect`, `$props` for all reactivity
- Use `{@render children()}` for slot content — NOT `<slot />`
- Do NOT use `writable()`, `readable()`, or `derived()` stores from `svelte/store`

### Server-Only Boundary

- All server-only code lives in `$lib/server/` — importing from this path in client code causes a build error
- Database client, env validation, logger, and all secrets are in `$lib/server/`
- Use `$env/dynamic/private` for secrets (NOT `$env/static/private`) to support Docker runtime env vars

### Environment Validation

- Zod schema in `src/lib/server/env/schema.ts` validates all required env vars at startup
- App fails fast with a clear Zod error if a required variable is missing
- Import validated env as `import { env } from '$lib/server/env'`

### Database

- Drizzle ORM with `pg` (node-postgres) driver — NOT `postgres.js`
- DB client singleton in `src/lib/server/db/index.ts` (module-level Pool, not per-request)
- Schema files in `src/lib/server/db/schema/`
- Migrations committed to `drizzle/` directory (auto-generated names, do not rename)
- Dev workflow: `db:push` to validate schema, then `db:generate` to produce migration SQL

### Logging

- Structured logging via `@opentelemetry/api-logs` with a pino-compatible API (`src/lib/server/logger.ts`)
- Use `logger.info(...)`, `logger.error(...)` — NOT `console.log`
- Supports both `logger.info('message')` and `logger.info({ key: 'value' }, 'message')` overloads
- Log level controlled by `LOG_LEVEL` env var; mirrors to stdout as JSON for local log tailing

### Hooks Pipeline

- `src/hooks.server.ts` uses `sequence()` to compose handle functions
- Order: nosecone security headers first, then OTEL enrichment, then logging/locals
- Each handle function is a named export for testability

### CSS-First Styling

- All Tailwind + DaisyUI config in `src/app.css` via `@import` and `@plugin` — no `tailwind.config.js`
- DaisyUI themes set via `data-theme` attribute on `<html>` element

### Code Quality

- ESLint flat config (`eslint.config.js`) — no `.eslintrc` files
- Prettier plugin order: `prettier-plugin-svelte` THEN `prettier-plugin-tailwindcss` (tailwind last)
- Pre-commit hook via Husky + lint-staged runs ESLint + Prettier on staged files
- Knip for dead code detection with SvelteKit-aware config

<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

### Folder Structure

```
src/
  app.css                        # Tailwind v4 + DaisyUI v5 CSS-first config
  app.html                       # HTML shell with data-theme
  hooks.server.ts                # Request pipeline: security -> OTEL -> logging
  instrumentation.server.ts      # OTEL SDK init (runs before any app code)
  lib/
    server/
      db/
        index.ts                 # Drizzle client + pg Pool singleton
        schema/                  # Drizzle schema files (posts.ts, etc.)
      env/
        index.ts                 # Validated env export
        schema.ts                # Zod env validation schema
      logger.ts                  # Structured OTEL logger (pino-compatible API)
  routes/
    +layout.svelte               # Root layout (navbar + drawer + theme toggle)
    +page.svelte                 # Home page
    +error.svelte                # Error page
    api/
      health/
        +server.ts               # GET /api/health (DB connectivity check)
docker/
  Dockerfile                     # Multi-stage production build (3 stages)
  docker-compose.prod.yml        # Production: app + postgres
docker-compose.yml               # Dev only: postgres + Aspire Dashboard
drizzle/                         # Committed migration SQL files
  meta/                          # Migration journal + snapshots
```

### Key Commands

| Command | Purpose |
|---------|---------|
| `pnpm run dev` | Start SvelteKit dev server (hot reload) |
| `pnpm run build` | Build for production (adapter-node output in `build/`) |
| `pnpm run preview` | Preview production build locally |
| `pnpm run check` | Run svelte-check TypeScript validation |
| `pnpm run lint` | Run ESLint |
| `pnpm run format` | Run Prettier |
| `pnpm run knip` | Run dead code detection |
| `pnpm run test:unit` | Run Vitest unit + component + integration tests |
| `pnpm run test:e2e` | Run Playwright E2E tests |
| `pnpm run test` | Run all tests (unit + E2E) |
| `pnpm run db:push` | Push schema to dev DB (validates schema) |
| `pnpm run db:generate` | Generate migration SQL from schema diff |
| `pnpm run db:migrate` | Apply migrations to database |
| `pnpm run db:studio` | Open Drizzle Studio UI |
| `docker compose up` | Start dev dependencies (PostgreSQL + Aspire Dashboard) |
| `docker build -f docker/Dockerfile .` | Build production Docker image |
| `docker compose -f docker/docker-compose.prod.yml up` | Run production stack (app + PostgreSQL) |

### Request Flow

1. Request enters SvelteKit
2. `hooks.server.ts` `sequence()` pipeline runs:
   - Nosecone adds security headers (CSP with nonce, HSTS, X-Frame-Options, etc.)
   - OTEL handle enriches the active span with route info
   - Logging handle populates `event.locals` and logs request
3. Route handler executes (page or API endpoint)
4. Response includes security headers on every response

<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.

<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.

<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.

<!-- GSD:profile-end -->
