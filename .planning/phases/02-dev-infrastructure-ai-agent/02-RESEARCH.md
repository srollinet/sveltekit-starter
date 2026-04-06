# Phase 2: Dev Infrastructure & AI Agent - Research

**Researched:** 2026-04-06
**Domain:** Docker Compose dev stack, Zod env validation, Claude Code MCP configuration
**Confidence:** HIGH

## Summary

Phase 2 is a pure infrastructure and configuration phase — no application logic, no UI. It has three distinct work streams: (1) stand up the Docker Compose dev stack with PostgreSQL 17 and the .NET Aspire Dashboard, (2) add a Zod schema that validates server environment variables at startup, and (3) create `CLAUDE-DEV.md` and extend `.claude/settings.json` with the `@sveltejs/mcp` server entry.

All locked decisions from CONTEXT.md are clear and well-constrained. The standard Docker Compose health check pattern for PostgreSQL is `pg_isready`, the Zod `^4.3.6` package is already the correct version, `$env/dynamic/private` is the correct SvelteKit API for runtime secrets, and `@sveltejs/mcp@0.1.22` is the current package. No external services or unusual tooling are required beyond what Docker and Node.js already provide.

**Primary recommendation:** Implement in three independent tasks — Docker Compose setup, env validation, and AI agent context files. They have no ordering dependencies within the phase.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Do NOT modify the existing `CLAUDE.md` — it is GSD-managed.
- **D-02:** Create a new `CLAUDE-DEV.md` at the project root as the developer quick-reference file.
- **D-03:** `CLAUDE-DEV.md` must contain: Key Commands, Folder Structure, Coding Conventions, Testing Patterns.
- **D-04:** Do NOT list all dependencies with versions in `CLAUDE-DEV.md`. Only major stack items by name; refer to `package.json` for full details.
- **D-05:** Add `mcpServers` key to the existing `.claude/settings.json` alongside current GSD hooks. No separate file needed.
- **D-06:** MCP server entry:
  ```json
  "mcpServers": {
    "svelte": {
      "command": "npx",
      "args": ["@sveltejs/mcp"]
    }
  }
  ```
- **D-07:** `docker-compose.yml` defines PostgreSQL 17 (named volume, `pg_isready` health check) and .NET Aspire Dashboard (ports `18888:18888`, `4317:18889`, `4318:18890`).
- **D-08:** All credentials reference `.env` via variable substitution — no hardcoded secrets in the compose file.
- **D-09:** `.env.example` documents all Phase 2 required vars with inline comments and working dev defaults.
- **D-10:** Default PostgreSQL dev credentials: `postgres/postgres`, database `app`, port `5432`. Connection string: `DATABASE_URL=postgres://postgres:postgres@localhost:5432/app`
- **D-11:** Zod schema validates **only** `DATABASE_URL`. Future phases add their own vars.
- **D-12:** Zod schema lives in `src/lib/server/env.ts`. Uses `$env/dynamic/private`.

### Claude's Discretion

- Exact wording and formatting of `CLAUDE-DEV.md` sections
- Specific Zod validation messages (keep them descriptive and actionable)
- Whether to use a single `DATABASE_URL` or individual DB\_\* vars — single URL chosen (D-10)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>

## Phase Requirements

| ID      | Description                                                                                                                         | Research Support                                                                                           |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| DOCK-01 | `docker-compose.yml` starts PostgreSQL + Aspire Dashboard with health checks                                                        | Docker Compose v2 syntax verified; `pg_isready` health check pattern documented below                      |
| ENV-01  | `.env.example` documenting all required env vars with comments and example values                                                   | Covered by locked decisions D-09, D-10                                                                     |
| ENV-02  | Zod schema in `src/lib/server/env.ts`; app fails fast with clear error on missing vars                                              | Zod `^4.3.6` verified on npm registry; `$env/dynamic/private` pattern documented below                     |
| ENV-03  | `$env/dynamic/private` used for secrets (not `$env/static/private`)                                                                 | SvelteKit docs confirm this is the correct runtime-env API for Docker deployments                          |
| AI-01   | `CLAUDE.md` at project root with project overview, tech stack, folder structure, key commands, coding conventions, testing patterns | Implemented as `CLAUDE-DEV.md` per D-01/D-02; existing `CLAUDE.md` is untouched                            |
| AI-02   | `.claude/settings.json` pre-configured with `@sveltejs/mcp` server                                                                  | `@sveltejs/mcp@0.1.22` verified on npm registry; merge pattern for existing settings.json documented below |

</phase_requirements>

## Standard Stack

### Core

| Library                | Version | Purpose                                                               | Why Standard                                                                 |
| ---------------------- | ------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| zod                    | ^4.3.6  | Env var validation at startup                                         | Already project decision; latest stable [VERIFIED: npm registry]             |
| @sveltejs/mcp          | 0.1.22  | MCP server for Svelte/SvelteKit docs in Claude Code                   | Official Svelte team package [VERIFIED: npm registry]                        |
| postgres (postgres.js) | ^3.4.9  | PostgreSQL driver (Phase 4 dep, but `DATABASE_URL` format must match) | CLAUDE.md locked decision; verified current version [VERIFIED: npm registry] |

### Supporting (Docker images)

| Image                                     | Tag       | Purpose                                      |
| ----------------------------------------- | --------- | -------------------------------------------- |
| postgres                                  | 17-alpine | PostgreSQL database (alpine = smaller image) |
| mcr.microsoft.com/dotnet/aspire-dashboard | latest    | OTEL collector + UI                          |

### Alternatives Considered

| Instead of             | Could Use                             | Tradeoff                                                                             |
| ---------------------- | ------------------------------------- | ------------------------------------------------------------------------------------ |
| `$env/dynamic/private` | `$env/static/private`                 | Static bakes values at build time — wrong for Docker; dynamic reads at runtime       |
| Single `DATABASE_URL`  | Individual `DB_HOST`, `DB_PORT`, etc. | URL is simpler, supported by all ORMs including Drizzle/postgres.js; D-10 locks this |

**Installation (Phase 2 new deps only):**

```bash
pnpm add zod
```

Zod is not currently in `package.json`. It needs to be added as a runtime dependency.

**Version verification:**

- `zod`: 4.3.6 (verified 2026-04-06 against npm registry) [VERIFIED: npm registry]
- `@sveltejs/mcp`: 0.1.22 (verified 2026-04-06 against npm registry) [VERIFIED: npm registry]
- `postgres.js` driver: 3.4.9 (verified 2026-04-06; Phase 4 will install it, but DATABASE_URL format chosen here must match) [VERIFIED: npm registry]

## Architecture Patterns

### Recommended Project Structure (Phase 2 additions)

```
/                          # project root
├── docker-compose.yml     # NEW: PostgreSQL + Aspire Dashboard services
├── .env.example           # NEW: documented env var template
├── .env                   # NEW (gitignored): actual dev secrets
├── CLAUDE-DEV.md          # NEW: developer quick-reference (AI agent context)
├── CLAUDE.md              # EXISTING: GSD-managed, do NOT touch
├── .claude/
│   └── settings.json      # MODIFY: add mcpServers block
└── src/
    └── lib/
        └── server/
            └── env.ts     # NEW: Zod validation for server env vars
```

### Pattern 1: Docker Compose with pg_isready Health Check

**What:** PostgreSQL service with a health check using the `pg_isready` command that ships inside the postgres container. Compose waits for this before declaring the service healthy.

**When to use:** Any Compose service that other services depend on being fully ready (not just started).

**Example:**

```yaml
# Source: Docker official PostgreSQL docs + CLAUDE.md port mapping
services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    ports:
      - '${DB_PORT:-5432}:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}']
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

volumes:
  postgres_data:
```

### Pattern 2: Aspire Dashboard Port Mapping

**What:** The .NET Aspire Dashboard runs on non-standard internal ports but maps to the standard OTEL ports.

**Port mapping (locked by D-07 / CLAUDE.md):**

- `18888:18888` — Dashboard UI
- `4317:18889` — OTLP gRPC (standard 4317 → internal 18889)
- `4318:18890` — OTLP HTTP (standard 4318 → internal 18890)

**Example:**

```yaml
# Source: CLAUDE.md §Docker Compose Dev Stack
aspire-dashboard:
  image: mcr.microsoft.com/dotnet/aspire-dashboard:latest
  ports:
    - '18888:18888'
    - '4317:18889'
    - '4318:18890'
  environment:
    DASHBOARD__UNSECUREDALLOWEDLIST: '*'
```

Note: `DASHBOARD__UNSECUREDALLOWEDLIST: "*"` disables the Aspire Dashboard login token for local dev. [ASSUMED] — This env var name needs confirmation; Aspire Dashboard standalone setup may use a different var to bypass authentication.

### Pattern 3: Zod Env Validation with `$env/dynamic/private`

**What:** SvelteKit's `$env/dynamic/private` module provides a `env` object populated at runtime from `process.env`. Zod parses and validates this object at module load time, causing the server to crash immediately with a descriptive error if a required var is missing.

**Why `$env/dynamic/private`:** `$env/static/private` bakes values at build time — unusable for Docker where different containers share the same build artifact but have different runtime env vars. CLAUDE.md explicitly forbids `$env/static/private` for secrets.

**Example:**

```typescript
// src/lib/server/env.ts
// Source: CLAUDE.md §What NOT to Use + SvelteKit env docs
import { env as rawEnv } from '$env/dynamic/private';
import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection URL'),
});

const parsed = schema.safeParse(rawEnv);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
```

**Important:** This module must be imported in server-only code (e.g., `hooks.server.ts` or a server route) for fail-fast behavior to trigger at startup. Module-level `process.exit(1)` only fires when the module is loaded.

### Pattern 4: Merging `mcpServers` into Existing `.claude/settings.json`

**What:** `.claude/settings.json` already contains GSD hooks. The `mcpServers` key is added at the top level alongside `hooks` and `statusLine`.

**Example (final structure):**

```json
{
  "hooks": { "...existing GSD hooks..." },
  "statusLine": { "...existing..." },
  "mcpServers": {
    "svelte": {
      "command": "npx",
      "args": ["@sveltejs/mcp"]
    }
  }
}
```

The existing `hooks` and `statusLine` keys must be preserved exactly. [VERIFIED: inspected .claude/settings.json in this session]

### Pattern 5: `.env.example` Format

```bash
# .env.example
# Copy this file to .env and fill in your values.
# All defaults below work for local development with `docker compose up`.

# ──────────────────────────────────────────────
# PostgreSQL (used by docker-compose.yml and src/lib/server/env.ts)
# ──────────────────────────────────────────────
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=app

# Full connection URL consumed by the app (and later by Drizzle in Phase 4)
DATABASE_URL=postgres://postgres:postgres@localhost:5432/app
```

### Anti-Patterns to Avoid

- **Hardcoding credentials in docker-compose.yml:** Use `${VAR}` substitution — see D-08
- **Using `$env/static/private`:** Bakes values at build time; breaks Docker runtime env pattern — CLAUDE.md explicitly forbids this
- **Calling `process.exit()` in client-accessible code:** `src/lib/server/env.ts` must only be imported from server-side modules; the `$lib/server/` path enforces this in SvelteKit
- **Adding version pins to `CLAUDE-DEV.md`:** D-04 forbids listing versions; point to `package.json` instead
- **Editing `CLAUDE.md`:** GSD-managed; do not touch

## Don't Hand-Roll

| Problem            | Don't Build                        | Use Instead                     | Why                                                                                                |
| ------------------ | ---------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------- |
| Env var validation | Custom `if (!process.env.X) throw` | Zod schema                      | Zod gives field-level error messages, type inference, and coercion in one pass                     |
| Docker healthcheck | Custom wait scripts                | `pg_isready` via `healthcheck:` | Built into the postgres image; Compose-native, works with `depends_on: condition: service_healthy` |

**Key insight:** Zod's `safeParse` + `flatten().fieldErrors` produces human-readable output that lists exactly which vars are missing or malformed — far better than a generic "missing env var" crash.

## Common Pitfalls

### Pitfall 1: `$env/dynamic/private` Module Not Loaded at Startup

**What goes wrong:** `src/lib/server/env.ts` is written correctly, but the Zod validation never runs in production because the module is not imported by any server-side entry point.

**Why it happens:** SvelteKit uses tree-shaking; modules that are never imported are never executed. If `env.ts` is only imported by routes that are rarely visited, startup validation does not happen.

**How to avoid:** Import `env.ts` (or at minimum `DATABASE_URL`) in `hooks.server.ts` or a server-side `load` function that always runs. The simplest guarantee: add `import '$lib/server/env'` at the top of `hooks.server.ts`.

**Warning signs:** App starts successfully with missing env vars; errors only appear when specific routes are hit.

### Pitfall 2: `.env` Not Loaded by Docker Compose

**What goes wrong:** `docker-compose.yml` uses `${VAR}` substitution but variables are undefined.

**Why it happens:** Docker Compose automatically reads `.env` from the same directory as `docker-compose.yml`. If `.env` doesn't exist (developer forgot to copy from `.env.example`), all substitutions expand to empty strings — PostgreSQL image interprets `POSTGRES_PASSWORD=` as no password, which may succeed silently but with unexpected credentials.

**How to avoid:** Add a note in `.env.example` header and `README.md`. Consider using `${VAR:?error message}` syntax in compose for required vars — this causes `docker compose up` to fail immediately with a clear error if the var is unset.

**Warning signs:** `docker compose up` succeeds but the database is unreachable or has wrong credentials.

### Pitfall 3: Aspire Dashboard Authentication Blocking Local Dev

**What goes wrong:** Aspire Dashboard shows a login page requiring a token instead of opening directly.

**Why it happens:** By default, the standalone Aspire Dashboard requires a login token passed via environment variable or generated at startup.

**How to avoid:** Set `DASHBOARD__UNSECUREDALLOWEDLIST: "*"` (or the correct equivalent env var) in the compose service definition to allow all localhost connections without authentication. [ASSUMED] — verify exact env var name from Aspire Dashboard standalone docs.

**Warning signs:** Browser shows "Dashboard login" page at http://localhost:18888.

### Pitfall 4: Named Volume Persists Stale Data Between Schema Changes

**What goes wrong:** After Phase 4 changes the database schema, the existing named volume has the old schema and migrations fail.

**Why it happens:** Docker named volumes persist across `docker compose down`. The postgres container initializes only on first start with an empty volume.

**How to avoid:** Document `docker compose down -v` (removes volumes) as the "reset database" command in `CLAUDE-DEV.md`. This is a Phase 4 concern but the volume name established in Phase 2 must be stable.

**Warning signs:** Migration errors about tables already existing, or missing columns.

### Pitfall 5: `npx @sveltejs/mcp` Requires Node.js Network Access

**What goes wrong:** MCP server fails to start in air-gapped or restricted environments because `npx` downloads the package.

**Why it happens:** The `"command": "npx"` form uses npx to download and run `@sveltejs/mcp` on demand rather than from a local install.

**How to avoid:** This is acceptable for a developer starter template. Developers can also `pnpm add -D @sveltejs/mcp` and change the args to use the local install. Document as a note in `CLAUDE-DEV.md` for corporate environment users. [ASSUMED] — confirm if `@sveltejs/mcp` caches via npx or requires fresh download each time.

## Code Examples

### Complete docker-compose.yml

```yaml
# Source: CLAUDE.md §Docker Compose Dev Stack + locked decisions D-07, D-08, D-10
services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
      POSTGRES_DB: ${POSTGRES_DB:-app}
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-app}']
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

  aspire-dashboard:
    image: mcr.microsoft.com/dotnet/aspire-dashboard:latest
    ports:
      - '18888:18888'
      - '4317:18889'
      - '4318:18890'
    environment:
      DASHBOARD__UNSECUREDALLOWEDLIST: '*'

volumes:
  postgres_data:
```

Note: Using `${VAR:-default}` syntax provides fallback defaults even without a `.env` file.

### Zod env.ts

```typescript
// src/lib/server/env.ts
import { env as rawEnv } from '$env/dynamic/private';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .url('DATABASE_URL must be a valid connection URL (e.g. postgres://user:pass@host:5432/db)'),
});

const result = envSchema.safeParse(rawEnv);

if (!result.success) {
  console.error('');
  console.error('  Invalid environment variables — server cannot start.');
  console.error('');
  for (const [key, errors] of Object.entries(result.error.flatten().fieldErrors)) {
    console.error(`  ${key}: ${errors?.join(', ')}`);
  }
  console.error('');
  console.error('  Copy .env.example to .env and set the required values.');
  console.error('');
  process.exit(1);
}

export const env = result.data;
```

### hooks.server.ts (import to guarantee startup validation)

```typescript
// src/hooks.server.ts
// Importing env.ts here guarantees Zod validation runs at server startup.
// If DATABASE_URL is missing or malformed, the server exits immediately with a clear error.
import '$lib/server/env';

export const handle = async ({ event, resolve }) => {
  return resolve(event);
};
```

## State of the Art

| Old Approach                                      | Current Approach                                        | When Changed                                             | Impact                                                         |
| ------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------- |
| `$env/static/private` for server secrets          | `$env/dynamic/private`                                  | SvelteKit introduced both; dynamic is correct for Docker | Env vars read at runtime, not baked into build artifact        |
| Docker Compose v1 (`docker-compose` command)      | Docker Compose v2 (`docker compose` command, no hyphen) | Docker Desktop 3.4+, standalone CLI v2                   | Compose v2 is now the standard; v1 is deprecated               |
| Aspire Dashboard requiring OTEL Collector sidecar | Aspire Dashboard standalone (single container)          | .NET Aspire Dashboard went standalone                    | Single container replaces multi-container Jaeger/Grafana setup |

**Deprecated/outdated:**

- `docker-compose.yml` with v2.x format keys: Docker Compose v2 no longer requires the `version:` key at the top of the file. Omitting it is preferred (avoids deprecation warning).

## Assumptions Log

| #   | Claim                                                                                | Section                  | Risk if Wrong                                                         |
| --- | ------------------------------------------------------------------------------------ | ------------------------ | --------------------------------------------------------------------- |
| A1  | `DASHBOARD__UNSECUREDALLOWEDLIST: "*"` disables Aspire Dashboard login for local dev | Code Examples, Pitfall 3 | Login page blocks developer access; need to find correct env var name |
| A2  | `npx @sveltejs/mcp` downloads package on each invocation (not cached)                | Pitfall 5                | Minor: documentation note may be unnecessary if npx caches            |

## Open Questions

1. **Aspire Dashboard authentication env var name**
   - What we know: Aspire Dashboard standalone can be configured to allow unauthenticated access
   - What's unclear: The exact environment variable name (`DASHBOARD__UNSECUREDALLOWEDLIST` is commonly cited but should be verified against the current image)
   - Recommendation: Planner should include a verification step: run the container and check if the dashboard opens without login. If it requires a token, add the correct env var.

2. **`hooks.server.ts` existence**
   - What we know: Phase 1 did not create `hooks.server.ts` (not in Phase 1 requirements); `src/routes/` currently has `+layout.svelte`, `+page.svelte`, `+error.svelte`
   - What's unclear: Does a `hooks.server.ts` file already exist?
   - Recommendation: Planner should treat this as a new file to create; if it already exists, add the import at the top.

## Environment Availability

| Dependency     | Required By        | Available                     | Version  | Fallback |
| -------------- | ------------------ | ----------------------------- | -------- | -------- |
| Docker         | docker-compose.yml | yes                           | 29.3.1   | —        |
| Docker Compose | docker-compose.yml | yes                           | v2.40.3  | —        |
| Node.js        | npx @sveltejs/mcp  | yes                           | v24.14.1 | —        |
| pnpm           | `pnpm add zod`     | yes (inferred from lock file) | —        | —        |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None.

## Validation Architecture

### Test Framework

| Property           | Value                                                                          |
| ------------------ | ------------------------------------------------------------------------------ |
| Framework          | Vitest (in package.json devDependencies, not yet configured in vite.config.ts) |
| Config file        | None — needs `test` block added to `vite.config.ts` in Wave 0                  |
| Quick run command  | `pnpm test:unit`                                                               |
| Full suite command | `pnpm test`                                                                    |

### Phase Requirements → Test Map

| Req ID  | Behavior                                                           | Test Type          | Automated Command                                  | File Exists? |
| ------- | ------------------------------------------------------------------ | ------------------ | -------------------------------------------------- | ------------ |
| ENV-02  | Zod validation fails fast with clear error on missing DATABASE_URL | unit               | `pnpm test:unit -- src/lib/server/env.test.ts`     | No — Wave 0  |
| ENV-03  | `$env/dynamic/private` import (not static) used in env.ts          | code review / lint | n/a — structural check                             | n/a          |
| DOCK-01 | PostgreSQL health check passes; Aspire Dashboard reachable         | manual smoke       | `docker compose up && curl http://localhost:18888` | n/a — manual |
| AI-01   | CLAUDE-DEV.md contains all 4 required sections                     | manual review      | n/a                                                | n/a          |
| AI-02   | .claude/settings.json contains mcpServers.svelte                   | manual review      | n/a                                                | n/a          |

**Note on ENV-02 testing:** Testing `src/lib/server/env.ts` with Vitest requires mocking `$env/dynamic/private`. SvelteKit provides `vi.mock('$env/dynamic/private', ...)` support via the `@sveltejs/kit/vite` Vitest integration. The `vite.config.ts` needs a `test` block with `environment: 'node'` and the SvelteKit resolver.

### Sampling Rate

- **Per task commit:** `pnpm test:unit`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Unit tests green + manual Docker smoke test before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/lib/server/env.test.ts` — covers ENV-02 (Zod fail-fast behavior)
- [ ] `vite.config.ts` test block — Vitest is installed but `defineConfig` has no `test` property yet; needed before any unit test can run
- [ ] `vitest.config.ts` or inline `test` block: `{ environment: 'node', setupFiles: [] }` with SvelteKit module resolver

## Security Domain

### Applicable ASVS Categories

| ASVS Category         | Applies | Standard Control                          |
| --------------------- | ------- | ----------------------------------------- |
| V2 Authentication     | no      | n/a — no auth in this phase               |
| V3 Session Management | no      | n/a                                       |
| V4 Access Control     | no      | n/a                                       |
| V5 Input Validation   | yes     | Zod validates DATABASE_URL format         |
| V6 Cryptography       | no      | n/a — no secrets generated, only consumed |

### Known Threat Patterns

| Pattern                                   | STRIDE                 | Standard Mitigation                                                                         |
| ----------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------- |
| Credentials in docker-compose.yml         | Information Disclosure | `.env` substitution (D-08); `.env` in `.gitignore`                                          |
| `POSTGRES_PASSWORD=` empty/default in dev | Spoofing               | Dev defaults are acceptable; `.env.example` documents them as dev-only                      |
| `DATABASE_URL` with credentials in logs   | Information Disclosure | Zod error messages print only field names, not values; avoid logging `process.env` directly |
| Aspire Dashboard exposed without auth     | Information Disclosure | `DASHBOARD__UNSECUREDALLOWEDLIST` is for localhost only; Dashboard is not production-facing |

**Note:** `src/lib/server/` path enforcement (SEC-03) is a Phase 6 concern. Phase 2 creates the `server/` directory and the SvelteKit module boundary is automatically enforced by the framework — importing `$lib/server/*` from client code is a build error.

## Sources

### Primary (HIGH confidence)

- CLAUDE.md §Technology Stack — version table for all dependencies
- CLAUDE.md §Docker Compose Dev Stack — port mapping for Aspire Dashboard
- CLAUDE.md §What NOT to Use — `$env/static/private` forbidden
- npm registry (`npm view zod version`) — zod@4.3.6, verified 2026-04-06
- npm registry (`npm view @sveltejs/mcp version`) — @sveltejs/mcp@0.1.22, verified 2026-04-06
- `.claude/settings.json` — inspected existing GSD hooks structure
- `package.json` — confirmed zod not yet installed, vitest in devDeps

### Secondary (MEDIUM confidence)

- Docker official PostgreSQL image docs — `pg_isready` health check pattern
- Docker Compose v2 docs — `healthcheck:` spec, `${VAR:-default}` syntax

### Tertiary (LOW confidence)

- `DASHBOARD__UNSECUREDALLOWEDLIST: "*"` env var for Aspire Dashboard unauthenticated access — cited from community usage, not verified against current image docs [A1]

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all package versions verified against npm registry
- Architecture: HIGH — all patterns derived from locked CONTEXT.md decisions + CLAUDE.md
- Pitfalls: MEDIUM — Docker/Compose pitfalls from training knowledge; one Aspire Dashboard item is ASSUMED
- Validation: HIGH — Vitest is in devDeps; gap (no test block in vite.config.ts) confirmed by inspection

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (stable stack; Aspire Dashboard image tag `latest` may change behavior)
