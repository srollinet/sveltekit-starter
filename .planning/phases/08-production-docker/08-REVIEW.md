---
phase: 08-production-docker
reviewed: 2026-04-12T15:00:25Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - docker/Dockerfile
  - docker/docker-compose.prod.yml
  - .dockerignore
  - .env.example
  - CLAUDE.md
findings:
  critical: 2
  warning: 3
  info: 2
  total: 7
status: issues_found
---

# Phase 8: Code Review Report

**Reviewed:** 2026-04-12T15:00:25Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Reviewed the production Docker artifacts introduced in phase 8: a multi-stage Dockerfile, a production Compose file, a `.dockerignore`, and an updated `.env.example`. The Dockerfile itself is well-structured — multi-stage build, non-root user, health check, and frozen lockfile install are all correct. The main concerns are operational: no database migration step is wired into the production startup sequence, and the `ORIGIN` variable required for SvelteKit CSRF protection is commented out and unvalidated. Two additional warnings relate to unnecessary database port exposure and credential over-sharing between containers.

---

## Critical Issues

### CR-01: No database migration step in production startup

**File:** `docker/docker-compose.prod.yml:19-21`

**Issue:** The `app` service starts directly with `node build/index.js` and depends only on `postgres` being healthy (TCP-ready). There is no step that runs `drizzle-kit migrate` (or executes the generated SQL) before the app begins serving traffic. On a fresh deployment or after a schema-changing release, the app will start against an un-migrated (or empty) database, leading to runtime query failures or data corruption depending on the migration content.

The `drizzle-kit migrate` command is already wired in `package.json` as `db:migrate`, so the tooling exists — it just isn't invoked during container startup.

**Fix:** Add a migration init-container or an entrypoint wrapper. The lightest-weight approach is a shell entrypoint in the Dockerfile:

`docker/entrypoint.sh` (new file, must be `COPY`-ed into the runtime image):
```sh
#!/bin/sh
set -e
echo "Running database migrations..."
node -e "
  const { migrate } = require('drizzle-orm/node-postgres/migrator');
  const { drizzle } = require('drizzle-orm/node-postgres');
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  migrate(db, { migrationsFolder: './drizzle' }).then(() => pool.end());
" 2>&1
echo "Migrations complete."
exec node build/index.js
```

Or, simpler — add an `init` service to `docker-compose.prod.yml` that runs before `app`:

```yaml
  migrate:
    build:
      context: ..
      dockerfile: docker/Dockerfile
    command: ["node", "-e", "...migration script..."]
    env_file: ../.env
    depends_on:
      postgres:
        condition: service_healthy
    restart: "no"

  app:
    depends_on:
      postgres:
        condition: service_healthy
      migrate:
        condition: service_completed_successfully
```

Copy the `drizzle/` migrations folder into the runtime image (`COPY --from=builder /app/drizzle ./drizzle`) so the migrator can find the SQL files at runtime.

---

### CR-02: `ORIGIN` is commented out and unvalidated — CSRF protection silently broken in production

**File:** `.env.example:36`

**Issue:** The comment on line 30 states `ORIGIN` is "required in production for CSRF validation", but the variable is commented out (`# ORIGIN=http://localhost:3000`). More critically, `ORIGIN` is absent from the Zod `envSchema` in `src/lib/server/env/schema.ts`. SvelteKit's built-in CSRF protection reads `ORIGIN` from the environment to validate the `Origin` request header on non-GET requests. Without it:

- Behind a reverse proxy that rewrites the `Host` header, all form submissions and API mutations will receive 403 CSRF errors.
- If `ORIGIN` is silently missing, SvelteKit may fall back to permissive origin matching depending on version, weakening CSRF protection.

The hooks.server.ts comment (line 18) specifically relies on this being correct: `"SvelteKit built-in CSRF protection is active by default (checkOrigin: true)"` — but that assumption breaks without `ORIGIN` set properly.

**Fix:**

1. Uncomment the example value and provide a production-appropriate placeholder:

```dotenv
# SvelteKit ORIGIN — REQUIRED in production and behind reverse proxies.
# Must match the public URL of your app exactly (no trailing slash).
ORIGIN=https://yourdomain.com
```

2. Add `ORIGIN` to `src/lib/server/env/schema.ts` with a conditional default so local dev keeps working:

```typescript
export const envSchema = z.object({
  DATABASE_URL: z.url({ ... }),
  ORIGIN: z.url().optional(), // SvelteKit reads this directly; validated for format
  OTEL_EXPORTER_OTLP_ENDPOINT: z.url().default('http://localhost:4318'),
  OTEL_SERVICE_NAME: z.string().min(1).default('sveltekit-starter'),
  LOG_LEVEL: logLevelEnum.default('info'),
});
```

Or add a startup warning if `NODE_ENV=production` and `ORIGIN` is unset.

---

## Warnings

### WR-01: Postgres port 5432 published to host in production Compose

**File:** `docker/docker-compose.prod.yml:27`

**Issue:** `ports: - '5432:5432'` binds the database port to `0.0.0.0` on the host. In a production deployment this means the database is directly reachable from outside the container network — any network-accessible host can attempt connections. The `app` container reaches `postgres` via the Docker bridge network using the service name, so no host-side port mapping is needed for application functionality.

**Fix:** Remove the `ports` stanza from the `postgres` service entirely, or limit it to loopback for admin access only:

```yaml
  postgres:
    image: postgres:17-alpine
    # ports:           # Remove — app reaches postgres over Docker network
    #   - '5432:5432'  # Only uncomment for local admin/debugging, never in prod
    volumes:
      - postgres_prod_data:/var/lib/postgresql/data
```

---

### WR-02: App container receives unnecessary PostgreSQL admin credentials via shared `env_file`

**File:** `docker/docker-compose.prod.yml:15`

**Issue:** Both the `app` and `postgres` services load `../.env` via `env_file`. The `.env` file contains `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` — variables consumed only by the `postgres` container's init scripts. The app container only needs `DATABASE_URL`. Injecting raw admin credentials into the app process environment is unnecessary and violates least-privilege: if the application is compromised via RCE or path traversal, `POSTGRES_PASSWORD` is immediately readable via `/proc/self/environ`.

**Fix:** Use separate env files, or list only the variables the app needs:

```yaml
  app:
    env_file: ../.env          # keep for DATABASE_URL, OTEL vars, LOG_LEVEL
    environment:
      - NODE_ENV=production
      # Do NOT pass POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB to app

  postgres:
    env_file: ../.env.postgres # separate file with only POSTGRES_* vars
```

Alternatively, pass only the required variables to the app via the `environment:` block and drop the shared `env_file` for the app service.

---

### WR-03: Host port mapping uses `${PORT:-3000}:${PORT:-3000}` but Dockerfile hardcodes `ENV PORT=3000`

**File:** `docker/docker-compose.prod.yml:14` and `docker/Dockerfile:68`

**Issue:** The Compose port mapping `'${PORT:-3000}:${PORT:-3000}'` allows overriding the host-side port via the `PORT` env var. However, the Dockerfile sets `ENV PORT=3000` as a fixed default, and `adapter-node` reads this env var to choose its listen port. If a user sets `PORT=8080` in `.env`, the host maps `8080:8080` but the container still listens on `3000` (because `ENV PORT=3000` in the Dockerfile takes effect before the `env_file` is applied at runtime — Docker Compose `env_file` overrides Dockerfile `ENV` at container startup, so this actually works, but the intent is non-obvious and fragile).

More concretely: the container side of the port mapping should be a fixed value matching the Dockerfile default, not a variable:

**Fix:** Pin the container port to the Dockerfile default:

```yaml
    ports:
      - '${PORT:-3000}:3000'
```

This makes it clear that the container always listens on 3000 and only the host-side port is configurable. If `PORT` needs to be configurable inside the container too, pass it as a runtime env var and update EXPOSE accordingly.

---

## Info

### IN-01: `corepack enable pnpm` in runtime stage is unnecessary

**File:** `docker/Dockerfile:40`

**Issue:** The runtime stage runs `corepack enable pnpm` but only uses pnpm for the single `pnpm prune --prod --ignore-scripts` command. After pruning, the container starts with `node build/index.js` — pnpm is never called at runtime. Installing corepack/pnpm adds a build step and network call for no runtime benefit. This is a minor image hygiene issue.

**Fix:** Either inline the prune and drop corepack, or accept the minor overhead. The `pnpm prune` step itself could be moved to the `builder` stage where pnpm is already available:

In the builder stage, after `pnpm run build`:
```dockerfile
# Prune devDeps in builder stage so runtime stage doesn't need pnpm at all
RUN pnpm prune --prod --ignore-scripts
```

Then in runtime:
```dockerfile
# No corepack needed — just copy pruned node_modules
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build ./build
```

---

### IN-02: `OTEL_EXPORTER_OTLP_ENDPOINT` defaults to `localhost:4318` which is unreachable in production Docker

**File:** `.env.example:18`

**Issue:** The default `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318` works for dev (where the Aspire dashboard runs on the host). In the production Compose setup, `localhost` inside the app container refers to the container itself, not the host. The production `docker-compose.prod.yml` includes no Aspire Dashboard service. Users who copy `.env.example` to `.env` without updating this value will silently fail to export traces (OTEL exporters typically drop spans on connection failure without crashing the app).

**Fix:** Add a comment in `.env.example` clarifying the production value:

```dotenv
# OpenTelemetry
# Dev: http://localhost:4318 (Aspire dashboard runs on host via dev docker-compose)
# Production: set to your OTEL collector endpoint, or leave unset to disable tracing
# Example (if running a collector as a sidecar): http://otel-collector:4318
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

This is informational — the app won't crash with a bad endpoint, but traces will be silently lost.

---

_Reviewed: 2026-04-12T15:00:25Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
