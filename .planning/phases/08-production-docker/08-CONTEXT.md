# Phase 8: Production Docker - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Create a production-ready multi-stage Dockerfile for the SvelteKit app, add a dedicated production docker-compose file (app + postgres, no dev tooling), and do a full audit update of CLAUDE.md to reflect the finalized project state after all phases are complete.

The existing `docker-compose.yml` (dev-only: postgres + aspire dashboard) is left unchanged — it is not the target of this phase.

</domain>

<decisions>
## Implementation Decisions

### Docker Compose — Dev vs Production Split

- **D-01:** The existing `docker-compose.yml` at the project root is **dev-only** and stays unchanged. It runs PostgreSQL + Aspire Dashboard with `env_file: .env.development` (committed safe defaults). No production app container.
- **D-02:** A new **`docker/docker-compose.prod.yml`** file is created for production deployment. It includes:
  - The SvelteKit application container (built from `docker/Dockerfile`)
  - PostgreSQL
  - **NOT** Aspire Dashboard (dev tool — not appropriate for production)
- **D-03:** The production compose uses `env_file: .env` for all secrets. `.env` is gitignored. `.env.example` documents what is required.

### Dockerfile

- **D-04:** Dockerfile lives at `docker/Dockerfile`. Build command: `docker build -f docker/Dockerfile .`
- **D-05:** Multi-stage build with 3 stages:
  1. **deps** — install all dependencies (including devDependencies needed for build)
  2. **builder** — run `pnpm run build` (produces `build/` via adapter-node)
  3. **runtime** — slim final image: copy only `build/` and production `node_modules`
- **D-06:** Runtime base image: **`node:22-alpine`**. Target image size <200MB (typically ~130-150MB with alpine).
- **D-07:** App runs as a **non-root user** (conventional name: `node`). Create user in runtime stage, set file ownership, use `USER node`.
- **D-08:** Include a **`HEALTHCHECK`** instruction pointing to `/api/health`. Requires `curl` installed in the alpine image. Format: `HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD curl -f http://localhost:3000/api/health || exit 1`
- **D-09:** Default `PORT` is 3000 (adapter-node default). Expose port 3000 in Dockerfile.

### Environment Variables in Production

- **D-10:** The production app needs `DATABASE_URL`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_SERVICE_NAME`, `LOG_LEVEL` at runtime. These come from `env_file: .env` in `docker/docker-compose.prod.yml`.
- **D-11:** `NODE_ENV=production` set in the Dockerfile or compose file.

### CLAUDE.md Update

- **D-12:** Full audit update — not just Docker additions. Review the entire CLAUDE.md against the finalized codebase after 7 phases of development:
  - Add `docker/` folder to the folder structure section (Dockerfile + docker-compose.prod.yml)
  - Add Docker build and production deployment commands
  - Verify all `pnpm run *` scripts are documented and accurate
  - Add any conventions that emerged during phases 2-7 but aren't yet in CLAUDE.md
  - Update "Conventions" section (currently says "not yet established") with patterns that solidified during development (Svelte 5 runes, `$lib/server/` boundary, env validation pattern, etc.)
  - Keep the existing structure — don't reorganize, just fill gaps and add missing items

### Claude's Discretion

- `.dockerignore` contents (exclude `node_modules`, `.planning`, `.git`, test files, `.env*` except via env_file)
- Exact pnpm version pinning in the build stage
- Multi-stage caching strategy (order of COPY instructions to maximize layer cache)
- Service names in docker-compose.prod.yml (e.g., `app`, `postgres`)
- Volume naming in production compose

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements

- `.planning/REQUIREMENTS.md` §Dev Infrastructure — DOCK-02, DOCK-03, DOCK-04 (exact acceptance criteria for this phase)

### Existing Docker configuration

- `docker-compose.yml` — Dev compose to leave unchanged (understand existing service config, port mappings, volume names)
- `.env.development` — Dev env file (committed, safe defaults used by current compose)
- `.env.example` — Documents all env vars (required + optional); production `.env` follows this template

### Application build output

- `svelte.config.js` — `adapter-node` config (understand what `build/` output looks like)
- `package.json` §scripts — `pnpm run build` is the build command; verify output structure
- `CLAUDE.md` — Current content to audit and update (read entire file before making changes)

### Phase 2 decisions (Docker infrastructure)

- `.planning/phases/02-dev-infrastructure-ai-agent/02-CONTEXT.md` — D-07, D-08: original docker-compose decisions

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `docker-compose.yml` — The postgres service definition (image: postgres:17-alpine, healthcheck, volume) can be copied into docker-compose.prod.yml with `.env` substitution
- `.env.example` — Already lists all required env vars; the production `.env` template is essentially this file

### Established Patterns

- `adapter-node` outputs a standalone Node server in `build/` — the Dockerfile should copy `build/` and run `node build` (or `node build/index.js`)
- App uses `$env/dynamic/private` (not `$env/static/private`) so env vars are resolved at runtime — this is correct for Docker/env_file approach
- Health check endpoint exists at `/api/health` (from Phase 7) — ready to be wired into HEALTHCHECK

### Integration Points

- `docker/Dockerfile` is the new artifact; `docker/docker-compose.prod.yml` references it via `build: { context: .., dockerfile: docker/Dockerfile }`
- `CLAUDE.md` gets a new "Docker" or "Deployment" section and folder structure entry
- `docker-compose.yml` (dev) stays unchanged — no integration needed

</code_context>

<specifics>
## Specific Ideas

- "The existing docker-compose.yml is for development only — it should not build the application at all, only run the dev dependencies."
- "A dedicated docker-compose file should be created for deployment: with application + DB, and without Aspire Dashboard since it is a dev tool."
- Production Dockerfile path per ROADMAP success criteria: `docker/Dockerfile` (not root-level `Dockerfile`)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

_Phase: 08-production-docker_
_Context gathered: 2026-04-12_
