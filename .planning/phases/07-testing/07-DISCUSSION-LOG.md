# Phase 7: Testing - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the discussion.

**Date:** 2026-04-11
**Phase:** 07-testing
**Mode:** discuss
**Areas discussed:** Component test setup, What component to test, API health test approach, E2E smoke test scope

## Gray Areas Presented

| Area                     | Description                                                                  |
| ------------------------ | ---------------------------------------------------------------------------- |
| Component test setup     | vite.config.ts uses environment: 'node' globally; component tests need jsdom |
| What component to test   | TEST-02 requires at least one component test — which component?              |
| API health test approach | GET /api/health does SELECT 1 — real DB, mock, or testcontainer?             |
| E2E smoke test scope     | Existing demo E2E test + TEST-05 asks for app render + nav smoke test        |

## Decisions Made

### Component test setup

- **Question:** How to configure dual environments in Vitest?
- **Decision:** Vitest workspaces — two named projects in vite.config.ts: `unit` (node) and `component` (jsdom)
- **Reason:** Clean separation; each project runs its own environment without per-file annotations

### What component to test

- **Question:** Which component for the TEST-02 example?
- **Decision:** Small dedicated demo component (e.g., StackBadge.svelte) created specifically as the test target
- **Reason:** Keeps tests decoupled from page/layout structure; won't break if pages change

### API health test approach

- **Question:** How to provide the database for the health check integration test?
- **User answer (custom):** "I want to use a test container for the integration tests"
- **Resolved to:** `@testcontainers/postgresql` — spins up a throwaway Postgres container per test run
- **Reason:** Self-contained tests that don't depend on docker compose postgres being up

### E2E smoke test scope

- **Question:** What E2E coverage beyond the existing demo test?
- **Decision:** New `smoke.e2e.ts` — loads home page, checks app renders, verifies nav links visible/clickable
- **Reason:** TEST-05 specifically calls out "nav works" smoke test; existing demo test remains as a colocation example

## What Was Already Decided (Prior Phases)

- pnpm as package manager (Phase 1)
- TypeScript strict mode everywhere (Phase 1)
- Vitest already installed and configured (Phase 4 — vite.config.ts fixed to use vitest/config)
- One server unit test already exists: env/index.test.ts (Phase 2)
- Playwright already configured (Phase 1 scaffold)
- Health endpoint at /api/health with real pg SELECT 1 (Phase 5)

## No Scope Creep Noted

Discussion stayed within TEST-01 through TEST-06 phase boundary.
