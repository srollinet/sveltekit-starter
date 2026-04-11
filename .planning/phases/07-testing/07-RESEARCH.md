# Phase 7: Testing - Research

**Researched:** 2026-04-11
**Domain:** Vitest workspaces, @testing-library/svelte, testcontainers, Playwright E2E
**Confidence:** HIGH

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Migrate `vite.config.ts` from single global `environment: 'node'` to a Vitest `test.projects` configuration with two named projects: `unit` (node, `src/**/*.test.ts`) and `component` (jsdom, `src/**/*.svelte.test.ts`)
- **D-02:** Remove the `exclude: ['src/**/*.svelte.test.ts']` line — workspace routing handles it
- **D-03:** Use `jsdom` (not happy-dom) for the component project environment
- **D-04:** Create a small dedicated demo component (`src/lib/components/StackBadge.svelte`) as the component test target
- **D-05:** Component test file: `src/lib/components/StackBadge.svelte.test.ts`
- **D-06:** Component test uses `render()` from `@testing-library/svelte` and `toBeInTheDocument()` from `@testing-library/jest-dom`
- **D-07:** Use `@testcontainers/postgresql` to spin up a throwaway PostgreSQL container for the health check integration test
- **D-08:** Integration test file: `src/routes/api/health/health.test.ts` (runs in `unit` node project)
- **D-09:** Test flow: start PostgreSQL testcontainer → set `DATABASE_URL` → import and call the health endpoint handler directly (not via HTTP) → assert `{ status: 'ok', db: 'ok' }` response → stop container in teardown
- **D-10:** `@testcontainers/postgresql` is a devDependency; Docker daemon must be running
- **D-11:** Add a new `src/routes/smoke.e2e.ts` (or `tests/smoke.e2e.ts`) as the dedicated smoke test
- **D-12:** Smoke test coverage: load home page (`/`), assert app renders (visible heading or content), verify at least one nav link is visible and clickable
- **D-13:** The existing `page.svelte.e2e.ts` demo test stays unchanged

### Claude's Discretion

- Exact name and content of the demo StackBadge component — keep it minimal
- Whether to put `smoke.e2e.ts` under `src/` or a top-level `tests/` directory
- Exact assertions in the smoke test beyond "home page renders + nav visible"
- Whether `@testing-library/jest-dom` setup file is needed in `vite.config.ts` (`setupFiles`) or if inline imports suffice

### Deferred Ideas (OUT OF SCOPE)

- Testing individual hook handles in isolation (noseconeHandle, otelHandle, loggingHandle)
- Coverage reporting (`vitest --coverage`)
- CI test running (GitHub Actions) — out of scope as v2 requirement CI-01
- `vitest-environment-postgres` as a lighter alternative to testcontainers
  </user_constraints>

---

<phase_requirements>

## Phase Requirements

| ID      | Description                                                                                     | Research Support                                                                                |
| ------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| TEST-01 | Vitest configured in `vite.config.ts` with `$lib` path aliases and SvelteKit module resolution  | D-01/D-02: workspaces config via `test.projects`; `sveltekit()` plugin handles path aliases     |
| TEST-02 | `@testing-library/svelte` installed; at least one component unit test demonstrating the pattern | D-04/D-05/D-06: StackBadge component + test; `@testing-library/svelte` v5.3.1 already installed |
| TEST-03 | At least one server-side unit test                                                              | Already satisfied: `src/lib/server/env/index.test.ts` exists and passes                         |
| TEST-04 | API/integration tests for `GET /api/health`                                                     | D-07/D-08/D-09: testcontainers approach with vi.mock on `$lib/server/db`                        |
| TEST-05 | Playwright configured against dev server; smoke E2E test                                        | D-11/D-12: smoke test covering home page + nav; Playwright already configured                   |
| TEST-06 | All tests pass on a clean checkout with `docker compose up` running                             | testcontainers is self-contained; E2E uses preview server on 4173; unit tests run in node       |

</phase_requirements>

---

## Summary

Phase 7 is a test-infrastructure completion phase. The project already has Vitest configured (single-environment node), one passing server unit test, and one passing E2E test. This phase adds dual-environment Vitest workspaces (node + jsdom), a demo Svelte component with a component test, a health endpoint integration test using testcontainers, and a Playwright smoke test for the home page.

The most significant technical challenge is the integration test for the health endpoint. The health handler imports `$lib/server/db` which creates a `pg.Pool` at module load time using `env.DATABASE_URL` from a SvelteKit virtual module (`$env/dynamic/private`). Direct import of the handler in Vitest requires mocking `$lib/server/db` so the test can inject a testcontainer-backed Pool without triggering the SvelteKit env validation chain.

The Vitest workspaces migration is straightforward using the `test.projects` inline array (replacing the deprecated `workspace.ts` file approach). The `jsdom` environment must be installed as a separate devDependency — it is a peer dependency of Vitest, not bundled. The `@testing-library/svelte` vite plugin (`svelteTesting()`) must be added to the component project to enable browser condition resolution and auto-cleanup.

**Primary recommendation:** Use `test.projects` inline in `vite.config.ts` with `extends: true` so both projects inherit the `sveltekit()` and `tailwindcss()` plugins. Mock `$lib/server/db` in the health integration test using `vi.mock` with a factory that returns a fresh Pool connected to the testcontainer.

---

## Standard Stack

### Core (already installed — no new installs except two packages)

| Library                   | Version                     | Purpose                | Why Standard                                                                        |
| ------------------------- | --------------------------- | ---------------------- | ----------------------------------------------------------------------------------- |
| vitest                    | ^4.1.2 (installed: 4.1.2)   | Test runner            | Already in repo; `test.projects` inline is the v4 workspace approach                |
| @testing-library/svelte   | ^5.3.1 (installed: 5.3.1)   | Component rendering    | Already in repo; render() + screen queries                                          |
| @testing-library/jest-dom | ^6.9.1 (installed: 6.9.1)   | DOM assertion matchers | Already in repo; `toBeInTheDocument()` etc.                                         |
| @playwright/test          | ^1.59.1 (installed: 1.59.1) | E2E browser tests      | Already in repo; browsers confirmed installed at `/home/node/.cache/ms-playwright/` |

### New Dependencies Required

| Library                    | Version           | Purpose                                   | Install                                                 |
| -------------------------- | ----------------- | ----------------------------------------- | ------------------------------------------------------- |
| jsdom                      | ^29.0.2 (latest)  | DOM environment for component tests       | `pnpm add -D jsdom` — peer dep of vitest, not bundled   |
| @testcontainers/postgresql | ^11.14.0 (latest) | Throwaway PostgreSQL for integration test | `pnpm add -D @testcontainers/postgresql testcontainers` |

**Version verification (run 2026-04-11):** [VERIFIED: npm registry]

- `jsdom` latest: 29.0.2
- `@testcontainers/postgresql` latest: 11.14.0
- `testcontainers` (core, required by `@testcontainers/postgresql`): 11.14.0

**Installation:**

```bash
pnpm add -D jsdom
pnpm add -D @testcontainers/postgresql testcontainers
```

### Already Installed (no action required)

- `@testing-library/svelte` — listed in devDependencies but currently in `knip.config.ts` `ignoreDependencies` (will be used by this phase, removing the need for the knip ignore)
- `@testing-library/jest-dom` — same

---

## Architecture Patterns

### Recommended Project Structure After Phase 7

```
src/
├── lib/
│   ├── components/
│   │   ├── StackBadge.svelte          # new: demo component for component test
│   │   └── StackBadge.svelte.test.ts  # new: component test (jsdom project)
│   └── server/
│       └── env/
│           └── index.test.ts          # existing: server unit test (node project)
├── routes/
│   └── api/
│       └── health/
│           ├── +server.ts             # existing: health handler
│           └── health.test.ts         # new: integration test (node project)
tests/                                 # new directory (Playwright convention)
└── smoke.e2e.ts                       # new: E2E smoke test
vite.config.ts                         # modified: single env → test.projects
```

**Note on smoke test location:** Place `smoke.e2e.ts` in a top-level `tests/` directory. The Playwright config uses `testMatch: '**/*.e2e.{ts,js}'` which matches both `src/` and project root subdirectories. The top-level `tests/` is idiomatic Playwright convention and keeps E2E tests separate from Vitest unit tests. The existing `src/routes/demo/playwright/page.svelte.e2e.ts` demonstrates the collocated-with-page pattern; `tests/` demonstrates the centralized pattern — having both is good pedagogy for the template. [ASSUMED]

### Pattern 1: Vitest Workspaces via `test.projects` (v4 inline approach)

**What:** Replace the single `environment: 'node'` config with two inline project configs in `test.projects`. The deprecated `vitest.workspace.ts` file approach is not used.

**When to use:** When different test files need different environments (node for server tests, jsdom for component tests).

**Key: `extends: true`** makes each project inherit root-level `plugins` (sveltekit, tailwindcss) so `$lib` aliases and SvelteKit virtual modules resolve correctly in all projects.

```typescript
// vite.config.ts — Source: https://vitest.dev/guide/workspace
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  test: {
    projects: [
      {
        extends: true, // inherits root plugins (sveltekit, tailwindcss)
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.test.ts'],
        },
      },
      {
        extends: true, // inherits root plugins (sveltekit, tailwindcss)
        plugins: [svelteTesting()],
        test: {
          name: 'component',
          environment: 'jsdom',
          include: ['src/**/*.svelte.test.ts'],
          setupFiles: ['./vitest-setup.ts'],
        },
      },
    ],
  },
});
```

**`vitest-setup.ts`** (new file at project root):

```typescript
// Source: https://testing-library.com/docs/svelte-testing-library/setup
import '@testing-library/jest-dom/vitest';
```

**Note on `setupFiles` vs inline import:** The `setupFiles` approach is strongly preferred over inline `import '@testing-library/jest-dom/vitest'` per test file — it ensures TypeScript types for `toBeInTheDocument()` etc. are available without per-file imports and is the pattern from official docs. [CITED: https://testing-library.com/docs/svelte-testing-library/setup]

### Pattern 2: Component Test Pattern

**What:** Render a Svelte component with props, query the DOM, assert content.

**Critical detail:** The `svelteTesting()` vite plugin must be added to the component project's `plugins` array (not the root plugins). It adds `browser` to `resolve.conditions` so Svelte's browser build is used instead of SSR build, and registers auto-cleanup after each test.

```typescript
// src/lib/components/StackBadge.svelte.test.ts
// Source: https://testing-library.com/docs/svelte-testing-library/api
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import StackBadge from './StackBadge.svelte';

describe('StackBadge', () => {
  it('renders the technology name', () => {
    render(StackBadge, { name: 'SvelteKit' });
    expect(screen.getByText('SvelteKit')).toBeInTheDocument();
  });

  it('renders the badge label', () => {
    render(StackBadge, { name: 'Drizzle', badge: 'Database' });
    expect(screen.getByText('Database')).toBeInTheDocument();
  });
});
```

### Pattern 3: Integration Test with testcontainers + vi.mock

**What:** Start a throwaway PostgreSQL container, mock the `$lib/server/db` module to use the container's Pool, then call the health handler directly.

**Critical architecture insight:** `src/lib/server/db/index.ts` creates a `pg.Pool` at module load time (`export const client = new Pool({ connectionString: env.DATABASE_URL })`). `env.DATABASE_URL` comes from `$env/dynamic/private` via the Zod-validated `$lib/server/env` module which calls `process.exit(1)` if the URL is missing. Direct import of the health handler would trigger this chain.

**Solution:** Use `vi.mock('$lib/server/db')` to completely replace the db module. The mock factory returns a `{ client, db }` object where `client` is a real `pg.Pool` pointed at the testcontainer. The mock factory can use a module-level mutable reference that gets set in `beforeAll`.

```typescript
// src/routes/api/health/health.test.ts
// Source: https://vitest.dev/api/vi#vi-mock, https://node.testcontainers.org/modules/postgresql/
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';

// Module-level refs — set in beforeAll before any import of the handler
let container: StartedPostgreSqlContainer;
let testPool: Pool;

vi.mock('$lib/server/db', () => ({
  get client() {
    return testPool;
  },
  get db() {
    return null;
  }, // not used by the health handler
}));

// Dynamic import AFTER vi.mock is hoisted and after beforeAll sets testPool
let GET: (event: unknown) => Promise<Response>;

describe('GET /api/health', () => {
  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:17-alpine').start();
    testPool = new Pool({ connectionString: container.getConnectionUri() });
    // Dynamic import ensures the handler gets the mocked db module
    const handler = await import('../api/health/+server.js');
    GET = handler.GET;
  }, 60_000); // testcontainer startup can take ~30s on first pull

  afterAll(async () => {
    await testPool.end();
    await container.stop();
  });

  it('returns { status: ok, db: ok } when database is reachable', async () => {
    // Create a minimal RequestEvent stub — only what the handler uses
    const event = {} as Parameters<typeof GET>[0];
    const response = await GET(event);
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.db).toBe('ok');
    expect(typeof body.timestamp).toBe('string');
  });
});
```

**Important:** `vi.mock()` calls are hoisted by Vitest to the top of the module. The getter pattern (`get client() { return testPool; }`) defers resolution to call time rather than mock-setup time, which is why it works even though `testPool` is not yet assigned when the mock factory runs. [VERIFIED: vitest docs on hoisting]

**Alternative simpler approach:** If the getter pattern proves fragile in practice, the alternative is to mock `$lib/server/db` with `vi.fn()` and replace `client.query` using `vi.spyOn` after the container starts. Both patterns are valid; the getter is more self-contained.

### Pattern 4: Playwright Smoke Test

**What:** Load the home page, assert content renders, check nav link visibility.

**Home page content available to assert (from `+page.svelte`):**

- `h1` with text `"SvelteKit Battery-Included Starter"`
- Cards with DaisyUI badges
- Navbar with `"SvelteKit Starter"` brand link and `"Home"` nav item

**Layout nav structure (from `+layout.svelte`):**

- `<a href="/">SvelteKit Starter</a>` — brand link in navbar-start
- Desktop nav: `<a href="/">Home</a>` in `menu menu-horizontal`
- Mobile drawer: `<a href="/">Home</a>` in drawer-side
- Theme toggle button (aria-label="Toggle theme")

```typescript
// tests/smoke.e2e.ts
import { expect, test } from '@playwright/test';

test('home page renders and nav is visible', async ({ page }) => {
  await page.goto('/');

  // Main heading
  await expect(page.getByRole('heading', { name: 'SvelteKit Battery-Included Starter' })).toBeVisible();

  // Brand nav link
  await expect(page.getByRole('link', { name: 'SvelteKit Starter' })).toBeVisible();

  // Nav Home link (desktop nav, not drawer — desktop viewport)
  await expect(page.locator('.menu-horizontal').getByRole('link', { name: 'Home' })).toBeVisible();
});

test('theme toggle button is present', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Toggle theme' })).toBeVisible();
});
```

**Playwright config already correct:** `playwright.config.ts` uses `pnpm build && pnpm preview --mode test` — the smoke test runs against the built preview server on port 4173. No changes needed to `playwright.config.ts`.

### Anti-Patterns to Avoid

- **Using `defineWorkspace`:** Removed in Vitest 4.x. Use `test.projects` inline in `vite.config.ts` or `defineConfig` from `vitest/config`.
- **Using `@vitest-environment jsdom` docblock per-file:** Only viable for one-off files. `test.projects` is the correct structural approach.
- **Setting `process.env.DATABASE_URL` in `beforeAll` and then doing static import:** Module-level Pool creation means the module must be imported AFTER the env is set. Use dynamic `import()` inside `beforeAll`.
- **Importing `@testing-library/jest-dom` directly** (not the `/vitest` subpath): The `/vitest` subpath is required for Vitest compatibility. [CITED: https://testing-library.com/docs/svelte-testing-library/setup]
- **Adding `svelteTesting()` to root plugins:** The plugin reads `process.env.VITEST` and modifies resolve conditions; it should be scoped to the component project only.

---

## Don't Hand-Roll

| Problem                             | Don't Build            | Use Instead                             | Why                                                                        |
| ----------------------------------- | ---------------------- | --------------------------------------- | -------------------------------------------------------------------------- |
| Throwaway PostgreSQL for tests      | Custom Docker wrapper  | `@testcontainers/postgresql`            | Handles container lifecycle, port mapping, health checks, cleanup          |
| DOM environment for component tests | Manual DOM setup       | `jsdom` via Vitest `environment`        | Vitest has built-in jsdom adapter; just install and declare                |
| Component test render + cleanup     | Custom mount/unmount   | `@testing-library/svelte` `render()`    | Auto-cleanup via `svelteTesting()` plugin; screen queries; fire events     |
| DOM assertion matchers              | Custom `expect().to*`  | `@testing-library/jest-dom`             | 20+ well-tested matchers like `toBeInTheDocument()`, `toHaveTextContent()` |
| E2E browser orchestration           | Puppeteer custom setup | `@playwright/test` (already configured) | Cross-browser; retry logic; built-in webServer integration                 |

**Key insight:** The entire test infrastructure is commodity — every piece has a canonical library. The only non-trivial work is wiring them together correctly (workspaces config, mock pattern, testcontainer lifecycle).

---

## Common Pitfalls

### Pitfall 1: jsdom is not bundled with Vitest

**What goes wrong:** Setting `environment: 'jsdom'` in a Vitest project config throws `Error: Cannot find package 'jsdom'` at test runtime.
**Why it happens:** `jsdom` is a _peer dependency_ of Vitest, intentionally not bundled. Vitest 4.x requires explicit installation.
**How to avoid:** `pnpm add -D jsdom` before running component tests. Verify: `node -e "require('jsdom')"` should not error.
**Warning signs:** `Cannot find package 'jsdom'` in Vitest output.
[VERIFIED: npm view vitest peerDependencies — shows `jsdom: '*'` as peer]

### Pitfall 2: Module-level Pool creation blocks direct handler import

**What goes wrong:** Importing `src/routes/api/health/+server.ts` at the top of a test file fails because `$lib/server/db` creates a `new Pool(...)` using `env.DATABASE_URL`, and if `DATABASE_URL` is not set, `src/lib/server/env/index.ts` calls `process.exit(1)`.
**Why it happens:** SvelteKit's `$env/dynamic/private` in serve mode (Vitest) reads from the `.env` file loaded by Vite. If `.env` doesn't exist or `DATABASE_URL` is missing, env validation fails immediately on import.
**How to avoid:** Mock `$lib/server/db` with `vi.mock()` (hoisted) using a getter that defers Pool access to call time. Use dynamic `import()` in `beforeAll` after setting up the testcontainer pool.
**Warning signs:** `process.exit(1)` or `Invalid environment variables` error in Vitest output.
[VERIFIED: codebase inspection of `src/lib/server/env/index.ts` and `src/lib/server/db/index.ts`]

### Pitfall 3: `vi.mock` factory runs before `beforeAll`

**What goes wrong:** `vi.mock('$lib/server/db', () => ({ client: testPool }))` returns `undefined` for `client` because `testPool` is assigned in `beforeAll` which runs after the mock factory.
**Why it happens:** Vitest hoists `vi.mock()` calls to the top of the module, before any `beforeAll` callbacks.
**How to avoid:** Use a getter in the mock factory (`get client() { return testPool; }`) so the property is evaluated lazily at call time rather than mock-setup time.
**Warning signs:** `client.query is not a function` or `Cannot read properties of undefined (reading 'query')` during test execution.
[VERIFIED: Vitest docs on vi.mock hoisting behavior]

### Pitfall 4: testcontainer startup timeout

**What goes wrong:** `beforeAll` times out if the PostgreSQL container image needs to be pulled on first run.
**Why it happens:** Default Vitest `testTimeout` is 5 seconds; pulling `postgres:17-alpine` + container startup can take 20-40 seconds on first run.
**How to avoid:** Set `beforeAll(async () => { ... }, 60_000)` — the second argument is the timeout in ms for `beforeAll`. Also set `test.timeout: 60_000` in the `unit` project config for this test file specifically, or use `test.testTimeout` in the project config.
**Warning signs:** `Error: Timeout — beforeAll hook exceeded N ms`.
[CITED: https://node.testcontainers.org/modules/postgresql/]

### Pitfall 5: Playwright test runs without a built app

**What goes wrong:** `pnpm test:e2e` fails with connection refused errors or `pnpm build` fails due to environment variables not set during build.
**Why it happens:** `playwright.config.ts` runs `pnpm build && pnpm preview --mode test`. If `DATABASE_URL` is not set in the environment, `vite build` may fail during SSR prerendering (if any).
**How to avoid:** The app uses `$env/dynamic/private` (not static), so env vars are not needed at build time — only at runtime. Ensure `DATABASE_URL` is set in `.env` before running `pnpm test:e2e` against the compose stack. The `--mode test` flag can load a `.env.test` file if needed.
**Warning signs:** Build errors about missing env vars, or Playwright timeout waiting for the webServer.
[VERIFIED: SvelteKit docs — `$env/dynamic/private` is not baked at build time]

### Pitfall 6: `svelteTesting()` plugin on root config breaks SSR tests

**What goes wrong:** Adding `svelteTesting()` to the root plugins array causes the `unit` (node) project to also resolve Svelte browser builds, potentially causing issues with server-side test imports.
**Why it happens:** `svelteTesting()` adds `browser` to `resolve.conditions`, which can cause Svelte to resolve its browser entry point in node tests.
**How to avoid:** Add `svelteTesting()` only to the `component` project's `plugins` array (inline in `test.projects`), not to the root `plugins`.
[CITED: https://testing-library.com/docs/svelte-testing-library/setup]

### Pitfall 7: knip false positives after adding test files

**What goes wrong:** `pnpm knip` reports `@testing-library/svelte` and `@testing-library/jest-dom` as unused after this phase adds real tests.
**Why it happens:** These packages were previously in `ignoreDependencies` because no `*.svelte.test.ts` files existed. Once `StackBadge.svelte.test.ts` exists and imports them, knip should detect usage automatically.
**How to avoid:** Remove `@testing-library/svelte` and `@testing-library/jest-dom` from `knip.config.ts` `ignoreDependencies` in this phase. If `jsdom` is flagged, add it to `ignoreDependencies` (loaded via Vitest config, not imported in source).
[VERIFIED: knip.config.ts inspection — both are currently in ignoreDependencies]

---

## Code Examples

### Complete `vite.config.ts` After Migration

```typescript
// Source: https://vitest.dev/guide/workspace, https://testing-library.com/docs/svelte-testing-library/setup
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.test.ts'],
        },
      },
      {
        extends: true,
        plugins: [svelteTesting()],
        test: {
          name: 'component',
          environment: 'jsdom',
          include: ['src/**/*.svelte.test.ts'],
          setupFiles: ['./vitest-setup.ts'],
        },
      },
    ],
  },
});
```

### `vitest-setup.ts` (project root)

```typescript
// Source: https://testing-library.com/docs/svelte-testing-library/setup
import '@testing-library/jest-dom/vitest';
```

### StackBadge Component

```svelte
<!-- src/lib/components/StackBadge.svelte -->
<script lang="ts">
  interface Props {
    name: string;
    badge: string;
    badgeClass?: string;
  }
  let { name, badge, badgeClass = 'badge-primary' }: Props = $props();
</script>

<div class="badge-container inline-flex items-center gap-2">
  <span class="font-medium">{name}</span>
  <span class="badge {badgeClass} badge-sm">{badge}</span>
</div>
```

### Health Integration Test

```typescript
// src/routes/api/health/health.test.ts
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import type { RequestHandler } from '@sveltejs/kit';

let container: StartedPostgreSqlContainer;
let testPool: Pool;

vi.mock('$lib/server/db', () => ({
  get client() {
    return testPool;
  },
  get db() {
    return null;
  },
}));

let GET: RequestHandler;

describe('GET /api/health', () => {
  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:17-alpine').start();
    testPool = new Pool({ connectionString: container.getConnectionUri() });
    const mod = await import('./+server.js');
    GET = mod.GET;
  }, 60_000);

  afterAll(async () => {
    await testPool.end();
    await container.stop();
  });

  it('returns 200 with { status: ok, db: ok }', async () => {
    const response = await GET({} as Parameters<typeof GET>[0]);
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.db).toBe('ok');
    expect(typeof body.timestamp).toBe('string');
  });
});
```

---

## State of the Art

| Old Approach                                       | Current Approach                            | When Changed                                  | Impact                                                                     |
| -------------------------------------------------- | ------------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------- |
| `vitest.workspace.ts` file                         | `test.projects` inline in `vite.config.ts`  | Vitest 3.2 (deprecated), Vitest 4.x (removed) | No separate workspace file needed                                          |
| `defineWorkspace()`                                | `test.projects` array in `defineConfig`     | Vitest 4.x                                    | `defineWorkspace` is no longer exported                                    |
| `@vitest-environment` docblock per-file            | `test.projects` with named environments     | Always optional                               | Docblock still works for one-off files; projects for structural separation |
| `import '@testing-library/jest-dom'` (Jest compat) | `import '@testing-library/jest-dom/vitest'` | @testing-library/jest-dom v6                  | `/vitest` subpath for Vitest-specific type augmentation                    |

**Deprecated/outdated:**

- `defineWorkspace`: No longer exported from `vitest/config` in v4. Use `test.projects`.
- `exclude: ['src/**/*.svelte.test.ts']`: Remove this line — `test.projects` routing handles environment separation.

---

## Assumptions Log

| #   | Claim                                                                                                                               | Section                  | Risk if Wrong                                                                                              |
| --- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------- |
| A1  | Placing `smoke.e2e.ts` in top-level `tests/` directory is idiomatic for Playwright when collocated E2E already exists               | Architecture Patterns    | Low — Playwright's glob matches both; either location works                                                |
| A2  | The vi.mock getter pattern (`get client() { return testPool; }`) works in Vitest 4.x for deferred module mock resolution            | Integration Test Pattern | High — if wrong, health test won't be able to inject the testcontainer Pool; fallback: `vi.spyOn` approach |
| A3  | `extends: true` in `test.projects` inline config properly inherits root `plugins` including `sveltekit()` for path alias resolution | Vitest Workspaces Config | High — if wrong, `$lib` imports won't resolve in tests; fallback: explicit plugin declarations per project |

---

## Open Questions

1. **logger import in health handler**
   - What we know: `+server.ts` imports `logger` from `$lib/server/logger` in addition to `client` from `$lib/server/db`
   - What's unclear: Does `$lib/server/logger` also trigger the env validation chain or create side effects on import?
   - Recommendation: Check `src/lib/server/logger.ts` before implementing the integration test. If it also imports from `$lib/server/env`, the vi.mock for `$lib/server/db` alone may not be sufficient — may also need `vi.mock('$lib/server/logger')`.

2. **testcontainer test timeout configuration**
   - What we know: `beforeAll` timeout can be set per-suite; test body has separate timeout
   - What's unclear: Whether the vitest `test.testTimeout` in the unit project config should be increased globally or only per-suite
   - Recommendation: Use per-suite timeout on `beforeAll` (60s); keep global timeout at default to avoid masking slow tests elsewhere.

---

## Environment Availability

| Dependency                 | Required By                    | Available         | Version                                                     | Fallback                              |
| -------------------------- | ------------------------------ | ----------------- | ----------------------------------------------------------- | ------------------------------------- |
| Docker daemon              | `@testcontainers/postgresql`   | ✓                 | 29.3.1                                                      | None — D-10 states Docker is required |
| Playwright Chromium        | E2E tests                      | ✓                 | 1.59.1 (at `/home/node/.cache/ms-playwright/chromium-1217`) | —                                     |
| Node.js 22 LTS             | Runtime                        | ✓ (codespace)     | —                                                           | —                                     |
| jsdom                      | Vitest jsdom env               | ✗ (not installed) | 29.0.2 available                                            | None — must install                   |
| @testcontainers/postgresql | Integration test               | ✗ (not installed) | 11.14.0 available                                           | None — must install                   |
| PostgreSQL (compose)       | E2E / smoke test preview build | ✓                 | 17-alpine (running)                                         | —                                     |

**Missing dependencies with no fallback:**

- `jsdom` — required for component tests; `pnpm add -D jsdom`
- `@testcontainers/postgresql` — required for health integration test; `pnpm add -D @testcontainers/postgresql testcontainers`

**Missing dependencies with fallback:**

- None

---

## Validation Architecture

### Test Framework

| Property           | Value                                                           |
| ------------------ | --------------------------------------------------------------- |
| Framework          | Vitest 4.1.2 (unit + component) + Playwright 1.59.1 (E2E)       |
| Config file        | `vite.config.ts` (Vitest) + `playwright.config.ts` (Playwright) |
| Quick run command  | `pnpm test:unit`                                                |
| Full suite command | `pnpm test` (unit + E2E)                                        |

### Phase Requirements → Test Map

| Req ID  | Behavior                                                       | Test Type        | Automated Command           | File Exists?                                              |
| ------- | -------------------------------------------------------------- | ---------------- | --------------------------- | --------------------------------------------------------- |
| TEST-01 | Vitest configured with workspaces + $lib aliases               | infrastructure   | `pnpm test:unit` (all pass) | ✅ vite.config.ts (modified)                              |
| TEST-02 | Component test renders StackBadge with @testing-library/svelte | component        | `pnpm test:unit`            | ❌ Wave 0: `src/lib/components/StackBadge.svelte.test.ts` |
| TEST-03 | Server-side unit test passes                                   | unit             | `pnpm test:unit`            | ✅ `src/lib/server/env/index.test.ts`                     |
| TEST-04 | Health endpoint returns `{status: ok, db: ok}`                 | integration      | `pnpm test:unit`            | ❌ Wave 0: `src/routes/api/health/health.test.ts`         |
| TEST-05 | Smoke E2E: home page renders + nav visible                     | e2e              | `pnpm test:e2e`             | ❌ Wave 0: `tests/smoke.e2e.ts`                           |
| TEST-06 | All tests pass on clean checkout                               | integration gate | `pnpm test`                 | ✅ (verified when others pass)                            |

### Sampling Rate

- **Per task commit:** `pnpm test:unit`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green (`pnpm test`) before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `vitest-setup.ts` — jest-dom setup for component project; covers TEST-02
- [ ] `src/lib/components/StackBadge.svelte` — demo component; covers TEST-02
- [ ] `src/lib/components/StackBadge.svelte.test.ts` — component test; covers TEST-02
- [ ] `src/routes/api/health/health.test.ts` — integration test with testcontainers; covers TEST-04
- [ ] `tests/smoke.e2e.ts` — E2E smoke test; covers TEST-05
- [ ] `vite.config.ts` migration from single env to `test.projects`; covers TEST-01
- [ ] Package installs: `pnpm add -D jsdom @testcontainers/postgresql testcontainers`

---

## Security Domain

This phase is test infrastructure only. No production code paths are added. ASVS security controls are not applicable to test-only files.

| ASVS Category         | Applies | Note                       |
| --------------------- | ------- | -------------------------- |
| V2 Authentication     | No      | Test infrastructure phase  |
| V3 Session Management | No      | Test infrastructure phase  |
| V4 Access Control     | No      | Test infrastructure phase  |
| V5 Input Validation   | No      | No new user input surfaces |
| V6 Cryptography       | No      | No crypto operations       |

**Security note:** `@testcontainers/postgresql` spawns a real Docker container using the `postgres:17-alpine` image. Ensure the image is trusted (official Docker Hub image). The container is destroyed in `afterAll` — no persistent state. [ASSUMED]

---

## Project Constraints (from CLAUDE.md)

Directives that constrain this phase:

| Directive                                                              | Impact on Phase 7                                                            |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Tech stack locked: Vitest + @testing-library/svelte + @playwright/test | Already installed; no substitutions                                          |
| `jsdom` listed as peer dep                                             | Must install explicitly — not bundled                                        |
| Node.js 22 LTS required                                                | Tests run in Node 22; no Bun/Deno                                            |
| pnpm is package manager                                                | Use `pnpm add -D` for all installs                                           |
| TypeScript everywhere                                                  | All test files are `.ts` or `.svelte.test.ts`                                |
| No `.eslintrc.js` (ESLint 10 flat config only)                         | Lint runs on test files — ensure no lint errors                              |
| `$env/static/private` forbidden (use `$env/dynamic/private`)           | Already respected in codebase; confirms env baking is not available in tests |
| Zero external accounts                                                 | Testcontainers uses local Docker only — compliant                            |
| DaisyUI for components                                                 | StackBadge demo component uses DaisyUI badge classes                         |

---

## Sources

### Primary (HIGH confidence)

- [VERIFIED: npm registry run 2026-04-11] — `jsdom` 29.0.2, `@testcontainers/postgresql` 11.14.0, `testcontainers` 11.14.0
- [VERIFIED: codebase inspection] — `vite.config.ts`, `playwright.config.ts`, `src/lib/server/db/index.ts`, `src/lib/server/env/index.ts`, `knip.config.ts`, `package.json`
- [CITED: https://vitest.dev/guide/workspace] — `test.projects` inline config, `extends: true`, `defineProject`
- [CITED: https://testing-library.com/docs/svelte-testing-library/setup] — `svelteTesting()` vite plugin, `setupFiles`, `@testing-library/jest-dom/vitest`
- [CITED: https://node.testcontainers.org/modules/postgresql/] — `PostgreSqlContainer`, `getConnectionUri()`, `start()`/`stop()` lifecycle

### Secondary (MEDIUM confidence)

- [CITED: https://github.com/sveltejs/kit/issues/8180] — SvelteKit `$env/dynamic/private` in Vitest resolved; test files with `.test.ts` pattern are recognized as server-safe

### Tertiary (LOW confidence)

- [ASSUMED] — `tests/` directory as top-level location for smoke.e2e.ts
- [ASSUMED] — vi.mock getter pattern for deferred testPool injection; not verified by running the test

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all packages verified against npm registry
- Architecture (workspaces config): HIGH — verified against Vitest 4.x docs
- Integration test mock pattern: MEDIUM — pattern is well-established but the exact getter behavior in Vitest 4.1.2 is ASSUMED (not run)
- Playwright smoke test: HIGH — config and layout inspected directly
- testcontainers API: HIGH — official docs

**Research date:** 2026-04-11
**Valid until:** 2026-05-11 (stable ecosystem — Vitest/Playwright change slowly)
