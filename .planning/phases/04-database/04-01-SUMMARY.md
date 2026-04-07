---
phase: 04-database
plan: "01"
subsystem: database
tags: [drizzle-orm, postgres-js, uuidv7, drizzle-kit, postgresql, schema]

requires:
  - phase: 02-infrastructure
    provides: PostgreSQL 17 in docker-compose.yml with named volume and health check
  - phase: 02-infrastructure
    provides: src/lib/server/env — Zod-validated env module with DATABASE_URL

provides:
  - Drizzle ORM and postgres.js driver installed as runtime dependencies
  - posts schema with UUIDv7 PK, pgEnum status, timestamptz columns
  - DB client singleton at src/lib/server/db/index.ts wired to validated env
  - drizzle.config.ts at project root with schema/* glob and postgresql dialect
  - All four db:* scripts in package.json

affects: [05-observability, 07-testing, 08-production-docker]

tech-stack:
  added:
    - drizzle-orm ^0.45.1 (runtime dependency)
    - postgres ^3.4.8 (runtime dependency — postgres.js driver)
    - uuidv7 ^1.2.1 (runtime dependency — UUIDv7 generation)
    - drizzle-kit ^0.31.8 (devDependency — migration CLI)
  patterns:
    - DB client singleton via module-level postgres() + drizzle({ client }) export
    - Schema-per-domain directory at src/lib/server/db/schema/
    - Validated env import pattern — db client uses $lib/server/env not $env/dynamic/private
    - drizzle.config.ts uses process.env directly (CLI context, no $lib alias available)

key-files:
  created:
    - src/lib/server/db/schema/posts.ts
    - src/lib/server/db/schema/index.ts
    - drizzle.config.ts
  modified:
    - src/lib/server/db/index.ts (rewritten from scaffold)
    - package.json (deps moved to correct location, uuidv7 added)
    - knip.config.ts (db/index.ts added to ignore list)
    - vite.config.ts (defineConfig import fixed)
    - .prettierignore (/drizzle/ added)
    - pnpm-workspace.yaml (onlyBuiltDependencies for esbuild)

key-decisions:
  - "drizzle-orm and postgres moved to runtime dependencies (not devDependencies) — needed at runtime not just build time"
  - "DB client imports env from $lib/server/env (Zod-validated) not $env/dynamic/private directly"
  - "drizzle.config.ts uses process.env directly — CLI tool runs outside SvelteKit Vite context"
  - "db/index.ts added to knip ignore — foundational starter export, no callers yet"
  - "vite.config.ts fixed to use vitest/config defineConfig — pre-existing bug blocking pnpm run check"

patterns-established:
  - "Schema directory pattern: src/lib/server/db/schema/{domain}.ts with barrel index.ts"
  - "Validated env usage: always import from $lib/server/env in server-side code"
  - "UUIDv7 primary key: uuid column + .$defaultFn(() => uuidv7()) for time-ordered IDs"
  - "pgEnum for typed status fields: postStatusEnum with draft/published/archived values"
  - "Updated_at automation: .$onUpdateFn(() => new Date()) instead of manual app-level sets"

requirements-completed: [DB-02, DB-03, DB-04, DB-06, DB-07]

duration: 4min
completed: 2026-04-07
---

# Phase 4 Plan 01: Database Scaffold Summary

**Drizzle ORM scaffolded with postgres.js driver, posts schema with UUIDv7 PK and pgEnum status column, DB client singleton wired to Zod-validated env, and drizzle.config.ts with schema/* glob**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-07T15:45:56Z
- **Completed:** 2026-04-07T15:49:17Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments

- Drizzle ORM, postgres.js, uuidv7, and drizzle-kit installed in correct dependency sections
- posts table schema with all required columns: UUIDv7 PK, title, nullable body, pgEnum status, timestamptz created_at/updated_at with $onUpdateFn
- DB client singleton using validated env (not raw process.env), in server-only location enforced by SvelteKit
- drizzle.config.ts at project root with schema/* glob ready for multi-domain schema expansion
- All four db:* scripts present in package.json (added by sv add drizzle scaffold)

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Drizzle via sv add and install uuidv7** - `b397513` (chore)
2. **Task 2: Create posts schema, DB client singleton, and drizzle.config.ts** - `a75f7fa` (feat)
3. **Task 3: Add db:* scripts to package.json** - verification-only no-op (scripts already added by scaffold)

## Files Created/Modified

- `src/lib/server/db/schema/posts.ts` - posts table + postStatusEnum (UUIDv7 PK, pgEnum, timestamptz columns)
- `src/lib/server/db/schema/index.ts` - barrel re-export of all schema symbols
- `src/lib/server/db/index.ts` - DB client singleton using postgres.js + drizzle, imports from $lib/server/env
- `drizzle.config.ts` - drizzle-kit config: schema glob, postgresql dialect, out ./drizzle
- `package.json` - drizzle-orm/postgres moved to deps, uuidv7 added, db:* scripts from scaffold
- `knip.config.ts` - db/index.ts added to ignore list (foundational export)
- `vite.config.ts` - defineConfig import fixed from 'vite' to 'vitest/config'
- `.prettierignore` - /drizzle/ added to exclude migration SQL files from formatting
- `pnpm-workspace.yaml` - onlyBuiltDependencies: [esbuild] added for drizzle-kit compatibility

## Decisions Made

- **drizzle-orm and postgres as runtime deps:** sv add drizzle placed them in devDependencies, but they are needed at runtime (server process imports them), so moved to dependencies.
- **knip ignore for db/index.ts:** No app code imports the DB client yet in this starter template. Added to ignore list rather than marking as unused — the export is intentional and foundational.
- **vite.config.ts fix:** Pre-existing bug — `defineConfig` from `vite` does not include the `test` property type. Fixed to import from `vitest/config` which re-exports all vite types plus the test configuration types.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed vite.config.ts defineConfig import blocking pnpm run check**
- **Found during:** Task 2 (running pnpm run check acceptance check)
- **Issue:** `vite.config.ts` imported `defineConfig` from `vite` but used a `test` property — TypeScript error "Object literal may only specify known properties, and 'test' does not exist in type 'UserConfigExport'"
- **Fix:** Changed import to `defineConfig` from `vitest/config` which includes Vitest test config types
- **Files modified:** `vite.config.ts`
- **Verification:** `pnpm run check` exits 0 with 0 errors after fix
- **Committed in:** a75f7fa (Task 2 commit)

**2. [Rule 2 - Missing Critical] Moved drizzle-orm and postgres to runtime dependencies**
- **Found during:** Task 1 (inspecting sv add drizzle output)
- **Issue:** sv add drizzle placed drizzle-orm and postgres in devDependencies — but these are imported at runtime by the Node server (not just at build time). Production Docker images built with `--production` flag would exclude devDependencies and cause import failures.
- **Fix:** Moved drizzle-orm and postgres to dependencies in package.json; ran pnpm install to sync lockfile
- **Files modified:** `package.json`, `pnpm-lock.yaml`
- **Verification:** Both packages present in `dependencies` section; `node -e "require.resolve()"` confirms resolution
- **Committed in:** b397513 (Task 1 commit)

**3. [Rule 2 - Missing Critical] Added db/index.ts to knip ignore list**
- **Found during:** Task 2 (running pnpm run knip acceptance check)
- **Issue:** knip flagged `src/lib/server/db/index.ts` as unused file — correct finding since no app code imports `db` yet in a fresh starter template
- **Fix:** Added `src/lib/server/db/index.ts` to the `ignore` array in `knip.config.ts` with explanatory comment
- **Files modified:** `knip.config.ts`
- **Verification:** `pnpm run knip` exits 0 after fix
- **Committed in:** a75f7fa (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (1 bug, 2 missing critical)
**Impact on plan:** All auto-fixes necessary for correctness. No scope creep. The vite.config.ts fix resolves a pre-existing type error that would block all future `pnpm run check` runs.

## Issues Encountered

- sv add drizzle prompted interactively about docker and answered "Yes" despite docker:yes being omitted from the CLI args. The docker-compose.yml was NOT modified (aspire-dashboard service preserved) — the scaffold only added a `db:start` script pointing to `docker compose up`. This extra script is harmless and left in place.

## User Setup Required

None - no external service configuration required. PostgreSQL runs locally via `docker compose up` from Phase 2.

## Next Phase Readiness

- All Drizzle ORM infrastructure is in place: schema, client, config, scripts
- Next plan (04-02) can generate and apply the first migration against the running PostgreSQL instance using `pnpm run db:generate` then `pnpm run db:migrate`
- Phase 5 (Observability): OTEL auto-instrumentation for postgres.js will pick up the DB client automatically — no changes to DB layer needed
- Phase 7 (Testing): `src/lib/server/db/index.ts` ready for import in DB-related unit tests

## Known Stubs

None — the posts schema is a complete, wirable implementation. No placeholder data or TODO markers.

---
*Phase: 04-database*
*Completed: 2026-04-07*
