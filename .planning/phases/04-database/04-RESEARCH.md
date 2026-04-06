# Phase 4: Database — Research

**Researched:** 2026-04-06
**Domain:** Drizzle ORM + postgres.js + PostgreSQL — schema, migrations, DB client singleton
**Confidence:** HIGH

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Use `npx sv add drizzle="database:postgresql+client:postgres.js"` to scaffold the initial Drizzle setup (without `docker:yes` — Docker is already configured from Phase 2). This is the official Svelte CLI add-on.
- **D-02:** After scaffolding, restructure the generated single `schema.ts` into a `src/lib/server/db/schema/` directory pattern (one file per domain area). This matches DB-03 requirement and demonstrates the scalable pattern.
- **D-03:** The example table is named `posts`.
- **D-04:** Primary key: **UUIDv7** — time-ordered UUID, sortable by creation time. Requires the `uuidv7` npm package for generation in `$defaultFn`. Column type: `uuid` in Drizzle.
- **D-05:** Rich columns: `id` (uuid, PK, UUIDv7), `title` (text, not null), `body` (text, nullable), `status` (pgEnum: draft/published/archived), `created_at` (timestamptz, default now()), `updated_at` (timestamptz, default now(), `$onUpdateFn`)
- **D-06:** Schema lives at `src/lib/server/db/schema/posts.ts`. `drizzle.config.ts` points to `src/lib/server/db/schema/`.
- **D-07:** Follow what `sv add drizzle` generates for `src/lib/server/db/index.ts` as the base pattern.
- **D-08:** The DB client reads `DATABASE_URL` from `src/lib/server/env` (Zod-validated env module) — NOT directly from `$env/dynamic/private`.
- **D-09:** Dev workflow: `db:push`. Prod workflow: `db:generate` + `db:migrate`.
- **D-10:** All four drizzle-kit scripts in `package.json`: `db:generate`, `db:migrate`, `db:push`, `db:studio`.
- **D-11:** Migration files live in `drizzle/` at project root.
- **D-12:** Phase 4 generates and commits the first migration SQL file.
- **D-13:** No auto-migration on startup — always run manually with `pnpm run db:migrate`.
- **D-14:** DB-01 (PostgreSQL 17 in docker-compose.yml) was completed in Phase 2. Phase 4 does NOT modify docker-compose.yml.

### Claude's Discretion

- Exact `drizzle.config.ts` contents — follow what `sv add drizzle` generates, adjusted for `schema/` directory
- Whether `updated_at` uses a Drizzle `$onUpdateFn` or relies on application logic (Drizzle ORM v0.28+ has `.$onUpdateFn()` support)
- Specific Drizzle table definition style (using `pgTable` with typed columns)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

</user_constraints>

---

<phase_requirements>

## Phase Requirements

| ID    | Description                                                                                | Research Support                                                           |
| ----- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| DB-01 | PostgreSQL 17 service in docker-compose.yml with named volume and health check             | Already satisfied by Phase 2. Phase 4 does NOT touch docker-compose.yml.   |
| DB-02 | `postgres.js` driver installed and configured as the PostgreSQL client                     | `sv add drizzle` installs postgres@^3.x; verified current version is 3.4.9 |
| DB-03 | Drizzle ORM configured with `drizzle.config.ts` pointing to `src/lib/server/db/schema/`    | `defineConfig` with `schema: './src/lib/server/db/schema/*'`               |
| DB-04 | Initial Drizzle schema file with at least one example table demonstrating the pattern      | `posts` table with pgEnum, uuid PK, timestamptz columns                    |
| DB-05 | First migration generated and committed to `drizzle/` directory                            | `pnpm run db:generate` produces `drizzle/*.sql` + `drizzle/meta/`          |
| DB-06 | drizzle-kit scripts in `package.json`: `db:generate`, `db:migrate`, `db:push`, `db:studio` | All four confirmed as valid drizzle-kit CLI commands                       |
| DB-07 | Database client singleton in `src/lib/server/db/index.ts` (module-level, not per-request)  | Module-level `postgres()` + `drizzle({ client })` export pattern           |

</phase_requirements>

---

## Summary

Phase 4 installs and configures Drizzle ORM on top of the PostgreSQL 17 instance already running from Phase 2. The work is scoped to: installing packages via `sv add drizzle`, restructuring the generated schema into a `schema/` subdirectory, authoring the `posts` table with UUIDv7 primary key and pgEnum status column, writing `drizzle.config.ts`, wiring the DB client singleton to the existing validated env module, adding four `db:*` scripts to `package.json`, and generating + committing the first migration.

The scaffolded output from `sv add drizzle` provides the correct starting pattern but must be adjusted: (1) the `DATABASE_URL` source must be `$lib/server/env` not a raw `process.env` reference, (2) the schema must live in `schema/posts.ts` not a flat `schema.ts`, and (3) `drizzle.config.ts` must use a glob pointing to `src/lib/server/db/schema/`. The `uuidv7` package (v1.2.1) provides the UUIDv7 generator function used in `$defaultFn`.

**Primary recommendation:** Run `sv add drizzle` first to get the correct scaffold, then surgically apply each of the D-01..D-14 decisions as targeted edits.

---

## Standard Stack

### Core

| Library     | Version  | Purpose                               | Why Standard                                                    |
| ----------- | -------- | ------------------------------------- | --------------------------------------------------------------- |
| drizzle-orm | ^0.45.2  | ORM / query builder                   | Project constraint; type-safe SQL, zero runtime overhead        |
| drizzle-kit | ^0.31.10 | Migration CLI (generate/migrate/push) | Companion to drizzle-orm; generates SQL from TypeScript schema  |
| postgres    | ^3.4.9   | PostgreSQL driver (postgres.js)       | Project constraint; fastest ESM-native Node.js PG driver        |
| uuidv7      | ^1.2.1   | UUIDv7 generation at runtime          | Locked decision D-04; time-ordered, sortable, better DB indexes |

[VERIFIED: npm registry — versions confirmed 2026-04-06]

### Supporting

| Library | Version | Purpose                       | When to Use                               |
| ------- | ------- | ----------------------------- | ----------------------------------------- |
| zod     | ^4.3.6  | Env var validation (existing) | Already installed; validates DATABASE_URL |

### Alternatives Considered (per CLAUDE.md — do not revisit)

| Instead of  | Could Use     | Tradeoff                                                           |
| ----------- | ------------- | ------------------------------------------------------------------ |
| postgres.js | node-postgres | pg has CommonJS issues in ESM; forbidden in CLAUDE.md              |
| drizzle-orm | Prisma        | Heavy binary engine, slow cold starts; forbidden in CLAUDE.md      |
| uuidv7 pkg  | `uuid` v7     | Both valid; `uuidv7` is dedicated, smaller; `uuid` v13 also has v7 |

**Installation (packages not yet installed — none of drizzle-orm/drizzle-kit/postgres/uuidv7 are in package.json):**

```bash
pnpm add drizzle-orm postgres uuidv7
pnpm add -D drizzle-kit
```

Note: `sv add drizzle` runs this install automatically when scaffolding. Running manually is a fallback.

---

## Architecture Patterns

### Recommended Project Structure

```
src/lib/server/db/
├── index.ts              # DB client singleton — exports `db`
└── schema/
    ├── index.ts          # Re-exports all tables and enums (barrel file)
    └── posts.ts          # posts table + postStatusEnum

drizzle/
├── meta/
│   └── _journal.json     # Drizzle migration journal (auto-generated)
│   └── 0000_snapshot.json
└── 0000_initial.sql      # First migration SQL file (committed to git)

drizzle.config.ts         # Project root — drizzle-kit configuration
```

### Pattern 1: DB Client Singleton (`src/lib/server/db/index.ts`)

**What:** Module-level postgres.js client + drizzle instance, imported wherever DB access is needed.
**When to use:** Always. The module system guarantees a single instance per server process.

```typescript
// Source: https://orm.drizzle.team/docs/get-started/postgresql-new
// Adjusted per D-08: DATABASE_URL from validated env, not process.env directly
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '$lib/server/env';

const client = postgres(env.DATABASE_URL);
export const db = drizzle({ client });
```

**Key adjustment:** Import `env` from `$lib/server/env` (the Zod-validated singleton), not from `$env/dynamic/private` directly. This reuses the existing validation and avoids a duplicate import pattern.

### Pattern 2: drizzle.config.ts (project root)

```typescript
// Source: https://orm.drizzle.team/docs/drizzle-config-file [CITED]
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: './src/lib/server/db/schema/*',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

**Note:** `drizzle.config.ts` uses `process.env.DATABASE_URL` directly (not the SvelteKit env module) because drizzle-kit is a CLI tool that runs outside the SvelteKit server context — it cannot import `$lib/server/env`. The `!` non-null assertion is acceptable here because drizzle-kit is only run when the developer explicitly invokes the script (not at app startup). The DATABASE_URL is already validated at app startup via the env module.

### Pattern 3: Posts Schema (`src/lib/server/db/schema/posts.ts`)

```typescript
// Source: https://orm.drizzle.team/docs/column-types/pg [CITED]
import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';

export const postStatusEnum = pgEnum('post_status', ['draft', 'published', 'archived']);

export const posts = pgTable('posts', {
  id: uuid('id')
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  title: text('title').notNull(),
  body: text('body'),
  status: postStatusEnum('status').notNull().default('draft'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date()),
});
```

**Column notes:**

- `body` is nullable by default in Drizzle (no `.notNull()`) — supports draft posts with no body [VERIFIED: drizzle-orm column type docs]
- `postStatusEnum` generates a `CREATE TYPE post_status AS ENUM (...)` in the migration SQL
- `$onUpdateFn(() => new Date())` updates `updated_at` on every Drizzle ORM update call [VERIFIED: drizzle-orm column type docs]
- `withTimezone: true` ensures UTC storage and timezone-aware retrieval [VERIFIED: drizzle-orm pg column docs]

### Pattern 4: Schema Barrel File (`src/lib/server/db/schema/index.ts`)

```typescript
export * from './posts.js';
```

This allows `drizzle.config.ts` to use `./src/lib/server/db/schema/*` glob and `db/index.ts` to import schema from `./schema/index.js` if type inference is needed.

### Pattern 5: Package.json DB Scripts

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}
```

[VERIFIED: drizzle-kit CLI commands — https://orm.drizzle.team/docs/migrations]

### Anti-Patterns to Avoid

- **`import { env } from '$env/static/private'` in db/index.ts:** Bakes DATABASE_URL at build time — breaks Docker per-deployment env vars. CLAUDE.md explicitly forbids this.
- **`process.env.DATABASE_URL` in db/index.ts:** Bypasses Zod validation; fails silently if URL is missing. Use `$lib/server/env` instead.
- **Auto-migration on startup (D-13):** Never call `migrate()` in `hooks.server.ts` or at module load. Production race conditions and unclear error surfaces.
- **Flat schema.ts at root of `db/`:** Doesn't demonstrate the scalable pattern. Decision D-02 requires `schema/` subdirectory.
- **`drizzle.config.js` instead of `.ts`:** Project convention is TypeScript config files (see `knip.config.ts`).

---

## Don't Hand-Roll

| Problem                | Don't Build                                | Use Instead             | Why                                              |
| ---------------------- | ------------------------------------------ | ----------------------- | ------------------------------------------------ |
| PostgreSQL enum type   | `CHECK` constraint or string validation    | `pgEnum`                | Native PG enum; type-safe; enforced at DB level  |
| Timestamp defaults     | Application-level `new Date()` on insert   | `.defaultNow()`         | Database-level default; no app code path needed  |
| updated_at maintenance | Manual `updatedAt: new Date()` in app code | `.$onUpdateFn()`        | Automatic via Drizzle; can't forget to set it    |
| UUID generation        | `Math.random()` based IDs                  | `uuidv7` + `$defaultFn` | Time-ordered, globally unique, no collisions     |
| Migration tracking     | Custom migration table                     | `drizzle-kit migrate`   | Manages `drizzle_migrations` table automatically |

---

## Common Pitfalls

### Pitfall 1: drizzle.config.ts cannot use SvelteKit module aliases

**What goes wrong:** Attempting to `import { env } from '$lib/server/env'` in `drizzle.config.ts` throws a module resolution error because drizzle-kit runs as a plain Node.js process — it has no knowledge of SvelteKit's `$lib` alias.

**Why it happens:** `$lib` is a SvelteKit Vite alias resolved only during the SvelteKit build/dev process.

**How to avoid:** Use `process.env.DATABASE_URL!` in `drizzle.config.ts`. The db/index.ts (which runs inside SvelteKit) uses `$lib/server/env`.

**Warning signs:** `Cannot find module '$lib/server/env'` when running `pnpm run db:generate`.

---

### Pitfall 2: `sv add drizzle` generates schema at `src/lib/server/db/schema.ts` (flat file)

**What goes wrong:** The scaffolded output is a single `schema.ts` file, not the `schema/` directory pattern required by DB-03.

**Why it happens:** `sv add drizzle` uses a simple default structure that doesn't anticipate multi-domain projects.

**How to avoid:** After running `sv add drizzle`: (1) create `src/lib/server/db/schema/` directory, (2) move `posts` table to `schema/posts.ts`, (3) add `schema/index.ts` barrel, (4) delete the original `schema.ts`, (5) update `drizzle.config.ts` to point to `schema/*`.

**Warning signs:** `drizzle.config.ts` has `schema: './src/lib/server/db/schema.ts'` after scaffolding.

---

### Pitfall 3: `sv add drizzle` with `docker:yes` overwrites docker-compose.yml

**What goes wrong:** Running `sv add drizzle="database:postgresql+client:postgres.js+docker:yes"` regenerates or modifies `docker-compose.yml`, potentially removing the Aspire Dashboard service configured in Phase 2.

**Why it happens:** The `docker:yes` flag tells the CLI to generate a new docker-compose service block.

**How to avoid:** Decision D-01 specifies `docker:yes` is OMITTED. Run: `npx sv add drizzle="database:postgresql+client:postgres.js"`.

**Warning signs:** `docker-compose.yml` no longer has the `aspire-dashboard` service after running `sv add drizzle`.

---

### Pitfall 4: pgEnum must be exported from schema for migrations to detect it

**What goes wrong:** If `postStatusEnum` is defined but not exported, `drizzle-kit generate` may fail to detect it and won't generate the `CREATE TYPE` SQL statement.

**Why it happens:** drizzle-kit scans exported symbols from schema files.

**How to avoid:** Always `export const postStatusEnum = pgEnum(...)` (not `const postStatusEnum`). Include it in the barrel export.

---

### Pitfall 5: Migration fails if PostgreSQL is not running

**What goes wrong:** `pnpm run db:migrate` throws a connection error if Docker Compose is not running.

**Why it happens:** drizzle-kit connects to the live database to apply migrations.

**How to avoid:** Ensure `docker compose up -d` is run before any `db:*` commands. The success criteria for DB-05 requires PostgreSQL to be reachable.

---

## Code Examples

### Complete posts.ts schema

```typescript
// Source: https://orm.drizzle.team/docs/column-types/pg [CITED]
import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';

export const postStatusEnum = pgEnum('post_status', ['draft', 'published', 'archived']);

export const posts = pgTable('posts', {
  id: uuid('id')
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  title: text('title').notNull(),
  body: text('body'),
  status: postStatusEnum('status').notNull().default('draft'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date()),
});
```

### drizzle.config.ts (complete, project root)

```typescript
// Source: https://orm.drizzle.team/docs/drizzle-config-file [CITED]
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: './src/lib/server/db/schema/*',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### db/index.ts (complete)

```typescript
// Source: https://orm.drizzle.team/docs/get-started/postgresql-new [CITED], adjusted for project
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '$lib/server/env';

const client = postgres(env.DATABASE_URL);
export const db = drizzle({ client });
```

### Migration workflow commands

```bash
# Development: push schema directly (no SQL files, fast iteration)
pnpm run db:push

# Production path: generate SQL, commit, then apply
pnpm run db:generate     # creates drizzle/0000_initial.sql
pnpm run db:migrate      # applies pending migrations

# Inspect database visually
pnpm run db:studio
```

---

## State of the Art

| Old Approach                                      | Current Approach                        | When Changed       | Impact                                        |
| ------------------------------------------------- | --------------------------------------- | ------------------ | --------------------------------------------- |
| `drizzle-orm/postgres-js` with named import style | `drizzle({ client })` object style      | drizzle-orm v0.30+ | Cleaner, supports multiple schema registries  |
| `dotenv/config` import in config                  | `process.env` direct (no dotenv needed) | drizzle-kit v0.20+ | drizzle-kit reads .env automatically in dev   |
| UUIDv4 primary keys                               | UUIDv7 primary keys                     | 2023+              | Time-ordered, better B-tree index performance |

**Deprecated patterns confirmed absent from recommended approach:**

- `import 'dotenv/config'` in `drizzle.config.ts` — drizzle-kit reads `.env` automatically [ASSUMED — based on common usage; manual dotenv import is harmless if included]
- `pgTable('posts', { id: uuid('id').primaryKey().defaultRandom() })` — `defaultRandom()` generates UUIDv4 at DB level; use `$defaultFn(() => uuidv7())` for UUIDv7 at app level

---

## Assumptions Log

| #   | Claim                                                                                                 | Section                  | Risk if Wrong                                                                                                                 |
| --- | ----------------------------------------------------------------------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| A1  | `sv add drizzle` generates `src/lib/server/db/schema.ts` (flat) not `schema/` dir                     | Common Pitfalls #2       | Planner step "restructure schema" may be unnecessary — verify by running `sv add drizzle` in dry-run or inspecting CLI source |
| A2  | drizzle-kit reads `.env` automatically without `import 'dotenv/config'`                               | State of the Art         | If wrong, `drizzle.config.ts` needs `import 'dotenv/config'` added — low risk, harmless to add anyway                         |
| A3  | `sv add drizzle` does NOT add `db:*` scripts to `package.json` automatically (must be added manually) | Architecture Patterns #5 | If wrong, scripts may already exist after scaffolding — check before re-adding                                                |

---

## Open Questions (RESOLVED)

1. **Does `sv add drizzle` scaffold a `schema/index.ts` barrel or only `schema.ts`?**
   - What we know: CLI doc page doesn't show exact generated file contents
   - What's unclear: Whether the barrel file needs to be created manually
   - **RESOLVED:** Plan handles both outcomes — Task 2 of 04-01 creates `schema/index.ts` barrel regardless and deletes the flat `schema.ts` if present. Both scaffold outcomes are covered by defensive task design.

2. **Does `sv add drizzle` add `db:*` package.json scripts automatically?**
   - What we know: The CLI is designed to set up a working Drizzle integration
   - What's unclear: Whether script injection is part of the adder
   - **RESOLVED:** Plan handles both outcomes — Task 3 of 04-01 verifies the four scripts exist and adds any missing ones; it is a no-op if the scaffold already added them. Both scaffold outcomes are covered by defensive task design.

---

## Environment Availability

| Dependency | Required By                           | Available  | Version              | Fallback                          |
| ---------- | ------------------------------------- | ---------- | -------------------- | --------------------------------- |
| Docker     | PostgreSQL for migrations/push/studio | Yes        | 29.3.1               | —                                 |
| PostgreSQL | db:migrate, db:push, db:studio        | Via Docker | 17 (when compose up) | Start with `docker compose up -d` |
| Node.js    | drizzle-kit CLI                       | Yes        | 22 LTS               | —                                 |
| pnpm       | Package installation                  | Yes        | 10.33.0              | —                                 |

**Missing dependencies with no fallback:** None.

**Prerequisite for db:migrate / db:push / db:studio:** `docker compose up -d` must be run first. The Planner should include this as a prerequisite check step or a Wave 0 setup note.

---

## Validation Architecture

### Test Framework

| Property           | Value                                                   |
| ------------------ | ------------------------------------------------------- |
| Framework          | Vitest ^4.1.2                                           |
| Config file        | `vite.config.ts` (`test.include: ['src/**/*.test.ts']`) |
| Quick run command  | `pnpm run test:unit`                                    |
| Full suite command | `pnpm run test:unit && pnpm run test:e2e`               |

### Phase Requirements → Test Map

| Req ID | Behavior                                         | Test Type    | Automated Command                  | File Exists? |
| ------ | ------------------------------------------------ | ------------ | ---------------------------------- | ------------ |
| DB-02  | postgres.js driver installed and importable      | Unit (smoke) | `pnpm run test:unit`               | ❌ Wave 0    |
| DB-03  | drizzle.config.ts points to schema/ directory    | Manual check | Verify file contents post-scaffold | N/A          |
| DB-04  | posts table schema has correct columns and types | Unit         | `pnpm run test:unit`               | ❌ Wave 0    |
| DB-05  | Migration SQL file exists in drizzle/            | Manual check | `ls drizzle/*.sql`                 | N/A          |
| DB-06  | All 4 db:\* scripts in package.json              | Manual check | Verify package.json scripts        | N/A          |
| DB-07  | DB client singleton exports `db` at module level | Unit         | `pnpm run test:unit`               | ❌ Wave 0    |

**Note on DB tests:** Unit tests for the schema (type inference, column structure) do not require a live database. Tests for the client singleton (`db/index.ts`) are lightweight module-import tests that verify the export exists — the actual connection is tested via `pnpm run db:push` or `pnpm run db:studio` (manual smoke).

### Sampling Rate

- **Per task commit:** `pnpm run test:unit`
- **Per wave merge:** `pnpm run test:unit`
- **Phase gate:** `pnpm run test:unit` green + `pnpm run db:migrate` applies cleanly + `pnpm run db:studio` opens

### Wave 0 Gaps

- [ ] `src/lib/server/db/schema/posts.test.ts` — covers DB-04 (schema shape unit test)
- [ ] `src/lib/server/db/index.test.ts` — covers DB-07 (client singleton export test, no live connection required)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category         | Applies | Standard Control                                           |
| --------------------- | ------- | ---------------------------------------------------------- |
| V2 Authentication     | No      | —                                                          |
| V3 Session Management | No      | —                                                          |
| V4 Access Control     | No      | —                                                          |
| V5 Input Validation   | Yes     | Drizzle typed queries; zod env validation for DATABASE_URL |
| V6 Cryptography       | No      | —                                                          |

### Known Threat Patterns for Drizzle + postgres.js

| Pattern             | STRIDE          | Standard Mitigation                                                                               |
| ------------------- | --------------- | ------------------------------------------------------------------------------------------------- |
| SQL injection       | Tampering       | Drizzle query builder uses parameterized queries automatically [CITED: drizzle-orm]               |
| Credential exposure | Info Disclosure | DATABASE_URL in env only; not committed to git; validated by Zod at startup                       |
| Client-side leak    | Info Disclosure | `src/lib/server/db/` is server-only; SvelteKit enforces `$lib/server` is never bundled for client |

---

## Sources

### Primary (HIGH confidence)

- [CITED: https://orm.drizzle.team/docs/get-started/postgresql-new] — postgres.js driver setup, client singleton pattern, migration commands
- [CITED: https://orm.drizzle.team/docs/drizzle-config-file] — defineConfig, schema glob, out directory, dbCredentials
- [CITED: https://orm.drizzle.team/docs/column-types/pg] — uuid, text, timestamp with timezone, pgEnum, $defaultFn, $onUpdateFn
- [CITED: https://orm.drizzle.team/docs/migrations] — push vs migrate workflow
- [VERIFIED: npm registry 2026-04-06] — drizzle-orm@0.45.2, drizzle-kit@0.31.10, postgres@3.4.9, uuidv7@1.2.1

### Secondary (MEDIUM confidence)

- [CITED: https://svelte.dev/docs/cli/drizzle] — sv add drizzle CLI options and generated file structure (page lacks exact file contents)

### Tertiary (LOW confidence)

- WebSearch results on `uuidv7` npm + drizzle `$defaultFn` pattern — confirmed the `import { uuidv7 } from 'uuidv7'` usage; cross-referenced with drizzle-orm $defaultFn docs

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all package versions verified against npm registry 2026-04-06
- Architecture: HIGH — drizzle.config.ts and db/index.ts patterns verified against official Drizzle docs
- Posts schema: HIGH — all column APIs (uuid, pgEnum, timestamp, $defaultFn, $onUpdateFn) verified against official Drizzle column type docs
- sv add drizzle output: MEDIUM — CLI docs describe behavior but don't show exact generated file contents; assumptions A1 and A3 flag specific unknowns

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (stable domain; drizzle-orm releases frequently but v0.45.x API is stable)
