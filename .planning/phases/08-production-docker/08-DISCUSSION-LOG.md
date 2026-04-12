# Phase 8: Production Docker - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the discussion.

**Date:** 2026-04-12
**Phase:** 08-production-docker
**Mode:** discuss
**Areas analyzed:** Compose env approach, Runtime base image, CLAUDE.md update scope

## Gray Areas Discussed

### Compose env approach

| Question                                                       | Selected                              | Notes                                                                                        |
| -------------------------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------- |
| How should docker-compose.yml reference environment variables? | Keep .env.development + add .env docs | User clarified the current compose is dev-only                                               |
| Dev vs prod split — does .env.development satisfy DOCK-04?     | Separate production compose file      | User decision: dev compose stays dev-only; new docker/docker-compose.prod.yml for production |
| Production compose naming and location                         | docker/docker-compose.prod.yml        | Lives in docker/ alongside Dockerfile                                                        |
| Production compose env var approach                            | env_file: .env (gitignored)           | .env.example documents required vars                                                         |

**Key insight from user:** The current `docker-compose.yml` should remain dev-only (postgres + aspire, no app container). A separate `docker/docker-compose.prod.yml` should be created for production deployment with the SvelteKit app + postgres, without Aspire Dashboard (dev tool only).

### Runtime base image

| Question                            | Selected       | Notes                               |
| ----------------------------------- | -------------- | ----------------------------------- |
| Which base image for runtime stage? | node:22-alpine | Smallest, hits <200MB target easily |
| Include HEALTHCHECK in Dockerfile?  | Yes            | Points to /api/health, uses curl    |

### CLAUDE.md update scope

| Question                                          | Selected                       | Notes                                                                         |
| ------------------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------- |
| How comprehensive should the CLAUDE.md update be? | Full audit — update everything | Add docker/ folder, Docker commands, finalize all conventions from phases 1-7 |

## Corrections Made

No corrections — all assumptions confirmed or user provided more specific direction (dev/prod compose split).

## Key Architectural Decision

The user clarified that docker-compose.yml's purpose is dev infrastructure only. This means:

- The existing file is correct and complete for its purpose
- DOCK-04 ("references .env for all secrets") is satisfied by the _production_ compose file, not the dev one
- The dev file uses `.env.development` with committed safe defaults — not real secrets
