---
phase: 03-code-quality
plan: '01'
subsystem: tooling
tags: [prettier, tailwindcss, knip, eslint, code-quality]

requires:
  - phase: 01-foundation
    provides: prettier, eslint, husky, lint-staged already configured

provides:
  - prettier-plugin-tailwindcss installed and wired (sorts Tailwind classes on format)
  - knip dead-code detection configured for SvelteKit with zero false positives
  - lint script simplified to ESLint-only
  - all three quality gates passing: lint, format, knip

affects: [all future phases — quality gates enforced from here on]

tech-stack:
  added: [prettier-plugin-tailwindcss@0.7.2, knip@6.3.0]
  patterns:
    - 'Tailwind class sorting via prettier-plugin-tailwindcss (must load after prettier-plugin-svelte)'
    - 'Knip false-positive suppression: CSS-loaded deps in ignoreDependencies, barrel files in ignore, @public JSDoc tag for intentional public exports'
    - 'lint script = ESLint only; prettier enforced on commit via lint-staged'

key-files:
  created:
    - knip.config.ts
  modified:
    - .prettierrc
    - package.json
    - src/lib/server/env/index.ts
    - pnpm-lock.yaml

key-decisions:
  - 'Use @public JSDoc tag on env export to suppress knip unused-export warning — keeps code clean without adding ignoreFiles patterns'
  - 'ignoreDependencies for tailwindcss and daisyui — both loaded via CSS @import/@plugin, not JS imports'
  - 'ignoreDependencies for @testing-library/* — pre-wired for component tests not yet written'
  - 'lint script simplified to eslint-only — prettier enforced pre-commit via lint-staged, not in CI lint'
  - 'Removed redundant entry array from knip.config.ts — SvelteKit plugin auto-detects routing files'

patterns-established:
  - 'Knip config: use ignoreDependencies for CSS-loaded packages, ignore for intentional barrel files, @public tag for public APIs'
  - 'Prettier plugin order: prettier-plugin-svelte THEN prettier-plugin-tailwindcss (tailwind must be last)'

requirements-completed: [QUAL-01, QUAL-02, QUAL-03, QUAL-04, QUAL-05, QUAL-06]

duration: 4min
completed: 2026-04-06
---

# Phase 3 Plan 01: Code Quality Tooling Summary

**prettier-plugin-tailwindcss and knip added with zero false positives; all three quality gates (lint, format, knip) passing clean**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-06T13:34:09Z
- **Completed:** 2026-04-06T13:38:00Z
- **Tasks:** 5
- **Files modified:** 5

## Accomplishments

- Installed `prettier-plugin-tailwindcss@0.7.2` and configured it to load after `prettier-plugin-svelte` — Tailwind classes now auto-sorted on format
- Installed `knip@6.3.0` with SvelteKit-aware config; suppressed all false positives from CSS-loaded deps, pre-wired test utilities, and starter barrel exports
- Simplified `lint` script from `prettier --check . && eslint .` to `eslint .` — prettier already enforced pre-commit via lint-staged
- All three gates pass with zero errors: `pnpm run lint`, `pnpm run format` (idempotent), `pnpm run knip`

## Task Commits

1. **Tasks 1-5: Install tools, configure, verify, commit** - `25111dc` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `knip.config.ts` — Knip config with SvelteKit project patterns and false-positive suppression
- `.prettierrc` — Added `prettier-plugin-tailwindcss` after `prettier-plugin-svelte`
- `package.json` — Simplified lint script; added `knip` script; new devDependencies
- `src/lib/server/env/index.ts` — Added `@public` JSDoc tag to `env` export to mark as intentional public API
- `pnpm-lock.yaml` — Lockfile updated for two new packages

## Decisions Made

- Used `@public` JSDoc tag on the `env` export rather than `ignoreFiles` — keeps the file in knip's project scan while suppressing the specific unused-export warning
- Removed the `entry` array from `knip.config.ts` after discovering the SvelteKit plugin auto-detects routing/config entry points (config hints indicated redundancy)
- `ignoreDependencies` for `tailwindcss`, `daisyui`, `@testing-library/svelte`, `@testing-library/jest-dom`, `get-shit-done-cc` — none are JS-imported in source but all are legitimate dependencies

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed redundant entry array from knip.config.ts**

- **Found during:** Task 4 (verify quality gates)
- **Issue:** Initial config included an explicit `entry` array listing `svelte.config.js`, `vite.config.ts`, `playwright.config.ts`, `src/hooks.server.ts` — knip reported all four as "redundant entry patterns" because the SvelteKit plugin already detects them
- **Fix:** Removed the `entry` array entirely; knip config now only contains `project`, `ignoreDependencies`, `ignore`, and `ignoreExportsUsedInFile`
- **Files modified:** `knip.config.ts`
- **Verification:** Knip passed with zero issues and zero configuration hints
- **Committed in:** `25111dc`

**2. [Rule 2 - Missing Critical] Added @public tag for env export**

- **Found during:** Task 4 (verify quality gates)
- **Issue:** `env` export in `src/lib/server/env/index.ts` flagged as unused — it's an intentional starter API for server routes that don't exist yet
- **Fix:** Added `/** @public */` JSDoc comment; this is the knip-recommended pattern for marking intentional public exports
- **Files modified:** `src/lib/server/env/index.ts`
- **Verification:** Knip passed with zero export issues
- **Committed in:** `25111dc`

---

**Total deviations:** 2 auto-fixed (1 bug fix, 1 missing annotation)
**Impact on plan:** Both fixes necessary for zero-issue knip output. No scope creep.

## Issues Encountered

- `ignoreExports` and `ignoreFiles` are not valid knip config keys for suppressing unused exports — the correct approach is the `@public` JSDoc tag on the export itself. Discovered by reading the knip type definitions.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All code quality gates pass clean; Phase 4 (Database) can rely on lint/format/knip from day one
- Pre-commit hook (Husky + lint-staged) unchanged and confirmed still working
- Any new files added in Phase 4 will be automatically checked by knip and linted/formatted on commit
