# Feature Landscape

**Domain:** SvelteKit battery-included full-stack starter template
**Researched:** 2026-04-05

## Table Stakes

Features developers expect in any serious starter template. Missing any of these and developers abandon the template for one that has them.

| Feature                           | Why Expected                                                                                                                         | Complexity | Notes                                                                                                                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript in strict mode         | Every production template ships with strict TS. Loose TS signals amateur hour.                                                       | Low        | SvelteKit scaffolds with TS by default; just enable `strict: true` in tsconfig                                                                                              |
| Tailwind CSS pre-configured       | De facto styling standard for modern full-stack starters. Developers expect utility-first CSS out of the box.                        | Low        | `svelte-add` handles integration cleanly                                                                                                                                    |
| ESLint + Prettier configured      | Developers expect opinionated code quality from the start. Without these, first commit is "add linting."                             | Low        | SvelteKit CLI includes ESLint/Prettier options; just need SvelteKit-appropriate rule extensions                                                                             |
| Husky + lint-staged on pre-commit | Prevents bad code from entering the repo. Standard in every serious template (create-t3-app, Next.js Boilerplate, etc.).             | Low        | `prepare` script in package.json ensures hooks install on `pnpm install`. Run ESLint + Prettier only on staged files for speed.                                             |
| Vitest for unit testing           | Vitest is the standard test runner in the Vite ecosystem. No serious SvelteKit template ships without it.                            | Low        | SvelteKit scaffolding offers Vitest; needs config for `$lib` aliases and SvelteKit module resolution                                                                        |
| Playwright for E2E testing        | Playwright is the SvelteKit-recommended E2E tool. Both Vitest AND Playwright are expected; having only one signals incomplete setup. | Low        | SvelteKit scaffolding offers Playwright; add a smoke test that verifies the app renders                                                                                     |
| Environment variable management   | Developers need to know what env vars are required. Missing vars causing cryptic runtime failures is a top complaint.                | Medium     | Zod validation of `$env/dynamic/private` + `$env/static/private` at startup. Fail fast with clear error messages. Include `.env.example` with all required vars documented. |
| Health check endpoint             | Required for Docker, Kubernetes, any container orchestration, and uptime monitoring.                                                 | Low        | `src/routes/api/health/+server.ts` returning JSON with app status + DB connectivity check                                                                                   |
| Production Dockerfile             | Developers expect to run `docker build` and get a working production image. No Dockerfile = "not production-ready."                  | Medium     | Multi-stage build with Node Alpine. Non-root user. Layer caching for `node_modules`. adapter-node output copied to final stage. Target under 200MB.                         |
| Docker Compose for dev            | One command to spin up the dev stack (DB, services). `docker compose up` is the expected developer onboarding experience.            | Medium     | PostgreSQL + Aspire Dashboard. Volumes for data persistence. Health checks on services.                                                                                     |
| `.env.example` file               | Developers need to know what environment variables exist and what format they take.                                                  | Low        | List every env var with comments explaining purpose and example values                                                                                                      |
| Database with ORM + migrations    | Full-stack starters without a database are just frontend templates. Migrations must be included for schema evolution.                | Medium     | Drizzle ORM + PostgreSQL. Include initial migration. `drizzle-kit` for push/generate/migrate commands.                                                                      |
| Security HTTP headers             | CSP, HSTS, X-Frame-Options, X-Content-Type-Options are baseline security. Missing these = security audit failure.                    | Medium     | SvelteKit hooks.server.ts for header injection. CSP with SvelteKit's built-in nonce/hash support via `kit.csp` config.                                                      |
| CSRF protection                   | SvelteKit has built-in CSRF (origin checking), but developers expect it to be explicitly configured and documented.                  | Low        | SvelteKit handles this by default. Document it in CLAUDE.md/README so developers know it exists and how to configure `trustedOrigins`.                                      |
| Responsive base layout            | A starter with no layout or a broken mobile layout signals low quality.                                                              | Low        | Tailwind + DaisyUI base layout with mobile-responsive nav. Minimal but functional.                                                                                          |

## Differentiators

Features that set a template apart from the crowd. Not expected, but signal production quality and thoughtfulness.

| Feature                                                  | Value Proposition                                                                                                                                                                | Complexity | Notes                                                                                                                                                                                    |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OpenTelemetry observability (traces + metrics)           | Most starters have ZERO observability. Including OTEL with a local dashboard (Aspire) signals "this was built by someone who runs things in production." Massive differentiator. | High       | `@opentelemetry/sdk-node` + auto-instrumentation for HTTP/Express/pg. Export via OTLP to local Aspire Dashboard. Use selective instrumentations (not the mega-bundle) to keep deps lean. |
| Local observability dashboard (Aspire)                   | Starters that include observability usually require SaaS accounts (Sentry, Datadog). A zero-account local dashboard is rare and valuable.                                        | Medium     | .NET Aspire Dashboard as single Docker container. Receives OTLP. No signup required.                                                                                                     |
| Knip for dead code detection                             | Very few starters include dead code detection. This catches unused exports, dependencies, and files automatically. Signals engineering discipline.                               | Low        | Add to `package.json` scripts. Configure entry points for SvelteKit's file-based routing. Run in CI or as pnpm script.                                                                   |
| Zod env validation with fail-fast startup                | Most starters use `.env` files but don't validate them. Zod validation that crashes on startup with a clear message ("Missing DATABASE_URL") is a developer experience win.      | Medium     | Separate schemas for server vs client env vars. Import from `$lib/server/env.ts`. Parse on module load so the app fails immediately, not on first request.                               |
| AI coding agent configuration (CLAUDE.md)                | Almost no starters include AI agent instructions. This is a 2025/2026 differentiator that signals forward-thinking DX.                                                           | Low        | Document project structure, commands, conventions, testing patterns. Keep accurate as the template evolves.                                                                              |
| API/integration test setup for server routes             | Most starters have unit tests OR E2E tests but not integration tests for API routes. Having all three testing layers is rare.                                                    | Medium     | Vitest with SvelteKit's test helpers or direct fetch against a test server. Test `+server.ts` endpoints with realistic request/response cycles.                                          |
| Comprehensive README with badges                         | Many starters have minimal READMEs. A README with status badges, clear setup instructions, architecture overview, and "what's included" section signals polish.                  | Low        | Badges for build status, TypeScript, license. Sections: Quick Start, What's Included, Project Structure, Scripts, Contributing.                                                          |
| Pre-configured `docker compose up` to full working state | The "clone and run" promise. Many starters require 5+ manual steps. One command to working app is the gold standard.                                                             | Medium     | Compose orchestrates DB + Aspire + wait-for-db + migrations + dev server. Or at minimum: DB + Aspire, with `pnpm run dev` separately.                                                    |

## Anti-Features

Features commonly included in starters that add complexity without value, or that lock developers into decisions they should make themselves.

| Anti-Feature                                    | Why Avoid                                                                                                                                                                                                                               | What to Do Instead                                                                                                                 |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Authentication / user management                | Auth is the most project-specific feature. Every project needs different auth (OAuth, magic links, passwords, SSO). Including one locks developers in or forces rip-and-replace. create-t3-app gets this right by making auth optional. | Document where auth hooks would go. Provide a `hooks.server.ts` pattern that's auth-ready but doesn't include a specific provider. |
| Storybook                                       | Adds 50+ dependencies, complex config, and maintenance burden. Most developers delete it. Component documentation belongs in the app, not a separate tool.                                                                              | Invest in well-structured components with TypeScript props documentation instead.                                                  |
| CI/CD pipeline (GitHub Actions)                 | CI is deployment-target specific. A Vercel CI differs from a Docker/VPS CI differs from a Kubernetes CI. Including one means it's wrong for most users.                                                                                 | Document what CI should check (lint, test, build). Optionally include a minimal `.github/workflows` that runs tests only.          |
| State management library (Zustand, Redux, etc.) | SvelteKit has built-in stores and runes. Adding an external state library is an opinionated choice that most Svelte developers don't want imposed.                                                                                      | Use Svelte 5 runes and `$state` for component state, SvelteKit `load` functions for page data.                                     |
| VS Code settings / workspace config             | IDE lock-in. Not every developer uses VS Code. Extensions and settings are personal preference.                                                                                                                                         | Include recommended extensions in README, not in `.vscode/`.                                                                       |
| Internationalization (i18n)                     | Massive complexity for a feature most projects don't need at launch. Paraglide, next-intl, etc. add build complexity and routing changes.                                                                                               | Keep the template in English. Document how to add i18n if needed later.                                                            |
| Email service integration                       | Requires external accounts (Resend, SendGrid, etc.). Violates zero-account principle.                                                                                                                                                   | Exclude entirely. Document that transactional email is project-specific.                                                           |
| Marketing/landing pages                         | A starter template is infrastructure, not a product. Pre-built marketing pages are either deleted or become technical debt.                                                                                                             | Include one minimal index page that demonstrates the stack working.                                                                |
| Blog engine / CMS integration                   | Highly domain-specific. A SaaS template needs a blog; a dashboard app doesn't.                                                                                                                                                          | Exclude entirely. This is SaaS-starter territory, not infrastructure-starter territory.                                            |
| Payment/subscription integration                | Requires external accounts (Stripe). Domain-specific. Wrong for most use cases of a general starter.                                                                                                                                    | Exclude entirely.                                                                                                                  |
| Commitlint / conventional commits               | Adds friction to commits. Many teams have their own commit conventions. Over-tooling the commit process annoys developers.                                                                                                              | Just Husky + lint-staged for code quality. Let teams choose their own commit message conventions.                                  |
| Sentry / external error tracking                | Requires external account signup. Violates zero-external-accounts principle.                                                                                                                                                            | OpenTelemetry traces capture errors locally via Aspire Dashboard. Document how to add Sentry later.                                |

## Feature Dependencies

```
Docker Compose → PostgreSQL container → Database health in /api/health
Docker Compose → Aspire Dashboard container → OpenTelemetry export target
Drizzle ORM → PostgreSQL → Docker Compose (dev) or connection string (prod)
OpenTelemetry SDK → Aspire Dashboard (local) or any OTLP collector (prod)
Zod env validation → .env.example (documents what vars exist)
Husky → lint-staged → ESLint + Prettier (runs on commit)
Playwright tests → Running dev server or preview build
Vitest → TypeScript config with $lib path aliases
Security headers → hooks.server.ts (same file as CSRF, auth hooks)
Knip → Correct entry point config for SvelteKit file-based routing
CLAUDE.md → Accurate project structure (must be maintained as template evolves)
```

## Feature Grouping by Implementation Phase

These groups reflect natural dependency chains:

**Group 1: Foundation (no dependencies)**

- SvelteKit + TypeScript strict
- Tailwind CSS + DaisyUI
- ESLint + Prettier
- Folder structure conventions
- `.env.example`

**Group 2: Code Quality (depends on Group 1)**

- Husky + lint-staged
- Knip dead code detection
- Vitest unit test setup

**Group 3: Database Layer (depends on Group 1)**

- Docker Compose with PostgreSQL
- Drizzle ORM + initial migration
- Zod env validation (DATABASE_URL etc.)

**Group 4: Server Features (depends on Groups 1-3)**

- Health check endpoint (`/api/health` with DB check)
- Security headers in hooks.server.ts
- CSRF documentation
- API/integration test setup

**Group 5: Observability (depends on Groups 3-4)**

- OpenTelemetry SDK integration
- Aspire Dashboard in Docker Compose
- Trace/metric export configuration

**Group 6: E2E and Polish (depends on all above)**

- Playwright E2E tests (full stack running)
- Production Dockerfile (multi-stage)
- CLAUDE.md
- README with badges and documentation
- Base layout with responsive nav

## MVP Recommendation

**Prioritize (ship in first milestone):**

1. SvelteKit + TS strict + Tailwind + DaisyUI (foundation)
2. ESLint + Prettier + Husky + lint-staged (code quality gate)
3. Docker Compose + PostgreSQL + Drizzle ORM (database layer)
4. Vitest + Playwright configured with passing smoke tests (testing baseline)
5. Zod env validation + `.env.example` (developer safety net)

**Second milestone:** 6. Security headers + CSRF in hooks.server.ts 7. Health check endpoint 8. OpenTelemetry + Aspire Dashboard 9. Knip configuration 10. Production Dockerfile

**Final milestone:** 11. CLAUDE.md with accurate project documentation 12. Comprehensive README 13. API/integration test examples 14. Base responsive layout

**Defer indefinitely:** Auth, Storybook, CI/CD, i18n, email, payments, blog, marketing pages, commitlint, Sentry.

## Canonical SvelteKit Project Structure

Based on research, the expected folder structure for a full-stack SvelteKit starter:

```
/
├── src/
│   ├── routes/                    # File-based routing
│   │   ├── +layout.svelte         # Root layout (nav, global UI)
│   │   ├── +layout.server.ts      # Root layout server load
│   │   ├── +page.svelte           # Home page
│   │   ├── +error.svelte          # Error page
│   │   └── api/
│   │       └── health/
│   │           └── +server.ts     # Health check endpoint
│   ├── lib/
│   │   ├── components/            # Reusable Svelte components
│   │   ├── server/                # Server-only code ($lib/server)
│   │   │   ├── db/                # Drizzle schema, client, migrations
│   │   │   └── env.ts             # Zod env validation (server)
│   │   └── utils/                 # Shared utilities
│   ├── hooks.server.ts            # Security headers, CSRF, OTEL init
│   └── app.html                   # HTML template
├── tests/                         # Playwright E2E tests
├── drizzle/                       # Migration files
├── docker/                        # Dockerfiles (dev, prod)
├── docker-compose.yml             # Dev stack
├── drizzle.config.ts              # Drizzle Kit config
├── svelte.config.js               # SvelteKit config
├── vite.config.ts                 # Vite config (Vitest config)
├── tailwind.config.ts             # Tailwind config
├── tsconfig.json                  # TypeScript config (strict)
├── .env.example                   # Environment variable documentation
├── CLAUDE.md                      # AI agent instructions
└── README.md                      # Project documentation
```

## Sources

- [SvelteKit Official Project Structure](https://svelte.dev/docs/kit/project-structure)
- [SvelteKit Structuring Larger Apps Discussion](https://github.com/sveltejs/kit/discussions/7579)
- [create-t3-app Introduction](https://create.t3.gg/en/introduction)
- [Next.js Boilerplate by ixartz](https://github.com/ixartz/Next-js-Boilerplate) - Most comprehensive feature reference
- [CMSaasStarter](https://github.com/CriticalMoments/CMSaasStarter) - Top SvelteKit SaaS template
- [zerodevx/sveltekit-starter](https://github.com/zerodevx/sveltekit-starter) - Opinionated minimal starter
- [SvelteKit Content Security Policy](https://dev.to/askrodney/sveltekit-content-security-policy-csp-for-xss-protection-589k)
- [SvelteKit CSRF Protection](https://dev.to/maxiviper117/implementing-csrf-protection-in-sveltekit-3afb)
- [Nosecone Security Headers for SvelteKit](https://blog.arcjet.com/nosecone-a-library-for-setting-security-headers-in-next-js-sveltekit-node-js-bun-and-deno/)
- [Knip Dead Code Detector](https://knip.dev)
- [Dockerizing SvelteKit](https://khromov.se/dockerizing-your-sveltekit-applications-a-practical-guide/)
- [SvelteKit Testing with Vitest Browser Mode](https://scottspence.com/posts/testing-with-vitest-browser-svelte-guide)
- [OpenTelemetry Node.js Getting Started](https://opentelemetry.io/docs/languages/js/getting-started/nodejs/)
- [Zod Environment Variable Validation Pattern](https://creatures.dev/blog/env-type-safety-and-validation/)
- [Git Hooks with Husky and lint-staged 2025 Guide](https://dev.to/_d7eb1c1703182e3ce1782/git-hooks-with-husky-and-lint-staged-the-complete-setup-guide-for-2025-53ji)
- [AdminLTE SvelteKit Templates List 2026](https://adminlte.io/blog/sveltekit-templates-starters/)
