# Phase 8: Production Docker - Research

**Researched:** 2026-04-12
**Domain:** Docker multi-stage builds, adapter-node deployment, docker-compose production patterns, CLAUDE.md audit
**Confidence:** HIGH

## Summary

Phase 8 is a packaging and documentation phase, not a feature phase. All application code is complete (phases 1-7). The work is: (1) create `docker/Dockerfile` with a 3-stage multi-stage build producing a slim alpine production image under 200MB running as a non-root user, (2) create `docker/docker-compose.prod.yml` referencing `.env` for all secrets, and (3) perform a full audit-update of `CLAUDE.md` to reflect the finalized codebase state.

The adapter-node build output is well understood: `pnpm run build` produces `build/` with `index.js` as the entry point. The `build/index.js` already imports `build/server/instrumentation.server.js` as its first action — no `--import` flag is needed for OTEL in production. The runtime image just needs `node build/index.js`.

The CLAUDE.md audit is significant scope: the Conventions and Architecture sections currently say "not yet established" despite 7 phases of real patterns emerging. These must be populated with verified, working patterns from the final codebase.

**Primary recommendation:** Use `node:22-alpine` for the runtime stage, `pnpm install --frozen-lockfile` in the deps stage, `pnpm prune --prod` or a clean `npm ci --omit=dev` copy strategy for the runtime stage, and add `curl` to the runtime image for the HEALTHCHECK.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** The existing `docker-compose.yml` at the project root is dev-only and stays unchanged. It runs PostgreSQL + Aspire Dashboard with `env_file: .env.development`. No production app container.
- **D-02:** A new `docker/docker-compose.prod.yml` file is created for production deployment. It includes the SvelteKit application container (built from `docker/Dockerfile`) and PostgreSQL. NOT Aspire Dashboard.
- **D-03:** The production compose uses `env_file: .env` for all secrets. `.env` is gitignored. `.env.example` documents what is required.
- **D-04:** Dockerfile lives at `docker/Dockerfile`. Build command: `docker build -f docker/Dockerfile .`
- **D-05:** Multi-stage build with 3 stages: deps (install all deps including devDeps for build), builder (run `pnpm run build`), runtime (slim final image: copy only `build/` and production `node_modules`).
- **D-06:** Runtime base image: `node:22-alpine`. Target image size <200MB (typically ~130-150MB with alpine).
- **D-07:** App runs as a non-root user (conventional name: `node`). Create user in runtime stage, set file ownership, use `USER node`.
- **D-08:** Include a `HEALTHCHECK` instruction pointing to `/api/health`. Requires `curl` installed in the alpine image. Format: `HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD curl -f http://localhost:3000/api/health || exit 1`
- **D-09:** Default PORT is 3000 (adapter-node default). Expose port 3000 in Dockerfile.
- **D-10:** The production app needs `DATABASE_URL`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_SERVICE_NAME`, `LOG_LEVEL` at runtime. These come from `env_file: .env` in `docker/docker-compose.prod.yml`.
- **D-11:** `NODE_ENV=production` set in the Dockerfile or compose file.
- **D-12:** Full audit update of CLAUDE.md — not just Docker additions. Review entire CLAUDE.md against the finalized codebase. Add `docker/` folder, Docker build commands, verify pnpm scripts, add conventions that emerged during phases 2-7, update "Conventions" and "Architecture" sections (currently say "not yet established"). Keep existing structure.

### Claude's Discretion

- `.dockerignore` contents (exclude `node_modules`, `.planning`, `.git`, test files, `.env*` except via env_file)
- Exact pnpm version pinning in the build stage
- Multi-stage caching strategy (order of COPY instructions to maximize layer cache)
- Service names in docker-compose.prod.yml (e.g., `app`, `postgres`)
- Volume naming in production compose

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>

## Phase Requirements

| ID      | Description                                                                                                                   | Research Support                                                                                                            |
| ------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| DOCK-02 | Production Dockerfile with multi-stage build: install deps -> build SvelteKit -> copy adapter-node output to slim final image | D-04/D-05/D-06: 3-stage pattern verified; adapter-node build output structure confirmed at `build/index.js`                 |
| DOCK-03 | Production image runs as non-root user; optimized image size                                                                  | D-06/D-07: node:22-alpine base + `node` user creation + `USER node` instruction; HEALTHCHECK requires curl in runtime image |
| DOCK-04 | docker-compose.yml environment variables reference `.env` file; no hardcoded secrets                                          | D-03: `env_file: .env` pattern; existing dev compose already demonstrates postgres service config to copy                   |

</phase_requirements>

## Standard Stack

### Core

| Library        | Version    | Purpose                 | Why Standard                                                                                               |
| -------------- | ---------- | ----------------------- | ---------------------------------------------------------------------------------------------------------- |
| node:22-alpine | 22-alpine  | Runtime base image      | Matches project Node.js 22 LTS requirement; alpine minimizes image size (~130-150MB vs ~400MB for node:22) |
| node:22-alpine | 22-alpine  | Build base image        | Consistent Node version across stages; pnpm installed via corepack                                         |
| curl           | OS package | Health check dependency | Only way to run `curl -f` in the HEALTHCHECK instruction; not present in node:22-alpine by default         |

### Supporting

| Library  | Version          | Purpose                       | When to Use                                                                              |
| -------- | ---------------- | ----------------------------- | ---------------------------------------------------------------------------------------- |
| pnpm     | 10.33.0 (pinned) | Package manager in Dockerfile | Match exact version from `package.json#packageManager` field                             |
| corepack | (node built-in)  | pnpm installation mechanism   | `corepack enable pnpm` is the official way to install pnpm in Docker; no curl-pipe-to-sh |

### Alternatives Considered

| Instead of               | Could Use                            | Tradeoff                                                                                                                                   |
| ------------------------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm prune --prod`      | `npm ci --omit=dev` in runtime stage | pnpm prune modifies node_modules in place; npm ci does a clean install; both work but pnpm prune is faster since lockfile already resolved |
| `node:22-alpine` runtime | `node:22-slim` (Debian-based)        | alpine is smaller; slim includes curl already but ~50MB larger                                                                             |
| Multi-stage COPY         | `pnpm deploy` command                | pnpm deploy is for monorepos; this is not a workspace with packages — not applicable                                                       |

**Installation:**

```bash
# No npm install needed — all libraries are already in the project
# Docker build:
docker build -f docker/Dockerfile .
```

**Version verification:** [VERIFIED: package.json] pnpm version is `10.33.0` from `packageManager` field. Node.js 22 LTS is the project requirement. [VERIFIED: codebase]

## Architecture Patterns

### Recommended Project Structure

```
docker/
├── Dockerfile           # Multi-stage production build
└── docker-compose.prod.yml  # Production compose (app + postgres)

.dockerignore            # At project root (required for correct build context)
```

### Pattern 1: Three-Stage Multi-Stage Dockerfile

**What:** Three separate FROM stages — deps (install all node_modules), builder (run the SvelteKit build), runtime (slim image with only what the app needs at runtime).

**When to use:** Always for Node.js production images — eliminates devDependencies and build tools from the final image.

**Example:**

```dockerfile
# Source: adapter-node documentation + verified build output structure [VERIFIED: codebase]

# ── Stage 1: deps ──────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
# corepack is included with Node.js 22; enables pnpm without network call
RUN corepack enable pnpm
# Copy lockfile and manifests first for layer cache — only re-runs if these change
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Install ALL deps (including devDeps needed by the build)
# --frozen-lockfile ensures reproducible installs
RUN pnpm install --frozen-lockfile

# ── Stage 2: builder ───────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable pnpm
# Copy installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
# Copy all source files
COPY . .
# Build the SvelteKit app; adapter-node outputs to build/
RUN pnpm run build

# ── Stage 3: runtime ───────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app
RUN corepack enable pnpm

# Install curl for HEALTHCHECK (not present in node:22-alpine by default)
RUN apk add --no-cache curl

# Create non-root user (node user already exists in node:22-alpine base)
# The node user is uid 1000 in node:22-alpine
RUN mkdir -p /app && chown node:node /app

# Copy built app and production node_modules
COPY --from=builder --chown=node:node /app/build ./build
COPY --from=builder --chown=node:node /app/package.json ./
COPY --from=builder --chown=node:node /app/pnpm-lock.yaml ./
COPY --from=builder --chown=node:node /app/pnpm-workspace.yaml ./

# Install only production dependencies in runtime stage
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
RUN pnpm prune --prod

# Run as non-root user
USER node

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# adapter-node entry point — instrumentation.server.js is imported first by build/index.js
CMD ["node", "build/index.js"]
```

**Critical detail:** `build/index.js` already contains `import './server/instrumentation.server.js'` as its first line. [VERIFIED: codebase — `cat build/index.js`] No `--import` flag or `--experimental-loader` is needed. The OTEL SDK starts before any app code because the instrumentation file self-registers via `createAddHookMessageChannel()`.

**SIGTERM handling:** `instrumentation.server.ts` already has a `process.on('SIGTERM', ...)` handler that calls `sdk.shutdown()` and then `process.exit(0)`. [VERIFIED: codebase] Docker stop sends SIGTERM — this is correct behavior.

### Pattern 2: Production Docker Compose

**What:** Minimal compose file with app + postgres, using `env_file: .env` for all secrets.

**Example:**

```yaml
# Source: derived from existing docker-compose.yml postgres service config [VERIFIED: codebase]
services:
  app:
    build:
      context: ..
      dockerfile: docker/Dockerfile
    ports:
      - '3000:3000'
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  postgres:
    image: postgres:17-alpine
    env_file: .env
    ports:
      - '5432:5432'
    volumes:
      - postgres_prod_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB']
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

volumes:
  postgres_prod_data:
```

**Note on `context: ..`:** The Dockerfile is at `docker/Dockerfile` and the build context must be the project root (not `docker/`) so that `COPY . .` includes `src/`, `package.json`, etc. [VERIFIED: CONTEXT.md D-04]

### Pattern 3: .dockerignore

**What:** Prevents build context bloat by excluding items that should never go into the image.

**Example:**

```
# Dependencies (rebuilt inside Docker)
node_modules
.pnpm-store

# Build output (rebuilt inside Docker)
build
.svelte-kit

# Dev tooling
.planning
.claude
test-results
playwright-report

# Version control
.git
.gitignore

# Environment files (must NOT be baked into image — passed via env_file)
.env
.env.*
!.env.example

# OS artifacts
.DS_Store
Thumbs.db

# Test files not needed in production
*.test.ts
*.spec.ts
tests/
```

**Why critical:** Without `.dockerignore`, Docker sends the entire `node_modules` (often 500MB+) to the build daemon as the build context, causing very slow builds. [ASSUMED — industry standard Docker behavior]

### Anti-Patterns to Avoid

- **Baking `.env` into the image:** Using `COPY .env .` in the Dockerfile copies secrets into the image layer history — they persist in `docker history`. Always use `env_file:` in compose or `-e` flags.
- **Running as root:** Default Docker containers run as root (uid 0). The `node` user must be set with `USER node` before `CMD`.
- **Copying node_modules from host into image:** The `node_modules` directory contains native binaries compiled for the host OS, which will not work on alpine linux. Always install inside the Docker build.
- **Single-stage build:** Copying all devDependencies to production balloons image size from ~150MB to 500MB+.
- **Installing curl with `--update` but not `--no-cache`:** `apk add --no-cache` keeps layer size small by not persisting the apk index.
- **Not setting `start_period` in HEALTHCHECK:** The SvelteKit app takes 2-5 seconds to start (OTEL SDK initialization). Without `start_period`, health checks fail during startup and Docker may kill the container.

## Don't Hand-Roll

| Problem                           | Don't Build                      | Use Instead                                          | Why                                                                                         |
| --------------------------------- | -------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Production node_modules isolation | Manual file copying              | `pnpm prune --prod`                                  | pnpm handles hoisting, symlinks, and peer deps correctly                                    |
| Health check HTTP probing         | Custom shell script              | `curl -f` in HEALTHCHECK                             | curl handles HTTP status codes, timeouts, and redirects reliably                            |
| Non-root user creation            | Custom user setup                | Use existing `node` user in `node:22-alpine`         | The official node image already creates a `node` user (uid 1000) — don't create a duplicate |
| Signal handling                   | Custom signal trap in Dockerfile | `process.on('SIGTERM')` in instrumentation.server.ts | Already implemented in Phase 5 — just verify it works                                       |

**Key insight:** The `node` user already exists in the `node:22-alpine` base image — `adduser node` would fail with a conflict. Use `USER node` directly after setting ownership with `chown node:node`.

## Common Pitfalls

### Pitfall 1: OTEL Initialization Order

**What goes wrong:** Traces are missing for the first few requests, or the SDK fails silently because it initializes after the HTTP server starts.

**Why it happens:** If the start command bypasses `build/index.js` and calls `node build/start.js` directly, the instrumentation file is never imported.

**How to avoid:** Always use `node build/index.js` as the CMD. [VERIFIED: codebase — `cat build/index.js` shows instrumentation is the first import]

**Warning signs:** No traces appearing in Aspire Dashboard after startup.

### Pitfall 2: Layer Cache Invalidation

**What goes wrong:** Every code change causes `pnpm install` to re-run, making builds take 2-3 minutes instead of 15 seconds.

**Why it happens:** COPY order matters — if source files are copied before `package.json`/lockfile, any file change invalidates the install layer.

**How to avoid:** Always copy lockfiles first (`COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./`), run `pnpm install`, then copy source files (`COPY . .`).

**Warning signs:** Build logs show "Running pnpm install" on every build even with no dependency changes.

### Pitfall 3: engine-strict Blocking pnpm in Docker

**What goes wrong:** `pnpm install --frozen-lockfile` fails in the Dockerfile with "Unsupported engine" because the Node version in the image doesn't match `engines` field.

**Why it happens:** `.npmrc` has `engine-strict=true`. [VERIFIED: codebase] The `node:22-alpine` image uses Node.js 22 — this must match `package.json#engines.node` if that field is set.

**How to avoid:** Use `node:22-alpine` consistently (matches project requirement). Do not use `node:lts-alpine` which might resolve to Node 24 in the future.

**Warning signs:** `pnpm install` exits with code 1 and mentions "engine" or "unsupported" in the error.

### Pitfall 4: DATABASE_URL Format in Production Compose

**What goes wrong:** The production container can't connect to postgres because `DATABASE_URL` uses `localhost` (which refers to the container itself) instead of the compose service name.

**Why it happens:** Dev `.env.example` uses `postgres://postgres:postgres@localhost:5432/app`. Inside compose, the postgres service is referenced by its service name (e.g., `postgres`).

**How to avoid:** The production `.env` that users create must use the postgres service name: `postgres://user:pass@postgres:5432/db`. Document this clearly in `.env.example` comments.

**Warning signs:** App starts but health check returns `{ db: "error" }` — connection refused to localhost:5432.

### Pitfall 5: pnpm-workspace.yaml blockExoticSubdeps

**What goes wrong:** `pnpm install --frozen-lockfile` in the Dockerfile fails when trying to install packages that `blockExoticSubdeps: true` would block.

**Why it happens:** `pnpm-workspace.yaml` has `blockExoticSubdeps: true`. [VERIFIED: codebase] This config file must be present in the Docker build context.

**How to avoid:** Ensure `pnpm-workspace.yaml` is copied into the Dockerfile before `pnpm install`. Already covered in the caching pattern: `COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./`.

### Pitfall 6: CLAUDE.md Conventions Section Still Empty

**What goes wrong:** The CLAUDE.md update task is treated as "add Docker commands" only, leaving the Conventions section as "not yet established" after 7 phases of real development.

**Why it happens:** The conventions emerged gradually across phases and were only captured in per-phase context files, not centralized.

**How to avoid:** Before writing CLAUDE.md, audit all phase CONTEXT.md files for patterns tagged as decisions, then grep the codebase for established patterns. The following conventions are confirmed:

- [VERIFIED: codebase] Svelte 5 runes: `$state`, `$effect`, `$props`, `{@render children()}` — NOT `writable()` stores or `<slot />`
- [VERIFIED: codebase] `$lib/server/` boundary: all server-only code lives here; any client import causes a build error
- [VERIFIED: codebase] Env validation: Zod schema in `src/lib/server/env/schema.ts`, exported singleton in `index.ts`; consumed via `import { env } from '$lib/server/env'`
- [VERIFIED: codebase] DB client: singleton in `src/lib/server/db/index.ts` using `pg.Pool`; imported as `{ client }` or `{ db }` (Drizzle)
- [VERIFIED: codebase] Structured logging: pino logger in `src/lib/server/logger.ts`; used as `logger.info(...)` not `console.log`
- [VERIFIED: codebase] hooks.server.ts uses `sequence()` composing separate handle functions
- [VERIFIED: STATE.md] CSS-first pattern: all Tailwind + DaisyUI config in `src/app.css`; no `tailwind.config.js`
- [VERIFIED: STATE.md] `$env/dynamic/private` for secrets (not static) to support runtime Docker env vars

## Code Examples

Verified patterns from official sources:

### adapter-node Production Entry Point

```bash
# Source: verified from build/index.js [VERIFIED: codebase]
node build/index.js
```

The build output at `build/index.js` contains:

```js
import './server/instrumentation.server.js'; // OTEL runs first
const { path, host, port, server } = await import('./start.js');
```

No `--import` flag needed. The instrumentation module self-registers ESM hooks via `createAddHookMessageChannel()`.

### adapter-node Port Configuration

```bash
# Source: adapter-node defaults [ASSUMED — standard adapter-node behavior]
PORT=3000  # default; override via environment variable
ORIGIN=https://yourdomain.com  # required for CSRF in production if not behind a reverse proxy
```

### pnpm Production Prune

```bash
# Source: pnpm docs [ASSUMED — verified pnpm prune --prod removes devDeps in-place]
pnpm prune --prod
```

### PostgreSQL Service Name in Production DATABASE_URL

```bash
# In docker/docker-compose.prod.yml, postgres service is named "postgres"
# The production .env must use the service name, not localhost:
DATABASE_URL=postgres://user:password@postgres:5432/dbname
```

### curl Health Check in Alpine

```bash
# curl is not included in node:22-alpine by default
# Must install explicitly:
RUN apk add --no-cache curl
```

## State of the Art

| Old Approach                         | Current Approach                                    | When Changed       | Impact                                                                                     |
| ------------------------------------ | --------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------ |
| `node:lts-alpine`                    | `node:22-alpine` explicit version                   | Best practice      | Prevents silent Node.js major upgrades breaking the app                                    |
| `npm ci --omit=dev`                  | `pnpm prune --prod`                                 | With pnpm adoption | Works with pnpm lockfile format                                                            |
| `--experimental-loader` for OTEL ESM | `instrumentation.server.ts` bundled by adapter-node | SvelteKit 2.x      | SvelteKit auto-includes instrumentation file in build output; no manual loader flag needed |

## Assumptions Log

| #   | Claim                                                                                  | Section               | Risk if Wrong                                                             |
| --- | -------------------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------- |
| A1  | `pnpm prune --prod` removes devDependencies in-place on an existing node_modules       | Code Examples         | May need `pnpm install --prod` instead; test during execution             |
| A2  | `ORIGIN` env var is needed for CSRF in production if app is not behind a reverse proxy | Code Examples         | CSRF protection may reject legitimate requests; document in .env.example  |
| A3  | `node:22-alpine` already contains the `node` user at uid 1000                          | Architecture Patterns | `USER node` would fail; would need `addgroup` + `adduser`                 |
| A4  | Image size will be ~130-150MB with alpine and production deps only                     | Summary               | May exceed 200MB limit; execution must verify with `docker image inspect` |

## Open Questions (RESOLVED)

1. **pnpm prune vs clean prod install**
   - What we know: `pnpm prune --prod` removes devDependencies from existing node_modules
   - What's unclear: Whether pnpm-workspace.yaml settings cause issues with in-place prune
   - RESOLVED: Use `pnpm prune --prod` in the Dockerfile; Plan 08-01 Task 3 includes an explicit fallback — if prune fails, fall back to a fresh `pnpm install --prod` in a separate stage

2. **ORIGIN env var requirement**
   - What we know: SvelteKit uses `ORIGIN` for CSRF validation when not behind a trusted reverse proxy
   - What's unclear: Whether the starter should include `ORIGIN` in `.env.example` documentation
   - RESOLVED: Plan 08-01 Task 2 adds `ORIGIN=http://localhost:3000` to `.env.example` with a comment explaining the production override requirement

3. **Database migrations in production**
   - What we know: `drizzle-kit migrate` runs migrations; the Dockerfile does NOT run migrations at startup (not in scope for this phase)
   - What's unclear: How users should run migrations in production
   - RESOLVED: Out of scope for this phase. Plan 08-02 Task 1 documents the migration runbook in CLAUDE.md — `npx drizzle-kit migrate` must be run before first deployment using `docker run --rm --env-file .env <image> npx drizzle-kit migrate`

## Environment Availability

| Dependency     | Required By                | Available | Version                      | Fallback |
| -------------- | -------------------------- | --------- | ---------------------------- | -------- |
| Docker         | Building production image  | ✓         | 29.3.1                       | —        |
| Docker Compose | Running production compose | ✓         | (bundled with Docker 29)     | —        |
| pnpm           | Build stage in Dockerfile  | ✓         | 10.33.0                      | —        |
| Node.js 22     | Runtime stage base image   | ✓         | v24.14.1 (host), 22 in image | —        |

**Missing dependencies with no fallback:** None — all required tools are available.

**Note:** The host has Node.js 24 but the Dockerfile uses `node:22-alpine` explicitly. This is correct — Docker pulls the image independently of the host Node version.

## Validation Architecture

### Test Framework

| Property           | Value                                               |
| ------------------ | --------------------------------------------------- |
| Framework          | Vitest 4.1.2 + Playwright 1.59.1                    |
| Config file        | vite.config.ts (Vitest), playwright.config.ts (E2E) |
| Quick run command  | `pnpm run test:unit`                                |
| Full suite command | `pnpm run test`                                     |

### Phase Requirements → Test Map

| Req ID  | Behavior                                      | Test Type | Automated Command                                                                                                | File Exists? |
| ------- | --------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------- | ------------ |
| DOCK-02 | Multi-stage build produces working image      | smoke     | `docker build -f docker/Dockerfile . && docker run --rm image node build/index.js --check` (manual verification) | ❌ Wave 0    |
| DOCK-03 | Image runs as non-root user; size <200MB      | smoke     | `docker inspect --format='{{.Config.User}}' image_name` + `docker image inspect`                                 | ❌ Wave 0    |
| DOCK-04 | compose references .env, no hardcoded secrets | manual    | `grep -r "password" docker/docker-compose.prod.yml` (should return empty)                                        | ❌ Wave 0    |

**Note:** Docker build/run tests cannot be automated with Vitest — they require shell execution. Verification is done via manual smoke tests after build. CLAUDE.md update is verified by human review.

### Sampling Rate

- **Per task commit:** `pnpm run test:unit` (confirm existing tests still pass)
- **Per wave merge:** `pnpm run test`
- **Phase gate:** Full suite green + Docker image builds successfully + `docker run` starts the app

### Wave 0 Gaps

- No new test files required for this phase — Docker packaging is verified via manual smoke tests
- CLAUDE.md audit is a human-review task, not an automated test

## Security Domain

### Applicable ASVS Categories

| ASVS Category         | Applies | Standard Control                                           |
| --------------------- | ------- | ---------------------------------------------------------- |
| V2 Authentication     | no      | —                                                          |
| V3 Session Management | no      | —                                                          |
| V4 Access Control     | no      | —                                                          |
| V5 Input Validation   | no      | All env validation already in src/lib/server/env/schema.ts |
| V6 Cryptography       | no      | —                                                          |

### Docker-Specific Security Patterns

| Pattern                   | STRIDE                 | Standard Mitigation                                                        |
| ------------------------- | ---------------------- | -------------------------------------------------------------------------- |
| Secrets in image layers   | Information Disclosure | Never COPY .env; always use env_file: in compose or -e flags at runtime    |
| Root process              | Elevation of Privilege | USER node in Dockerfile (D-07)                                             |
| Exposed unnecessary ports | Tampering              | Only EXPOSE 3000; postgres port exposure in compose is for dev convenience |
| No resource limits        | Denial of Service      | Out of scope for starter template; document as next step                   |

## Sources

### Primary (HIGH confidence)

- `build/index.js` [VERIFIED: codebase] — confirms `node build/index.js` as entry point and instrumentation load order
- `build/server/instrumentation.server.js` [VERIFIED: codebase] — confirms OTEL ESM hooks are bundled into build output
- `pnpm-workspace.yaml` [VERIFIED: codebase] — `blockExoticSubdeps: true` must be in Docker context
- `.npmrc` [VERIFIED: codebase] — `engine-strict=true` impacts node version matching
- `docker-compose.yml` [VERIFIED: codebase] — postgres service config to copy into prod compose
- `.env.example` [VERIFIED: codebase] — all env vars documented; DATABASE_URL uses localhost (must change for compose networking)
- `src/instrumentation.server.ts` [VERIFIED: codebase] — SIGTERM handler already implemented

### Secondary (MEDIUM confidence)

- CONTEXT.md D-01 through D-12 — locked decisions from discuss phase

### Tertiary (LOW confidence)

- A1-A4 in Assumptions Log — based on training knowledge, not verified in this session

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — Node.js version, pnpm version, and build output all verified from codebase
- Architecture: HIGH — 3-stage Dockerfile pattern is industry standard; build entry point verified
- Pitfalls: HIGH for OTEL order and cache (verified from codebase); MEDIUM for pnpm prune behavior (assumed)
- CLAUDE.md audit: HIGH — conventions verified directly from codebase and CONTEXT.md decisions

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (stable tooling; adapter-node output format rarely changes)
