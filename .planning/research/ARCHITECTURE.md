# Architecture Patterns

**Domain:** SvelteKit full-stack starter template (battery-included)
**Researched:** 2026-04-05

## Recommended Architecture

A layered monolith inside a single SvelteKit application, with clear server/client boundaries enforced by SvelteKit's `$lib/server` import restriction. All infrastructure (PostgreSQL, Aspire Dashboard) runs in Docker Compose for local development. The SvelteKit app itself runs on the host during development (via `vite dev`) and in a Docker container for production builds.

### High-Level Component Diagram

```
Browser (Client)
    |
    v
SvelteKit App (Node.js)
    |--- src/routes/        (pages + API routes)
    |--- src/hooks.server   (middleware: security, OTEL, logging)
    |--- src/lib/server/    (db client, OTEL, env validation)
    |--- src/lib/           (shared components, utils, types)
    |
    v                       v
PostgreSQL (Docker)    Aspire Dashboard (Docker)
                       :18888 UI
                       :4318  OTLP/HTTP ingest
```

### Component Boundaries

| Component                       | Responsibility                                                    | Communicates With                                 |
| ------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------- |
| `src/routes/`                   | Page rendering, API endpoints, form actions, load functions       | `$lib/server/db`, `$lib/components`, `$lib/utils` |
| `src/hooks.server.ts`           | Request middleware: security headers, OTEL spans, request logging | `$lib/server/otel`, `$lib/server/security`        |
| `src/instrumentation.server.ts` | OTEL SDK bootstrap (runs before all app code)                     | `@opentelemetry/sdk-node`, Aspire OTLP endpoint   |
| `src/lib/server/db/`            | Database client singleton, Drizzle schema, query helpers          | PostgreSQL via `postgres.js` driver               |
| `src/lib/server/env.ts`         | Zod-validated environment variables, fail-fast on missing         | `process.env`                                     |
| `src/lib/server/otel/`          | OTEL configuration, custom span helpers                           | Aspire Dashboard OTLP/HTTP                        |
| `src/lib/server/security/`      | Security header definitions, CSRF helpers                         | Used by hooks                                     |
| `src/lib/components/`           | Reusable Svelte 5 components (DaisyUI-based)                      | Svelte runtime                                    |
| `src/lib/utils/`                | Shared utilities (formatting, validation helpers)                 | Used by both server and client                    |
| `src/lib/types/`                | Shared TypeScript types and Zod schemas                           | Used everywhere                                   |
| Docker Compose                  | Orchestrates PostgreSQL + Aspire Dashboard for dev                | Network bridge between services                   |

### Data Flow

```
1. Request arrives at SvelteKit Node server
2. instrumentation.server.ts has already initialized OTEL SDK (runs once at startup)
3. hooks.server.ts handle() runs via sequence():
   a. handleOtel()  - creates/enriches request span
   b. handleSecurity() - sets security response headers
   c. handleLocals()  - populates event.locals (db, etc.)
4. Route matched:
   - Page route: +page.server.ts load() queries DB via Drizzle, returns data
   - API route: +server.ts handler processes request, queries DB
   - Form action: +page.server.ts actions handle mutations
5. Response flows back through hooks (headers applied)
6. OTEL spans exported to Aspire Dashboard via OTLP/HTTP
```

## Concrete Folder Structure

```
sveltekit-starter/
|-- src/
|   |-- app.html                          # HTML template
|   |-- app.css                           # Global styles (Tailwind directives)
|   |-- app.d.ts                          # App-level type declarations (App.Locals, App.Error)
|   |-- hooks.server.ts                   # Server hooks: security, OTEL, locals
|   |-- hooks.client.ts                   # Client hooks: error reporting
|   |-- instrumentation.server.ts         # OTEL SDK initialization (runs before app code)
|   |
|   |-- lib/
|   |   |-- index.ts                      # Barrel export for $lib
|   |   |
|   |   |-- server/                       # Server-only code ($lib/server)
|   |   |   |-- db/
|   |   |   |   |-- index.ts              # DB client singleton (drizzle + postgres.js)
|   |   |   |   |-- schema/
|   |   |   |   |   |-- index.ts          # Re-exports all schema modules
|   |   |   |   |   |-- example.ts        # Example table (demonstrates conventions)
|   |   |   |   |-- migrate.ts            # Programmatic migration runner
|   |   |   |
|   |   |   |-- env.ts                    # Zod env validation (fail-fast)
|   |   |   |-- otel/
|   |   |   |   |-- index.ts              # OTEL SDK config (NodeSDK, exporters, resource)
|   |   |   |   |-- spans.ts             # Custom span helpers
|   |   |   |
|   |   |   |-- security/
|   |   |       |-- headers.ts            # Security header definitions
|   |   |       |-- csrf.ts               # CSRF helper (if custom logic needed beyond built-in)
|   |   |
|   |   |-- components/                   # Shared Svelte components
|   |   |   |-- ui/                       # Generic UI components (DaisyUI wrappers)
|   |   |   |-- layout/                   # Layout components (nav, footer, sidebar)
|   |   |
|   |   |-- utils/                        # Shared utilities (client + server safe)
|   |   |   |-- index.ts
|   |   |
|   |   |-- types/                        # Shared TypeScript types
|   |       |-- index.ts
|   |
|   |-- routes/
|       |-- +layout.svelte                # Root layout (nav, theme, global providers)
|       |-- +layout.server.ts             # Root server layout (shared data loading)
|       |-- +page.svelte                  # Home page
|       |-- +error.svelte                 # Error boundary page
|       |
|       |-- api/
|       |   |-- health/
|       |       |-- +server.ts            # GET /api/health (app + db status)
|       |
|       |-- (app)/                        # Route group for authenticated/main app pages
|           |-- +layout.svelte
|           |-- dashboard/
|               |-- +page.svelte          # Example page (demonstrates patterns)
|               |-- +page.server.ts       # Example server load (demonstrates DB query)
|
|-- drizzle/                              # Generated migrations (by drizzle-kit)
|   |-- meta/
|   |-- 0000_initial.sql
|
|-- drizzle.config.ts                     # Drizzle Kit configuration
|-- static/
|   |-- favicon.png
|
|-- tests/                                # Playwright e2e tests
|   |-- example.test.ts
|
|-- src/lib/server/db/schema/             # (referenced above, schema is source of truth)
|
|-- docker/
|   |-- Dockerfile                        # Multi-stage production build
|   |-- .dockerignore
|
|-- docker-compose.yml                    # Dev stack: postgres + aspire
|-- svelte.config.js                      # SvelteKit config (adapter-node)
|-- vite.config.ts                        # Vite config (plugins, test config)
|-- tsconfig.json                         # TypeScript config
|-- playwright.config.ts                  # Playwright e2e config
|-- tailwind.config.ts                    # Tailwind + DaisyUI config
|-- .env.example                          # Template for required env vars
|-- CLAUDE.md                             # AI coding agent instructions
```

## Patterns to Follow

### Pattern 1: OTEL Initialization via instrumentation.server.ts

**What:** SvelteKit provides `src/instrumentation.server.ts` which runs before all application code loads. This is where the OpenTelemetry NodeSDK must be initialized.

**Why:** OTEL must instrument modules before they are imported. Late initialization means no automatic instrumentation.

**Requires experimental flags in svelte.config.js:**

```javascript
kit: {
  experimental: {
    tracing: { server: true },
    instrumentation: { server: true }
  }
}
```

**Example:**

```typescript
// src/instrumentation.server.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';

const otlpEndpoint =
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: 'sveltekit-starter',
    [ATTR_SERVICE_VERSION]: '0.0.1',
  }),
  traceExporter: new OTLPTraceExporter({
    url: `${otlpEndpoint}/v1/traces`,
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: `${otlpEndpoint}/v1/metrics`,
    }),
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

**Confidence:** HIGH -- SvelteKit official docs confirm `instrumentation.server.ts` runs before app code. Aspire Dashboard confirms OTLP/HTTP on port 4318.

### Pattern 2: Singleton DB Client with postgres.js

**What:** Create the Drizzle database client once in `$lib/server/db/index.ts` using `postgres.js` as the driver. The module-level singleton pattern ensures one connection pool per process.

**Why postgres.js over node-postgres (pg):**

- Official Svelte CLI (`npx sv add drizzle`) defaults to postgres.js for PostgreSQL
- Built-in connection pooling (no separate pool configuration needed)
- Automatic prepared statement caching
- Pure ESM, aligns with SvelteKit's module system
- Performance difference with pg is negligible for typical app workloads

**Example:**

```typescript
// src/lib/server/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';
import { env } from '$lib/server/env.js';

const client = postgres(env.DATABASE_URL);
export const db = drizzle(client, { schema });
```

**Confidence:** HIGH -- Official Svelte CLI scaffolding uses this exact pattern. postgres.js is the recommended PostgreSQL client for SvelteKit projects.

### Pattern 3: Zod Environment Validation (Fail-Fast)

**What:** Validate all required environment variables at module load time using Zod. Import this module early (it will throw if vars are missing).

**Example:**

```typescript
// src/lib/server/env.ts
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  OTEL_EXPORTER_OTLP_ENDPOINT: z
    .string()
    .url()
    .default('http://localhost:4318'),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
```

**Confidence:** HIGH -- Standard pattern, Zod is the de facto schema validation library in the TypeScript ecosystem.

### Pattern 4: Hooks Composition with sequence()

**What:** Chain multiple server hook handlers using SvelteKit's `sequence()` function from `@sveltejs/kit/hooks`. Each handler is a focused, testable middleware function.

**Example:**

```typescript
// src/hooks.server.ts
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';

const handleSecurity: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()',
  );
  // CSP set here or via svelte.config.js csp option
  return response;
};

const handleLocals: Handle = async ({ event, resolve }) => {
  // Populate event.locals with request-scoped data
  // (e.g., request ID for logging, user session, etc.)
  return resolve(event);
};

export const handle = sequence(handleSecurity, handleLocals);
```

**Note:** SvelteKit has built-in CSRF protection (origin checking). Keep it enabled (default). Only disable and implement custom CSRF if you have specific cross-origin requirements.

**Confidence:** HIGH -- Official SvelteKit API. sequence() is the documented way to compose hooks.

### Pattern 5: Drizzle Schema Organization by Domain

**What:** Organize schema files by domain in `src/lib/server/db/schema/`, with a barrel `index.ts` that re-exports everything. Drizzle Kit reads from the schema directory.

**Example:**

```typescript
// src/lib/server/db/schema/example.ts
import { pgTable, text, timestamp, integer } from 'drizzle-orm/pg-core';

export const examples = pgTable('examples', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull(),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});

// src/lib/server/db/schema/index.ts
export * from './example.js';
```

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/server/db/schema',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

**Migration workflow:**

- `drizzle-kit generate` -- generates SQL migration files from schema changes
- `drizzle-kit migrate` -- applies pending migrations to the database
- `drizzle-kit push` -- pushes schema directly (use only in development for rapid iteration)
- `drizzle-kit studio` -- visual schema browser

**Confidence:** HIGH -- Official Drizzle documentation. Identity columns over serial is the 2025 PostgreSQL best practice.

### Pattern 6: Health Check Endpoint

**What:** A `/api/health` GET endpoint that checks app liveness and database connectivity.

**Example:**

```typescript
// src/routes/api/health/+server.ts
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return json({ status: 'healthy', database: 'connected' });
  } catch (err) {
    return json(
      { status: 'unhealthy', database: 'disconnected' },
      { status: 503 },
    );
  }
}
```

**Confidence:** HIGH -- Standard pattern, used by Docker health checks.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Database Imports in Client Code

**What:** Importing database modules from `$lib/` instead of `$lib/server/`.
**Why bad:** SvelteKit will error, but only at build time. Leaks server-only code paths into client bundles if the guard is bypassed.
**Instead:** All database code goes in `$lib/server/db/`. SvelteKit's `$lib/server` import restriction prevents client-side imports at the framework level.

### Anti-Pattern 2: Late OTEL Initialization

**What:** Initializing OpenTelemetry in hooks.server.ts or a load function instead of instrumentation.server.ts.
**Why bad:** By the time hooks run, modules are already imported. Auto-instrumentation (HTTP, postgres, etc.) will not work because monkey-patching happens too late.
**Instead:** Always use `src/instrumentation.server.ts` with the experimental flags enabled.

### Anti-Pattern 3: Environment Variables Without Validation

**What:** Using `process.env.DATABASE_URL` directly throughout the codebase.
**Why bad:** Typos, missing vars, and wrong types only surface at runtime when the code path is hit. In production, this means mysterious failures.
**Instead:** Single `$lib/server/env.ts` with Zod validation. Import `env.DATABASE_URL` everywhere. App crashes immediately on startup if vars are missing.

### Anti-Pattern 4: Monolithic hooks.server.ts

**What:** Putting all middleware logic in a single giant handle function.
**Why bad:** Hard to test, hard to read, hard to disable individual concerns.
**Instead:** Separate handle functions composed with `sequence()`. Each function is independently testable.

### Anti-Pattern 5: Using drizzle-kit push in Production

**What:** Running `drizzle-kit push` to apply schema changes in production.
**Why bad:** Push is destructive and not idempotent. It can drop columns/tables without warning.
**Instead:** Use `drizzle-kit generate` to create migration SQL files, review them, commit them, and run `drizzle-kit migrate` in production.

## Testing Architecture

### Vitest Configuration

Vitest integrates directly with SvelteKit via the Vite config. Use a multi-project setup to separate unit/integration tests from component tests:

```typescript
// vite.config.ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}'],
    environment: 'node', // server-side tests by default
    setupFiles: ['src/lib/server/test-setup.ts'],
  },
});
```

**Server route testing approach:** Import route handlers directly and test them as functions. SvelteKit server routes export standard `GET`, `POST`, etc. functions that accept a `RequestEvent` - these can be tested by constructing mock events.

### Playwright Configuration

Playwright runs e2e tests against the built SvelteKit app:

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  webServer: {
    command: 'pnpm run build && pnpm run preview',
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: 'http://localhost:4173',
  },
});
```

**Confidence:** HIGH -- Official Svelte docs, standard Playwright configuration.

## Docker Architecture

### Multi-Stage Dockerfile (adapter-node)

```dockerfile
# docker/Dockerfile
# Stage 1: Install dependencies
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

# Stage 2: Build
FROM node:22-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable && pnpm build
RUN pnpm prune --prod

# Stage 3: Production
FROM node:22-slim AS production
WORKDIR /app
RUN addgroup --system --gid 1001 app && \
    adduser --system --uid 1001 app
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/drizzle ./drizzle
USER app
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["node", "build"]
```

### Docker Compose Service Topology

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:17
    environment:
      POSTGRES_DB: sveltekit_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 5s
      timeout: 5s
      retries: 5

  aspire-dashboard:
    image: mcr.microsoft.com/dotnet/aspire-dashboard:latest
    environment:
      ASPIRE_DASHBOARD_UNSECURED_ALLOW_ANONYMOUS: 'true'
    ports:
      - '18888:18888' # Dashboard UI
      - '4317:18889' # OTLP/gRPC
      - '4318:18890' # OTLP/HTTP (used by our OTEL SDK)
    healthcheck:
      test: ['CMD', 'wget', '--spider', '-q', 'http://localhost:18888']
      interval: 10s
      timeout: 5s
      retries: 3

volumes:
  postgres_data:
```

**Service communication:**

- SvelteKit app (host, `vite dev`) connects to PostgreSQL at `localhost:5432`
- SvelteKit app exports OTEL data to Aspire at `http://localhost:4318` (OTLP/HTTP)
- Developer views traces/metrics at `http://localhost:18888` (Aspire UI)

**Note:** The SvelteKit app runs on the host during development (not in Docker) for fast HMR. Only PostgreSQL and Aspire run in Docker Compose for dev. The Dockerfile is for production builds.

**Confidence:** HIGH -- Official Aspire dashboard docs confirm port mappings. Standard Docker patterns for Node.js apps.

## Scalability Considerations

| Concern    | Starter (dev)                   | Production Small                   | Production Large                              |
| ---------- | ------------------------------- | ---------------------------------- | --------------------------------------------- |
| Database   | Docker Compose PostgreSQL       | Managed PostgreSQL (RDS, Supabase) | Connection pooler (PgBouncer) + read replicas |
| OTEL       | Aspire Dashboard (in-memory)    | Grafana Cloud / Datadog            | Dedicated OTEL Collector + backend            |
| App Server | Single node (vite dev)          | Single container + adapter-node    | Multiple containers behind load balancer      |
| Sessions   | Not included (project-specific) | Redis or DB-backed sessions        | Redis cluster                                 |

The starter template intentionally targets the "Starter (dev)" column. Production scaling is project-specific and out of scope for the template.

## Build Order (Dependencies Between Components)

The following build order respects component dependencies:

```
Phase 1: Foundation
  SvelteKit scaffold + adapter-node + TypeScript strict
  Tailwind CSS + DaisyUI
  ESLint + Prettier + lint-staged + Husky
  Basic folder structure
  (No external dependencies, can be validated independently)

Phase 2: Infrastructure
  Docker Compose (PostgreSQL + Aspire Dashboard)
  Environment validation (Zod, $lib/server/env.ts)
  Database client (postgres.js + Drizzle, $lib/server/db/)
  Drizzle schema + migration workflow
  Health check endpoint (/api/health)
  (Depends on: Phase 1 scaffold, Docker running)

Phase 3: Observability
  OTEL SDK initialization (instrumentation.server.ts)
  Hooks architecture (sequence, security headers, OTEL enrichment)
  CSRF protection verification
  (Depends on: Phase 2 for database spans, Aspire Dashboard running)

Phase 4: Testing + Quality
  Vitest configuration + example tests
  Playwright configuration + example e2e tests
  Knip configuration for dead code detection
  Production Dockerfile
  (Depends on: Phase 2-3 for meaningful tests to write)

Phase 5: Polish
  CLAUDE.md with accurate project documentation
  .env.example with all required variables
  Example page demonstrating patterns
  Final cleanup + validation
  (Depends on: All previous phases complete)
```

**Rationale:** Each phase produces a working, testable increment. Phase 1 gives you a running app. Phase 2 adds data. Phase 3 adds observability. Phase 4 validates everything. Phase 5 documents it.

## Sources

- [SvelteKit Project Structure](https://svelte.dev/docs/kit/project-structure) -- Official docs (HIGH confidence)
- [SvelteKit Hooks](https://svelte.dev/docs/kit/hooks) -- Official docs (HIGH confidence)
- [SvelteKit Observability](https://svelte.dev/docs/kit/observability) -- Official docs, instrumentation.server.ts (HIGH confidence)
- [@sveltejs/kit/hooks sequence()](https://svelte.dev/docs/kit/@sveltejs-kit-hooks) -- Official API reference (HIGH confidence)
- [Svelte CLI Drizzle integration](https://svelte.dev/docs/cli/drizzle) -- Official CLI docs (HIGH confidence)
- [Drizzle ORM Schema Declaration](https://orm.drizzle.team/docs/sql-schema-declaration) -- Official Drizzle docs (HIGH confidence)
- [Drizzle Kit Migration Workflow](https://orm.drizzle.team/docs/kit-overview) -- Official Drizzle docs (HIGH confidence)
- [Aspire Dashboard Standalone](https://aspire.dev/dashboard/standalone/) -- Official Microsoft docs (HIGH confidence)
- [Aspire Dashboard Docker Hub](https://hub.docker.com/r/microsoft/dotnet-aspire-dashboard/) -- Official image (HIGH confidence)
- [SvelteKit Dockerfile patterns](https://gist.github.com/aradalvand/04b2cad14b00e5ffe8ec96a3afbb34fb) -- Community reference (MEDIUM confidence)
- [SvelteKit larger app structure discussion](https://github.com/sveltejs/kit/discussions/7579) -- Community patterns (MEDIUM confidence)
