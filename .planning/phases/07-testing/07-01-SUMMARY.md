---
phase: 07-testing
plan: "01"
subsystem: testing
tags: [vitest, workspaces, component-testing, testing-library, jsdom, knip]
dependency_graph:
  requires: []
  provides: [vitest-workspace-config, component-test-pattern, jsdom-environment]
  affects: [vite.config.ts, knip.config.ts]
tech_stack:
  added: [jsdom, testcontainers, "@testcontainers/postgresql"]
  patterns: [vitest-workspace-projects, testing-library-svelte-render, jest-dom-matchers]
key_files:
  created:
    - vitest-setup.ts
    - src/lib/components/StackBadge.svelte
    - src/lib/components/StackBadge.svelte.test.ts
  modified:
    - vite.config.ts
    - knip.config.ts
    - package.json
    - pnpm-lock.yaml
decisions:
  - "Vitest workspace projects use exclude on unit project to prevent glob overlap with *.svelte.test.ts"
  - "jsdom removed from knip ignoreDependencies — knip detects it via vite.config.ts environment config"
  - "@testcontainers/postgresql added to knip ignoreDependencies — installed for plan 07-02 but not yet imported"
metrics:
  duration: "~5 min"
  completed: "2026-04-12"
  tasks_completed: 3
  files_changed: 7
---

# Phase 07 Plan 01: Vitest Workspace Infrastructure Summary

Vitest workspace config (unit/node + component/jsdom) with StackBadge demo component test using @testing-library/svelte render() pattern and toBeInTheDocument() matchers.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install deps and migrate Vitest to workspace projects | f3fd894 | package.json, pnpm-lock.yaml, vite.config.ts, vitest-setup.ts |
| 2 | Create StackBadge component and component test | 320b38a | src/lib/components/StackBadge.svelte, src/lib/components/StackBadge.svelte.test.ts, vite.config.ts |
| 3 | Update knip config to remove stale testing-library ignores | ce00297 | knip.config.ts |

## Verification

- `pnpm test:unit` exits 0 — 7 tests pass (3 unit in node + 4 component in jsdom)
- `pnpm knip` exits 0 — zero issues
- vite.config.ts contains `projects:` with `name: 'unit'` and `name: 'component'`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added exclude to unit project to prevent glob overlap**
- **Found during:** Task 2
- **Issue:** `src/**/*.test.ts` matches `*.svelte.test.ts` because the filename ends in `.test.ts`. Without an explicit exclude on the unit project, component tests ran in the node environment and failed with `document is not defined`.
- **Fix:** Added `exclude: ['src/**/*.svelte.test.ts']` to the unit project config in vite.config.ts.
- **Files modified:** vite.config.ts
- **Commit:** 320b38a
- **Note:** Plan D-02 said "Remove the exclude line — workspace routing handles it." In Vitest v4, glob patterns are evaluated independently per project, so overlap must be excluded explicitly.

**2. [Rule 1 - Bug] jsdom removed from knip ignoreDependencies**
- **Found during:** Task 3
- **Issue:** When jsdom was added to ignoreDependencies, knip reported a `Configuration hints` warning: "Remove from ignoreDependencies" because knip already detects jsdom via the vite.config.ts `environment: 'jsdom'` setting. Having it in ignoreDependencies caused a non-zero exit code.
- **Fix:** Removed `jsdom` from ignoreDependencies (knip handles it natively).
- **Files modified:** knip.config.ts
- **Commit:** ce00297

**3. [Rule 2 - Missing] Added @testcontainers/postgresql to knip ignoreDependencies**
- **Found during:** Task 3
- **Issue:** `@testcontainers/postgresql` was installed in Task 1 for use in plan 07-02 integration tests, but is not yet imported in any source file. Knip flagged it as an unused devDependency.
- **Fix:** Added `@testcontainers/postgresql` to ignoreDependencies with a comment explaining it will be used in plan 07-02.
- **Files modified:** knip.config.ts
- **Commit:** ce00297

## Known Stubs

None — all implemented functionality is fully wired.

## Threat Flags

None — this plan creates test infrastructure only. No new production code paths, network endpoints, or trust boundaries.

## Self-Check: PASSED

- All 4 created/modified files exist on disk
- All 3 task commits found in git log (f3fd894, 320b38a, ce00297)
