# Technology Stack

**Project:** SvelteKit Battery-Included Starter
**Researched:** 2026-04-05
**Overall Confidence:** HIGH

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

**Tailwind v4 setup** -- no `tailwind.config.js`:

```css
/* src/app.css */
@import 'tailwindcss';
@plugin "daisyui";
```

No `@tailwind base/components/utilities` directives. Tailwind v4 auto-detects content files.

### Database

| Technology             | Version  | Purpose             | Why                                                                                                          |
| ---------------------- | -------- | ------------------- | ------------------------------------------------------------------------------------------------------------ |
| PostgreSQL             | 17       | Primary database    | Industry standard RDBMS; runs in Docker for dev                                                              |
| postgres (postgres.js) | ^3.4.8   | PostgreSQL driver   | Fastest Node.js PG driver; pure JS (no native deps); tagged template SQL prevents injection; ESM native      |
| drizzle-orm            | ^0.45.2  | ORM / query builder | Type-safe SQL with zero runtime overhead; schema-as-code; supports postgres.js natively                      |
| drizzle-kit            | ^0.31.10 | Migration tooling   | Generates SQL migrations from schema diffs; `drizzle-kit push` for dev, `drizzle-kit migrate` for production |

**Why postgres.js over node-postgres (pg):** postgres.js is faster in benchmarks, ESM-native (no CommonJS workarounds), has a cleaner tagged-template API, and zero native dependencies (no `pg-native` builds in Docker). Drizzle's postgres.js adapter is first-class.

**Why NOT use Drizzle v1 beta:** The v1.0.0-beta.x line has breaking changes and is not production-stable. Pin to 0.45.x stable.

### Observability

| Technology                                | Version  | Purpose                       | Why                                                                                   |
| ----------------------------------------- | -------- | ----------------------------- | ------------------------------------------------------------------------------------- |
| @opentelemetry/sdk-node                   | ^0.214.0 | OTEL Node.js SDK              | Official SDK 2.0 line; provides NodeSDK class for one-shot setup                      |
| @opentelemetry/auto-instrumentations-node | ^0.72.0  | Auto-instrumentation          | Automatically instruments HTTP, fetch, postgres, and 30+ libraries                    |
| @opentelemetry/exporter-trace-otlp-proto  | ^0.214.0 | OTLP exporter (protobuf/HTTP) | Sends traces to Aspire Dashboard via OTLP/HTTP; proto is more efficient than JSON     |
| import-in-the-middle                      | ^3.0.0   | ESM hook loader               | Required by SvelteKit's `instrumentation.server.ts` for ESM auto-instrumentation      |
| .NET Aspire Dashboard                     | latest   | OTEL collector + UI           | Single container; receives OTLP gRPC/HTTP; zero config; beautiful trace/metric viewer |

**SvelteKit OTEL integration** -- uses the built-in `instrumentation.server.ts` (shipped Aug 2025):

```typescript
// src/instrumentation.server.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { createAddHookMessageChannel } from 'import-in-the-middle';
import { register } from 'node:module';

const { registerOptions } = createAddHookMessageChannel();
register('import-in-the-middle/hook.mjs', import.meta.url, registerOptions);

const sdk = new NodeSDK({
  serviceName: 'sveltekit-app',
  traceExporter: new OTLPTraceExporter({
    url: 'http://localhost:4318/v1/traces',
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

**svelte.config.js** -- opt-in to experimental tracing:

```javascript
const config = {
  kit: {
    experimental: {
      tracing: { server: true },
      instrumentation: { server: true },
    },
  },
};
```

SvelteKit auto-emits spans for: `handle` hook chain, server `load` functions, form actions, and remote functions. Access via `event.tracing.root` and `event.tracing.current`.

### Security

| Technology              | Version    | Purpose            | Why                                                                                                                           |
| ----------------------- | ---------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| @nosecone/sveltekit     | ^1.3.1     | Security headers   | Type-safe defaults for CSP, HSTS, X-Frame-Options, X-Content-Type-Options; PCI DSS 4.0 compliant; integrates via `sequence()` |
| SvelteKit built-in CSRF | (built-in) | CSRF protection    | SvelteKit checks `Origin` header on all non-GET requests by default; no library needed                                        |
| Zod                     | ^4.3.6     | Env var validation | Validates environment variables at startup; fail-fast on missing/invalid config                                               |

**Why Nosecone over manual headers:** Nosecone provides type-safe, auditable security header defaults that follow PCI DSS 4.0. Manual `setHeaders()` is error-prone and hard to audit. Nosecone plugs into SvelteKit's `sequence()` pattern cleanly.

**Why NOT sveltekit-rate-limiter for CSRF:** SvelteKit's built-in origin checking is sufficient for CSRF. Rate limiting is a separate concern (and out of scope for a starter template). Don't conflate CSRF protection with rate limiting.

**Security headers setup:**

```typescript
// src/hooks.server.ts
import { createHook } from '@nosecone/sveltekit';
import { sequence } from '@sveltejs/kit/hooks';

const securityHeaders = createHook();

export const handle = sequence(securityHeaders);
```

**CSP configuration** in `svelte.config.js`:

```javascript
const config = {
  kit: {
    csp: {
      mode: 'auto', // nonce for SSR, hash for prerendered
      directives: {
        'script-src': ['self'],
        'style-src': ['self', 'unsafe-inline'], // needed for Tailwind
      },
    },
  },
};
```

**Zod env validation pattern:**

```typescript
// src/lib/server/env.ts
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional().default('http://localhost:4318'),
});

// Use $env/dynamic/private so values are read at runtime, not baked at build
import { env as processEnv } from '$env/dynamic/private';
export const env = envSchema.parse(processEnv);
```

**Why `$env/dynamic/private` over `$env/static/private`:** Static env vars are baked into the build artifact. For a Docker-deployed app, env vars change per environment (dev/staging/prod). Dynamic env is read at runtime from `process.env`, which is what you want for `DATABASE_URL` and OTEL endpoints.

### Testing

| Technology                | Version    | Purpose                  | Why                                                                     |
| ------------------------- | ---------- | ------------------------ | ----------------------------------------------------------------------- |
| Vitest                    | ^4.1.2     | Unit + component tests   | Vite-native; shares SvelteKit's Vite config; fast HMR-aware test runner |
| @testing-library/svelte   | ^5.3.1     | Component test utilities | DOM-based component rendering; `render()`, `fireEvent()`, queries       |
| jsdom                     | (peer dep) | DOM environment          | Lightweight browser simulation for component tests                      |
| @testing-library/jest-dom | (latest)   | DOM matchers             | `toBeInTheDocument()`, `toHaveTextContent()`, etc.                      |
| @playwright/test          | ^1.59.1    | E2E browser tests        | Official Playwright; cross-browser; SvelteKit `webServer` integration   |

**Vitest configuration:**

```typescript
// vitest.config.ts
import { sveltekit } from '@sveltejs/kit/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [sveltekit(), svelteTesting()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{js,ts}'],
    setupFiles: ['./vitest-setup.ts'],
  },
});
```

```typescript
// vitest-setup.ts
import '@testing-library/jest-dom/vitest';
```

**Playwright configuration:**

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.test.ts',
  webServer: {
    command: 'pnpm run build && pnpm run preview',
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
});
```

**API/integration testing approach:** Use Vitest with SvelteKit's test helpers -- import the server route handler and call it directly with a mock `RequestEvent`. No separate framework needed. For routes that need the full middleware stack, use Playwright against the preview server.

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

**ESLint flat config:**

```javascript
// eslint.config.js
import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import svelteConfig from './svelte.config.js';

export default ts.config(
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs.recommended,
  {
    files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
    languageOptions: {
      parserOptions: {
        svelteConfig,
      },
    },
  },
  {
    ignores: ['.svelte-kit/', 'build/', 'node_modules/'],
  },
);
```

**Prettier config:**

```json
{
  "plugins": ["prettier-plugin-svelte", "prettier-plugin-tailwindcss"],
  "tailwindStylesheet": "./src/app.css",
  "overrides": [
    {
      "files": "*.svelte",
      "options": { "parser": "svelte" }
    }
  ]
}
```

**lint-staged config** (in `package.json`):

```json
{
  "lint-staged": {
    "*.{js,ts,svelte}": ["eslint --fix", "prettier --write"],
    "*.{json,css,md,html}": ["prettier --write"]
  }
}
```

**Knip config:**

```json
{
  "$schema": "https://knip.dev/schema.json",
  "entry": [
    "src/routes/**/+*.{ts,js,svelte}",
    "src/hooks.server.ts",
    "src/hooks.client.ts",
    "src/instrumentation.server.ts"
  ],
  "project": ["src/**/*.{ts,js,svelte}"],
  "ignore": [".svelte-kit/**"]
}
```

The Svelte plugin auto-activates when `svelte` is in dependencies, but SvelteKit's route-based entry files (`+page.svelte`, `+server.ts`, etc.) need explicit entry patterns.

## Docker Compose Dev Stack

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:17-alpine
    container_name: starter-postgres
    restart: unless-stopped
    ports:
      - '5432:5432'
    environment:
      POSTGRES_DB: starter
      POSTGRES_USER: starter
      POSTGRES_PASSWORD: starter
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U starter -d starter']
      interval: 5s
      timeout: 3s
      retries: 5

  aspire-dashboard:
    image: mcr.microsoft.com/dotnet/aspire-dashboard:latest
    container_name: starter-aspire
    restart: unless-stopped
    ports:
      - '18888:18888' # Dashboard UI
      - '4317:18889' # OTLP gRPC receiver
      - '4318:18890' # OTLP HTTP receiver
    environment:
      ASPIRE_DASHBOARD_UNSECURED_ALLOW_ANONYMOUS: 'true'

volumes:
  postgres_data:
```

**Port mapping rationale:**

- `18888:18888` -- Dashboard UI at http://localhost:18888
- `4317:18889` -- Standard OTLP gRPC port mapped to Aspire's internal gRPC port
- `4318:18890` -- Standard OTLP HTTP port mapped to Aspire's internal HTTP port

Apps export to `localhost:4317` (gRPC) or `localhost:4318` (HTTP) using standard OTEL env vars, and Aspire receives on its internal ports.

**Disabling auth:** `ASPIRE_DASHBOARD_UNSECURED_ALLOW_ANONYMOUS=true` removes the login token requirement. Appropriate for local dev only.

## Environment Variables (.env)

```bash
# Database
DATABASE_URL=postgres://starter:starter@localhost:5432/starter

# OpenTelemetry
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_SERVICE_NAME=sveltekit-starter
```

## Alternatives Considered

| Category         | Recommended         | Alternative            | Why Not                                                                                                                              |
| ---------------- | ------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| PG driver        | postgres.js         | node-postgres (pg)     | pg requires CommonJS workarounds in ESM; slower in benchmarks; native binding complexity in Docker                                   |
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

```bash
# Create SvelteKit project (if starting fresh)
npx sv create sveltekit-starter --template minimal --types ts

# Core framework
pnpm add @sveltejs/adapter-node

# UI
pnpm add tailwindcss@^4.2.2 daisyui@^5.5.19

# Database
pnpm add drizzle-orm postgres
pnpm add -D drizzle-kit

# Observability
pnpm add @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-trace-otlp-proto import-in-the-middle

# Security
pnpm add @nosecone/sveltekit zod

# Testing
pnpm add -D vitest @testing-library/svelte @testing-library/jest-dom jsdom @playwright/test

# Code quality
pnpm add -D eslint eslint-plugin-svelte typescript-eslint prettier prettier-plugin-svelte prettier-plugin-tailwindcss husky lint-staged knip
```

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
