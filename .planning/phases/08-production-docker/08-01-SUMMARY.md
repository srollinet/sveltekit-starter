---
phase: 08-production-docker
plan: "01"
subsystem: docker
tags: [docker, production, deployment, security]
dependency_graph:
  requires: []
  provides: [production-docker-image, production-compose]
  affects: [deployment]
tech_stack:
  added: []
  patterns: [multi-stage-docker-build, non-root-container-user, build-arg-for-env-validation]
key_files:
  created:
    - docker/Dockerfile
    - docker/docker-compose.prod.yml
    - .dockerignore
  modified:
    - .env.example
decisions:
  - "Pass DATABASE_URL as build ARG with placeholder value so Zod env validation passes at build time; actual value injected at runtime via env_file"
  - "Use pnpm prune --prod --ignore-scripts to prevent husky prepare hook running in Alpine where it is unavailable"
  - "Use postgres_prod_data volume name (distinct from dev postgres_data) to avoid data conflicts"
metrics:
  duration: "~15 minutes"
  completed: "2026-04-12T13:15:55Z"
  tasks_completed: 3
  files_changed: 4
---

# Phase 8 Plan 1: Production Docker Packaging Summary

**One-liner:** Multi-stage production Dockerfile on node:22-alpine with non-root user, Zod build-arg fix, pnpm prune, and production docker-compose using env_file for all secrets.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create .dockerignore and multi-stage production Dockerfile | 5efade0 | .dockerignore, docker/Dockerfile |
| 2 | Create production docker-compose and update .env.example | bafcbb2 | docker/docker-compose.prod.yml, .env.example |
| 3 | Verify Docker build produces working image under 200MB | 4664474 | docker/Dockerfile (bug fixes) |

## Verification Results

- `docker build -f docker/Dockerfile .` exits 0
- Image size: 172MB (under 200MB limit)
- `docker run --rm <image> whoami` returns `node`
- `docker inspect --format='{{json .Config.Healthcheck}}'` contains `curl -f http://localhost:3000/api/health`
- `docker run --rm <image> sh -c 'echo $NODE_ENV'` returns `production`
- No hardcoded passwords in docker/docker-compose.prod.yml
- Dev docker-compose.yml is unchanged

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Zod env validation fails at Docker build time**
- **Found during:** Task 3 (first build attempt)
- **Issue:** `src/lib/server/env/index.ts` runs `envSchema.safeParse(rawEnv)` at module evaluation time. During `pnpm run build`, vite/SvelteKit evaluates server modules, which triggers the Zod validation. `DATABASE_URL` has no value in the Docker build context (correctly excluded by .dockerignore / never baked into image), causing `process.exit(1)`.
- **Fix:** Added `ARG DATABASE_URL=postgres://placeholder:placeholder@localhost:5432/placeholder` before the build step, then passed it inline: `RUN DATABASE_URL=${DATABASE_URL} pnpm run build`. The placeholder satisfies the URL format check; the actual value is injected at runtime via env_file. The ARG value does NOT persist into the runtime stage.
- **Files modified:** docker/Dockerfile
- **Commit:** 4664474

**2. [Rule 1 - Bug] `pnpm prune --prod` fails in Alpine (husky prepare hook)**
- **Found during:** Task 3 (second build attempt after fixing DATABASE_URL)
- **Issue:** `pnpm prune --prod` runs lifecycle scripts including the `prepare` script, which invokes `husky`. Husky is not installed in the Alpine runtime image (it's a devDependency that was just pruned), so the command fails with `sh: husky: not found`.
- **Fix:** Changed to `pnpm prune --prod --ignore-scripts` to skip lifecycle hooks during the prune operation.
- **Files modified:** docker/Dockerfile
- **Commit:** 4664474

## Known Stubs

None.

## Threat Flags

No new threat surface introduced beyond what the plan's threat model covers. All mitigations applied:

| Threat | Status | Evidence |
|--------|--------|----------|
| T-08-01: .env baked into image | Mitigated | .dockerignore excludes .env, .env.*; DATABASE_URL build ARG uses placeholder only |
| T-08-02: Root user in container | Mitigated | USER node in runtime stage; verified with `whoami` returning `node` |
| T-08-03: Hardcoded passwords in compose | Mitigated | All secrets via env_file: ../.env; no literal values in docker-compose.prod.yml |
| T-08-05: Non-reproducible deps | Mitigated | --frozen-lockfile in deps stage |

## Self-Check: PASSED
