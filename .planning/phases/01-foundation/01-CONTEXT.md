# Phase 1: Foundation - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Set up the SvelteKit app skeleton: install and configure SvelteKit 2 + Svelte 5 (runes), Tailwind CSS v4, DaisyUI v5, TypeScript strict mode, and adapter-node. Deliver three base pages (root layout with nav, home page, error page) that prove the stack is wired and running.

New capabilities (database, observability, auth, tests, CI) belong in subsequent phases.

</domain>

<decisions>
## Implementation Decisions

### SvelteKit Init Approach

- **D-01:** Bootstrap with `pnpm create svelte@latest` using the **skeleton** project template.
- **D-02:** Accept **all tooling options** the scaffold offers (ESLint, Prettier, Playwright, Vitest) even though they are configured more thoroughly in later phases (Phase 3 and Phase 7). The scaffold provides a starting point; later phases extend/finalize those configs rather than install from scratch.

### Home Page Content

- **D-03:** Home page (`+page.svelte`) displays a **stack showcase** — a list or card grid of what's included in the starter (SvelteKit 2, Tailwind CSS v4, DaisyUI v5, adapter-node, etc.) styled with DaisyUI components (cards, badges, or similar). The goal is to prove the stack is wired and working, not to display a product landing page.

### Navigation Structure

- **D-04:** Root layout uses a **DaisyUI top navbar with a mobile hamburger drawer**. On desktop, nav links are visible inline; on mobile, a ☰ button opens a DaisyUI drawer/menu.
- **D-05:** Only one nav link: **Home**. No About or demo pages — the template stays minimal; real apps add their own routes. Error page is reached via any bad route (404), not a nav link.
- **D-06:** Navbar includes a **theme toggle button** (sun/moon icon) for the light/dark switcher (see Theme decisions).

### DaisyUI Theme

- **D-07:** Configure **two DaisyUI themes: `light` (default) and `dark`**. A toggle button in the navbar switches between them. The chosen theme is persisted in `localStorage` so it survives page reloads.
- **D-08:** On initial load, check `localStorage` for a saved preference; if none, default to `light`.

### Claude's Discretion

- Exact icon set for the sun/moon theme toggle — use any inline SVG or a simple text/emoji fallback.
- Exact wording/copy on the home page stack showcase (card titles, descriptions).
- Error page copy and illustration — simple DaisyUI-styled error message, no specific wording required.
- Specific DaisyUI component variants (card shadow, rounded size, etc.) — use sensible defaults.

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements

- `.planning/REQUIREMENTS.md` §Foundation — FOUND-01 through FOUND-07 define exact acceptance criteria for this phase

### Technology

- `.planning/CLAUDE.md` §Technology Stack — version table for all dependencies (SvelteKit ^2.56.1, Svelte ^5.55.1, Tailwind ^4.2.2, DaisyUI ^5.5.19, adapter-node ^5.5.4, TypeScript ^6.0.2)
- `.planning/CLAUDE.md` §What NOT to Use — lists forbidden patterns (adapter-auto, adapter-static, tailwind.config.js, @tailwind directives, .eslintrc.js)

No external spec documents — requirements fully captured in decisions above and REQUIREMENTS.md.

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- None — the repo currently has no SvelteKit code. Only `package.json` (husky, lint-staged, prettier) exists.

### Established Patterns

- `package.json` already has Husky + lint-staged wired; the scaffold should not overwrite this — merge carefully.
- Prettier is already installed (v3.8.1); the scaffold's Prettier selection should align with the existing version.

### Integration Points

- Phase 2 will add Docker Compose and env config — Phase 1 needs no env vars and no DB connection.
- Phase 3 will finalize ESLint + Prettier + Husky configs — scaffold-generated configs are a starting point, not the final state.

</code_context>

<specifics>
## Specific Ideas

- The home page should feel like a "starter kit index" — something a developer sees immediately and understands what's pre-configured. Cards or a checklist with the tech stack items works well.
- The theme switcher should be in the top-right of the navbar (consistent with common DaisyUI patterns).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

_Phase: 01-foundation_
_Context gathered: 2026-04-05_
