# Domain Pitfalls

**Domain:** SvelteKit full-stack battery-included starter template
**Researched:** 2026-04-05

---

## Critical Pitfalls

Mistakes that cause rewrites, security vulnerabilities, or major issues.

---

### Pitfall 1: OTEL SDK Initialization Too Late

**What goes wrong:** OpenTelemetry SDK must initialize before any SvelteKit application code is imported. If initialized in `hooks.server.ts` or at module load time, the OTEL API will have already provided no-op implementations to all instrumented libraries. Result: zero traces, zero metrics, silent failure with no error messages.

**Why it happens:** Developers naturally reach for `hooks.server.ts` as the "earliest server code" entry point. But ESM module imports are evaluated before hooks run. The SDK must be loaded before the entire SvelteKit server module graph.

**Consequences:** Observability appears configured but produces nothing. Debugging this is painful because there are no errors -- just missing data.

**Prevention:**

- Use `src/instrumentation.server.ts` with the experimental flags enabled in `svelte.config.js`:
  - `kit.experimental.tracing.server: true`
  - `kit.experimental.instrumentation.server: true`
- This file is guaranteed to run before application code imports.
- Requires `import-in-the-middle` package as a dependency.
- Test immediately after setup: send a request and verify a trace appears in the Aspire dashboard before writing any other code.

**Detection:** No traces appearing in the OTEL collector despite seemingly correct configuration. No error messages.

**Phase:** Must be addressed in the OTEL/observability setup phase. This is a day-one architectural decision that cannot be retrofitted easily.

**Confidence:** HIGH (official SvelteKit docs confirm `instrumentation.server.ts` behavior)

---

### Pitfall 2: CSP Configuration Fighting SvelteKit's Auto-Injection

**What goes wrong:** SvelteKit automatically augments CSP directives with nonces or hashes for inline styles and scripts it generates. When you explicitly set `style-src` with `unsafe-inline`, SvelteKit may inject a hash/nonce alongside it. Browsers that see a hash/nonce in a directive will silently ignore `unsafe-inline` in that same directive. Result: styles break with no obvious cause.

**Why it happens:** The CSP spec states that `unsafe-inline` is ignored when a nonce or hash is present. SvelteKit's automatic injection is designed to be helpful but conflicts with explicit `unsafe-inline` directives. This is an open issue (sveltejs/kit#11747, #9368, #15166).

**Consequences:** Broken styles in production. Difficult to debug because CSP violations appear in browser console but the cause (auto-injected nonce overriding unsafe-inline) is non-obvious.

**Prevention:**

- Accept that `style-src` in SvelteKit currently requires `unsafe-inline` and avoid also using nonce mode for styles.
- For `script-src`, use SvelteKit's nonce mode (`mode: 'nonce'` in CSP config) and do NOT combine it with `unsafe-inline` for script-src.
- Test CSP in the browser console explicitly -- look for CSP violation reports.
- Set CSP in `hooks.server.ts` using the `handle` hook with `setHeaders`, not via `svelte.config.js` CSP config, if you need full control.
- Document the known limitation for starter users.

**Detection:** Broken styles after deploying. CSP violation warnings in browser developer console.

**Phase:** Security headers phase. Must be tested thoroughly before marking complete.

**Confidence:** HIGH (multiple confirmed GitHub issues in sveltejs/kit)

---

### Pitfall 3: Server Secret Leakage Through Import Chains

**What goes wrong:** A module in `$lib/` (shared) imports from a utility that transitively imports server-only code. Even if the client-side code only uses one export, the bundler may include the entire module (including secrets) in the client bundle.

**Why it happens:** JavaScript bundlers perform tree-shaking at the export level, not the import level. If a shared module re-exports from a server module, the entire chain can be pulled into the client bundle. SvelteKit's `$lib/server/` guard only catches direct imports, not transitive ones through shared modules.

**Consequences:** API keys, database credentials, or other secrets shipped to the browser. Silent -- no build error unless you use `.server.ts` suffix or `$lib/server/` path.

**Prevention:**

- Enforce a strict convention: ALL server-only code goes in `$lib/server/` or uses the `.server.ts` suffix.
- Never re-export from `$lib/server/` modules in shared `$lib/` modules.
- Use `$env/static/private` and `$env/dynamic/private` for secrets (SvelteKit blocks these from client imports).
- Add a lint rule or code review checklist item: "Does any `$lib/` module import from `$lib/server/`?"
- Document this boundary clearly in CLAUDE.md for AI coding agents.

**Detection:** Inspect the client bundle output. Search for known secret values in built JavaScript.

**Phase:** Project structure phase (first phase). This is a foundational directory convention.

**Confidence:** HIGH (official SvelteKit docs explicitly warn about this)

---

### Pitfall 4: Shared SSR State Leaking Between Users

**What goes wrong:** Module-level state (using `$state` runes or plain variables at module scope in `.svelte.ts` files) persists across requests on the server. One user's data leaks to another user's response.

**Why it happens:** In Svelte 5, `$state` at module scope creates a singleton. During SSR, the Node.js process serves multiple requests, and module-scope state is shared across all of them. This is a fundamental SSR concern that Svelte 5 runes make easier to accidentally trigger because `$state` feels like "just a variable."

**Consequences:** User data leakage. Security vulnerability. Intermittent and hard to reproduce.

**Prevention:**

- Never use `$state` or mutable variables at module scope for per-request data.
- Use SvelteKit's `load` functions to return per-request data.
- Use `$page.data` for page-level state.
- For shared client-only state, guard with `browser` check from `$app/environment`.
- Document this as a hard rule in CLAUDE.md.

**Detection:** Test with multiple concurrent users/requests. Look for module-level `$state` declarations in `.svelte.ts` files that hold user-specific data.

**Phase:** Project structure phase. Must be established as a convention from the start.

**Confidence:** HIGH (well-documented SvelteKit/SSR issue)

---

### Pitfall 5: Drizzle Connection Pool Exhaustion

**What goes wrong:** Each SvelteKit server instance creates a connection pool. If the pool size is set to the PostgreSQL default (100 max connections) and the app scales to multiple instances, the total connections exceed PostgreSQL's limit. Requests hang or fail with "remaining connection slots are reserved."

**Why it happens:** The default `max` pool size in `node-postgres` is 10, but developers sometimes increase it without considering multi-instance scenarios. In Docker Compose dev, this is less visible because there's typically one server instance, but the pattern propagates to production.

**Consequences:** Database connection failures under load. Difficult to diagnose because the error appears as timeout/hang, not a clear error.

**Prevention:**

- Set connection pool `max` conservatively (5-10 for dev, calculated for production based on instance count).
- Use a singleton pattern for the database client (initialize once, export everywhere).
- Set `idleTimeoutMillis` (30000) and `connectionTimeoutMillis` (2000) to fail fast on pool issues.
- Add database connectivity to the `/api/health` endpoint so pool exhaustion is detectable.
- Document pool sizing guidance in the starter.

**Detection:** Health check endpoint that tests database connectivity. Connection timeout errors in logs.

**Phase:** Database setup phase. Connection configuration is foundational.

**Confidence:** HIGH (well-documented PostgreSQL/connection pool issue, confirmed in Drizzle discussions)

---

## Moderate Pitfalls

---

### Pitfall 6: Vitest Module Resolution Fails for SvelteKit Aliases

**What goes wrong:** Tests fail with "Cannot find module '$lib/...'" or "$app/environment" resolution errors. Vitest doesn't automatically inherit SvelteKit's path aliases from nested tsconfig.json configurations.

**Why it happens:** SvelteKit uses a generated `.svelte-kit/tsconfig.json` that extends the root config. Vitest's path resolution can fail when tsconfig paths are defined in extended configs rather than the root config. The `$app/*` and `$env/*` virtual modules also need special handling.

**Prevention:**

- Use `@sveltejs/kit/vite` plugin in `vitest.config.ts` (or merge with `vite.config.ts`).
- For `$app/environment` and similar SvelteKit modules, add `deps: { inline: ['@sveltejs/kit'] }` or use `vi.mock()` for the specific modules.
- For `$env/*` modules, create manual mocks in a `__mocks__` directory.
- Test the test setup itself early: write one test that imports from `$lib/` before writing application tests.

**Detection:** First test that imports a `$lib/` module fails. Module resolution errors during `vitest run`.

**Phase:** Testing setup phase. Must be validated before writing any tests.

**Confidence:** HIGH (multiple confirmed GitHub issues: vitest-dev/vitest#7501, sveltejs/kit#8996)

---

### Pitfall 7: Docker Multi-Stage Build Copies Too Much

**What goes wrong:** The final Docker image includes source code, `node_modules` with dev dependencies, or build artifacts that bloat the image from ~100MB to 1GB+. Or worse: the build stage runs `pnpm install --frozen-lockfile` but never runs `pnpm run build`, producing a container with source but no built app.

**Why it happens:** SvelteKit's build output lands in `build/` (with the Node adapter), but developers copy the entire project directory. Additionally, SvelteKit itself is a dev dependency needed for building but not for running.

**Prevention:**

- Three-stage Dockerfile: (1) install all deps, (2) build, (3) copy only `build/`, `package.json`, and production `node_modules`.
- Run `pnpm prune --production` (or equivalent) after build to strip dev deps before copying to final stage.
- Use `node build/index.js` as the CMD (not `pnpm run preview` or `pnpm start` with vite).
- Use `.dockerignore` to exclude `node_modules`, `.svelte-kit`, `tests/`, etc. from context.
- Pin the Node base image to a specific LTS version, not `latest`.
- Run as a non-root user in the final stage.

**Detection:** `docker images` shows image size > 500MB. `docker exec` into container and find `src/` directory or `@sveltejs/kit` in `node_modules`.

**Phase:** Docker setup phase. Get this right once; it rarely needs changing.

**Confidence:** HIGH (well-documented Docker best practice, SvelteKit-specific guidance available)

---

### Pitfall 8: Drizzle Migration History Corruption

**What goes wrong:** Manually editing generated migration files or the `_journal.json` causes `drizzle-kit migrate` to fail with cryptic errors. The migration history becomes inconsistent and cannot be repaired without manual database intervention.

**Why it happens:** Drizzle uses snapshot files and a journal to track migration state. Editing a migration after it has been applied (recorded in `__drizzle_migrations` table) creates a mismatch between what the database thinks happened and what the files say.

**Prevention:**

- Never manually edit migration files after generation. If a migration is wrong, generate a new corrective migration.
- Use `drizzle-kit generate` to create migrations, never hand-write them.
- Set a consistent `out` directory in `drizzle.config.ts` (default `./drizzle/` is fine, but be explicit).
- In Docker, run migrations as a startup step (in the entrypoint script), not as a build step.
- Commit migration files to git so all environments use the same history.

**Detection:** `drizzle-kit migrate` fails with journal/snapshot errors. New team members cannot run migrations on fresh databases.

**Phase:** Database setup phase.

**Confidence:** HIGH (confirmed in Drizzle ORM issues and docs)

---

### Pitfall 9: hooks.server.ts Handler Ordering Breaks Security

**What goes wrong:** When using `sequence()` to compose multiple handle hooks, the order determines which hooks see which requests. If the CSRF/security hook runs after an authentication hook that modifies the response, security checks may be bypassed. Or if error handling wraps security hooks incorrectly, security errors get swallowed.

**Why it happens:** `sequence()` runs hooks in order, piping the response through each. Developers add hooks incrementally without considering the full chain.

**Prevention:**

- Define a clear, documented hook order: (1) security headers, (2) CSRF protection, (3) observability/tracing, (4) application logic.
- Test hook ordering with explicit integration tests that verify headers are present.
- Keep each hook focused on one concern.
- Never catch and swallow errors in security hooks -- let them propagate or return explicit error responses.

**Detection:** Missing security headers on responses. CSRF protection not triggering on test requests.

**Phase:** Security headers phase. Must be validated with tests.

**Confidence:** MEDIUM (logical architectural concern, supported by SvelteKit documentation on `sequence()`)

---

### Pitfall 10: Playwright Tests Flaky Due to Hydration Race

**What goes wrong:** Playwright tests interact with elements before SvelteKit's client-side hydration completes. Tests pass locally (fast machine, quick hydration) but fail in CI (slower, hydration delayed). Symptoms: click handlers don't fire, form submissions fail intermittently.

**Why it happens:** SvelteKit server-renders HTML, then hydrates on the client. The HTML is interactive-looking but not yet wired to event handlers. Playwright sees the element and clicks it before hydration attaches the handler.

**Prevention:**

- Wait for hydration: use a custom fixture or helper that waits for a known hydration indicator (e.g., a `data-hydrated` attribute set by `onMount`).
- Use `page.waitForLoadState('networkidle')` as a baseline, but combine with application-level hydration signals.
- Start with `workers: 1` in CI Playwright config. Increase only after tests are stable.
- Use Playwright's Docker image for CI to eliminate browser version differences.
- Configure retries in CI (`retries: 2`) with trace capture on retry for debugging.

**Detection:** Tests pass locally but fail in CI. Failures involve click/interaction assertions, not navigation.

**Phase:** E2E testing phase. Must be addressed when writing the first Playwright test.

**Confidence:** HIGH (confirmed in SvelteKit + Playwright community, dedicated blog post on hydration assertion pattern)

---

### Pitfall 11: Environment Variable Confusion ($env modules vs process.env)

**What goes wrong:** Developers use `process.env.X` directly instead of SvelteKit's `$env/static/private` or `$env/dynamic/private`. This bypasses SvelteKit's type safety, build-time validation, and client/server boundary enforcement. Or they use `$env/static/private` for values that change per deployment (like DATABASE_URL), which bakes the value at build time.

**Why it happens:** SvelteKit has four `$env` modules (`static/private`, `static/public`, `dynamic/private`, `dynamic/public`) and the distinction between static (build-time) vs dynamic (runtime) is non-obvious.

**Prevention:**

- Use `$env/dynamic/private` for secrets that differ per environment (DATABASE_URL, API keys).
- Use `$env/static/public` for non-secret values that can be inlined at build time (PUBLIC_APP_NAME).
- Add Zod validation in `hooks.server.ts` or `instrumentation.server.ts` that runs at startup and validates all required env vars exist with correct format.
- Ban `process.env` usage via ESLint rule (`no-restricted-globals` or custom rule).
- Document the four modules and when to use each in CLAUDE.md.

**Detection:** `process.env` appears in server code. Build succeeds but runtime fails because env var was baked at build time with wrong value.

**Phase:** Project structure phase (env validation) and documentation phase.

**Confidence:** HIGH (SvelteKit docs, common community confusion)

---

## Minor Pitfalls

---

### Pitfall 12: Docker Compose Service Name DNS Resolution

**What goes wrong:** The SvelteKit app tries to connect to PostgreSQL at `localhost:5432` inside Docker, but the database is in a separate container. `localhost` inside a container refers to that container, not the host or other containers.

**Prevention:**

- Use the Docker Compose service name as the hostname (e.g., `postgres` not `localhost`).
- Set `DATABASE_URL` in docker-compose.yml environment to use the service name.
- Document that env vars differ between "running on host" and "running in Docker."

**Detection:** "Connection refused" errors when the app starts inside Docker.

**Phase:** Docker Compose setup phase.

**Confidence:** HIGH (fundamental Docker networking)

---

### Pitfall 13: Knip False Positives in SvelteKit Projects

**What goes wrong:** Knip (dead code detector) reports SvelteKit's file-based routing files (`+page.svelte`, `+layout.server.ts`, `hooks.server.ts`) as unused because they are not explicitly imported anywhere -- they are loaded by SvelteKit's routing convention.

**Prevention:**

- Configure Knip's entry patterns to include SvelteKit's file-based routing conventions: `src/routes/**/+*.ts`, `src/routes/**/+*.svelte`, `src/hooks.*.ts`, `src/params/*.ts`.
- Use `@anthropic-ai/knip-svelte` plugin if available, or manually configure entry points.
- Run Knip in CI and review false positives early to establish the baseline.

**Detection:** Knip reports `+page.svelte` files as unused on first run.

**Phase:** Code quality tooling phase.

**Confidence:** MEDIUM (expected based on Knip + convention-based frameworks, needs validation)

---

### Pitfall 14: DaisyUI Theme Class Conflicts with Tailwind Purge

**What goes wrong:** DaisyUI component classes get purged by Tailwind's content scanning if the content paths don't include DaisyUI's component files. Result: components render without styling in production but look fine in dev.

**Prevention:**

- Ensure `tailwind.config.js` content paths include all template files.
- DaisyUI 4+ as a Tailwind plugin should handle this automatically, but verify with a production build test.
- Test at least one DaisyUI component in the built production output.

**Detection:** Components unstyled in production build but styled in dev.

**Phase:** UI setup phase.

**Confidence:** MEDIUM (general Tailwind purge concern, DaisyUI 4+ may mitigate)

---

### Pitfall 15: Svelte 5 $effect Causing Infinite Loops

**What goes wrong:** Using `$effect` that writes to a `$state` value that the effect also reads creates an infinite reactivity loop. Svelte will detect and error at compile time in some cases, but not all.

**Prevention:**

- Use `$derived` instead of `$effect` + `$state` when computing values from other state.
- Follow the rule: `$effect` is for side effects (DOM manipulation, API calls, logging), not for deriving state.
- `$effect` should rarely write to `$state` -- if it does, ensure the written state is not read by the same effect.
- Document this pattern in CLAUDE.md for AI agents.

**Detection:** Console errors about infinite loops. Components re-rendering continuously.

**Phase:** Foundation phase (coding conventions and CLAUDE.md documentation).

**Confidence:** HIGH (documented in Svelte 5 migration guide)

---

## Template-as-Starter Specific Pitfalls

---

### Pitfall 16: Tight Coupling Makes Removal Painful

**What goes wrong:** A developer clones the starter and wants to remove OTEL (or Drizzle, or DaisyUI). But the feature is wired into hooks, layout files, and utility modules so deeply that removing it requires touching 15+ files and understanding the full architecture.

**Prevention:**

- Each optional feature should be isolated to its own directory/module.
- Use a thin integration layer: hooks should call feature-specific modules, not inline feature logic.
- OTEL: isolated to `src/lib/server/otel/` and `instrumentation.server.ts`. Removing = delete directory + remove one import.
- Drizzle: isolated to `src/lib/server/db/`. Removing = delete directory + remove env var.
- DaisyUI: just a Tailwind plugin. Removing = remove from `tailwind.config.js`.
- Document removal instructions for each major feature.

**Detection:** Try removing a feature and count how many files need to change. If > 3 files, coupling is too tight.

**Phase:** Architecture phase (all phases, actually -- this is a design principle to maintain throughout).

**Confidence:** HIGH (universal starter template concern, based on community feedback)

---

### Pitfall 17: Opinionated Defaults Without Escape Hatches

**What goes wrong:** The starter enforces strict ESLint rules, specific Prettier config, or test patterns that don't match every project. Developers spend their first hour fighting the starter's opinions instead of building.

**Prevention:**

- Make code quality configs (ESLint, Prettier) reasonable defaults, not strict maximums.
- Use separate config files (not inline in `package.json`) so they are easy to modify.
- Avoid custom ESLint rules that require understanding the starter's architecture.
- Husky + lint-staged should check only staged files, not the entire project.

**Detection:** Developer's first commit triggers lint errors on code they didn't write.

**Phase:** Code quality setup phase.

**Confidence:** HIGH (common starter template complaint)

---

### Pitfall 18: Missing "Getting Started" Flow After Clone

**What goes wrong:** Developer clones the repo, runs `docker compose up`, and gets errors because they haven't created a `.env` file, haven't run migrations, or some other setup step. The "under 5 minutes" promise breaks immediately.

**Prevention:**

- Provide a `.env.example` with all required variables and sane defaults for local dev.
- Docker Compose should work with zero manual configuration (use `.env.example` defaults or inline env vars in docker-compose.yml).
- Run migrations automatically on app startup (dev mode) or via an entrypoint script.
- The README should have a 3-step quickstart: clone, `docker compose up`, open browser.
- Validate env vars at startup with clear error messages naming the missing variable.

**Detection:** Clone the repo on a fresh machine and try to run it with zero documentation reading. Time it.

**Phase:** Final integration phase (but env validation and Docker Compose should be tested throughout).

**Confidence:** HIGH (core value proposition of the project)

---

## Phase-Specific Warnings

| Phase Topic          | Likely Pitfall                              | Mitigation                                             |
| -------------------- | ------------------------------------------- | ------------------------------------------------------ |
| Project structure    | Secret leakage through `$lib/` imports (#3) | Enforce `$lib/server/` convention from day one         |
| Project structure    | SSR state sharing (#4)                      | Document module-scope state rules                      |
| Database setup       | Pool exhaustion (#5)                        | Conservative pool defaults, health check               |
| Database setup       | Migration history corruption (#8)           | Never edit generated files                             |
| OTEL setup           | SDK init timing (#1)                        | Use `instrumentation.server.ts`, test immediately      |
| Security headers     | CSP auto-injection conflict (#2)            | Test in browser, accept known limitations              |
| Security headers     | Hook ordering (#9)                          | Define and document order, test with integration tests |
| Testing (Vitest)     | Module alias resolution (#6)                | Validate test setup before writing app tests           |
| Testing (Playwright) | Hydration race conditions (#10)             | Wait for hydration, conservative CI workers            |
| Docker               | Multi-stage build bloat (#7)                | Three-stage build, prune dev deps                      |
| Docker               | Service DNS (#12)                           | Use service names, document env differences            |
| Code quality         | Knip false positives (#13)                  | Configure SvelteKit entry patterns                     |
| Template design      | Tight coupling (#16)                        | Feature isolation as design principle                  |
| Template design      | Missing quickstart (#18)                    | Zero-config `docker compose up`                        |

---

## Sources

- [Svelte 5 migration guide](https://svelte.dev/docs/svelte/v5-migration-guide)
- [SvelteKit Server-only modules docs](https://svelte.dev/docs/kit/server-only-modules)
- [SvelteKit Observability docs](https://svelte.dev/docs/kit/observability)
- [SvelteKit Configuration (CSP)](https://svelte.dev/docs/kit/configuration)
- [SvelteKit CSP issue #11747](https://github.com/sveltejs/kit/issues/11747)
- [SvelteKit CSP + strict-dynamic issue #15166](https://github.com/sveltejs/kit/issues/15166)
- [Vitest + SvelteKit tsconfig path issue #7501](https://github.com/vitest-dev/vitest/issues/7501)
- [SvelteKit + Vitest library methods issue #8996](https://github.com/sveltejs/kit/issues/8996)
- [Drizzle ORM PostgreSQL best practices](https://gist.github.com/productdevbook/7c9ce3bbeb96b3fabc3c7c2aa2abc717)
- [Drizzle connection pool discussion #947](https://github.com/drizzle-team/drizzle-orm/discussions/947)
- [Drizzle migration docs](https://orm.drizzle.team/docs/kit-overview)
- [Dockerizing SvelteKit (Khromov)](https://khromov.se/dockerizing-your-sveltekit-applications-a-practical-guide/)
- [SvelteKit Dockerfile gist](https://gist.github.com/aradalvand/04b2cad14b00e5ffe8ec96a3afbb34fb)
- [Hydration assertion in SvelteKit + Playwright tests](https://www.sveltevietnam.dev/en/blog/20260322-hydration-assertion-in-tests-with-sveltekit-playwright)
- [CSRF protection in SvelteKit](https://dev.to/maxiviper117/implementing-csrf-protection-in-sveltekit-3afb)
- [SvelteKit environment variables (Joy of Code)](https://joyofcode.xyz/sveltekit-environment-variables)
- [SvelteKit env validation issue #6147](https://github.com/sveltejs/kit/issues/6147)
- [SvelteKit OTEL instrumentation gist](https://gist.github.com/liamwh/980b034106030f774a3563ec5fbd441e)
- [Netlify SvelteKit security vulnerabilities disclosure](https://www.netlify.com/changelog/2026-01-15-sveltekit-security-vulnerabilities/)
