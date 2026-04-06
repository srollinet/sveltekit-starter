# Phase 3: Code Quality — Context

**Phase goal:** All code quality tools configured and passing on the existing codebase; every future commit automatically checked.

**Requirements:** QUAL-01, QUAL-02, QUAL-03, QUAL-04, QUAL-05, QUAL-06

---

## Current State (from Phase 1)

The following are **already in place** — do not re-implement:

| Tool                              | Status | Location                                                              |
| --------------------------------- | ------ | --------------------------------------------------------------------- |
| ESLint flat config                | Done   | `eslint.config.js` — includes svelte, ts, css, prettier-compat        |
| Prettier + prettier-plugin-svelte | Done   | `.prettierrc`                                                         |
| Husky v9 pre-commit hook          | Done   | `.husky/pre-commit` runs `pnpm exec lint-staged`                      |
| lint-staged                       | Done   | `package.json` — runs ESLint fix + Prettier on `*.{js,ts,svelte,css}` |
| `pnpm run lint`                   | Done   | `prettier --check . && eslint .` — passes clean                       |
| `pnpm run format`                 | Done   | `prettier --write .`                                                  |

**What is missing:**

- `knip` — not installed, no config, no script
- `prettier-plugin-tailwindcss` — not installed, not in `.prettierrc`
- `pnpm run knip` script
- QUAL-06 final verification (lint + format + knip all pass)

---

## Decisions

### 1. Knip: Default mode with SvelteKit plugin

Use Knip's default (non-strict) mode with the built-in Svelte plugin.

- The Svelte plugin auto-detects SvelteKit file-based routing entry points (`src/routes/**`) and `$lib` exports
- Do **not** use `--production` / strict mode — starter scaffolding ships intentional example code that would generate noise
- Add a `knip` script to `package.json`: `"knip": "knip"`
- Knip config file: `knip.config.ts` (TypeScript config preferred for type safety)
- Entry points to explicitly include if the plugin misses them: `svelte.config.js`, `vite.config.ts`, `playwright.config.ts`

### 2. prettier-plugin-tailwindcss: Add it, load last

Install `prettier-plugin-tailwindcss` and update `.prettierrc` so the plugin loads **after** `prettier-plugin-svelte` (required order).

Final `.prettierrc`:

```json
{
  "trailingComma": "all",
  "singleAttributePerLine": true,
  "plugins": ["prettier-plugin-svelte", "prettier-plugin-tailwindcss"],
  "overrides": [
    {
      "files": "*.svelte",
      "options": {
        "parser": "svelte"
      }
    }
  ]
}
```

After adding the plugin, run `pnpm run format` to re-format all files, then verify `pnpm run lint` still passes.

### 3. Lint script: ESLint only

Change `"lint"` script from `prettier --check . && eslint .` to `eslint .` only.

**Rationale:** `eslint-config-prettier` already disables conflicting rules; lint-staged runs prettier on commit. Removes redundancy while keeping a clean ESLint-only lint gate.

```json
"lint": "eslint ."
```

The `"format"` script (`prettier --write .`) and lint-staged prettier step are unchanged.

---

## Implementation Order

1. Install `prettier-plugin-tailwindcss`; update `.prettierrc`; run `pnpm run format` to normalize all files
2. Update `"lint"` script to `eslint .` only
3. Install `knip`; add `knip.config.ts`; add `"knip": "knip"` script
4. Run `pnpm run lint`, `pnpm run format --check`, `pnpm run knip` — all must pass zero errors
5. Commit

---

## Out of Scope / Deferred

- Additional ESLint rules beyond recommended (no custom rules requested)
- `eslint --max-warnings 0` flag (not requested; default behavior is sufficient)
- Commitlint / conventional commits (explicitly out of scope per REQUIREMENTS.md)
