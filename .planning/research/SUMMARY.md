# Research Summary: SvelteKit Battery-Included Starter

**Domain:** Full-stack web application starter template
**Researched:** 2026-04-05
**Overall confidence:** HIGH

## Executive Summary

The 2025/2026 SvelteKit ecosystem is mature and well-integrated. SvelteKit 2.56+ with Svelte 5 provides a stable full-stack framework with built-in OpenTelemetry support (shipped Aug 2025), native CSRF protection, and CSP configuration. The tooling ecosystem has converged: Tailwind CSS v4 eliminates JS config files in favor of CSS-first configuration, DaisyUI v5 is a zero-dependency rewrite aligned with Tailwind v4, and ESLint 10 enforces flat config only.

The database layer is straightforward: Drizzle ORM with postgres.js provides type-safe SQL with zero runtime overhead and the fastest PostgreSQL driver available for Node.js. Both are ESM-native, avoiding the CommonJS friction that plagues alternatives like Prisma and node-postgres.

Observability is the most complex integration area. SvelteKit's `instrumentation.server.ts` file (experimental but stable in practice) initializes the OpenTelemetry SDK before application code loads. The .NET Aspire Dashboard serves as an excellent local-only OTEL receiver -- a single Docker container with built-in OTLP support and a clean trace/metrics UI, no external accounts required.

Security is well-served by SvelteKit's built-in CSRF origin checking combined with @nosecone/sveltekit for security headers. This covers OWASP recommendations without custom code. Environment validation with Zod using `$env/dynamic/private` ensures fail-fast startup for Docker deployments where env vars change per environment.

## Key Findings

**Stack:** SvelteKit 2.56 + Svelte 5 + Tailwind v4 + DaisyUI v5 + Drizzle ORM + postgres.js + Node adapter for Docker
**Architecture:** SvelteKit conventions (routes, hooks, server libs) + Docker Compose (PostgreSQL + Aspire Dashboard)
**Critical pitfall:** OTEL instrumentation must initialize before any app code (use `instrumentation.server.ts`); using `$env/static/private` for secrets bakes values at build time, breaking Docker deployments

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Foundation** - SvelteKit + Tailwind + DaisyUI + TypeScript strict + adapter-node
   - Addresses: Core framework setup, UI foundation
   - Avoids: Starting with complex integrations before the base works

2. **Database** - PostgreSQL Docker + Drizzle ORM + migrations + health check
   - Addresses: Database layer, `/api/health` endpoint
   - Avoids: Coupling DB setup with observability

3. **Observability** - OTEL SDK + Aspire Dashboard + instrumentation.server.ts
   - Addresses: Traces/metrics export, dev observability
   - Avoids: Debugging OTEL issues without a working app to trace

4. **Testing** - Vitest + @testing-library/svelte + Playwright + API tests
   - Addresses: Unit, component, E2E, and integration testing
   - Avoids: Writing tests before the app structure is stable

5. **Code Quality & Security** - ESLint + Prettier + Husky + Knip + Nosecone + Zod env + CSRF
   - Addresses: Linting, formatting, dead code, security headers, env validation
   - Avoids: Quality gates blocking earlier phases during rapid iteration

6. **Polish** - CLAUDE.md, documentation, final validation
   - Addresses: AI agent configuration, template usability
   - Avoids: Documenting patterns that haven't been validated

**Phase ordering rationale:**

- Foundation must come first because everything depends on SvelteKit + Tailwind working
- Database before observability because OTEL auto-instruments postgres queries (needs DB to exist)
- Testing after database+observability so tests can verify the full stack
- Code quality last because it enforces patterns that should be established first

**Research flags for phases:**

- Phase 3 (Observability): SvelteKit OTEL is experimental; may need deeper research if APIs change
- Phase 5 (Security): CSP directives need testing with DaisyUI's inline styles and Tailwind
- Phase 1-2: Standard patterns, unlikely to need additional research

## Confidence Assessment

| Area         | Confidence | Notes                                                                     |
| ------------ | ---------- | ------------------------------------------------------------------------- |
| Stack        | HIGH       | All versions verified via npm registry; official docs consulted           |
| Features     | HIGH       | SvelteKit docs + community patterns well-documented                       |
| Architecture | HIGH       | Standard SvelteKit conventions; Docker Compose is straightforward         |
| Pitfalls     | MEDIUM     | OTEL experimental flag may change; CSP+Tailwind interaction needs testing |

## Gaps to Address

- SvelteKit OTEL `experimental.tracing` API stability -- monitor for changes before/during Phase 3
- CSP `unsafe-inline` requirement for Tailwind/DaisyUI -- needs testing in Phase 5
- Knip SvelteKit entry patterns may need refinement during Phase 5 (route-based entries are non-standard)
- Drizzle ORM v1 stable release timeline -- may want to upgrade if v1 ships before template is done
