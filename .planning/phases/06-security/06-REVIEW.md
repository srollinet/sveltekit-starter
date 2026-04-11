---
phase: 06-security
reviewed: 2026-04-11T14:21:14Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - CLAUDE-DEV.md
  - package.json
  - src/hooks.server.ts
  - svelte.config.js
findings:
  critical: 0
  warning: 2
  info: 1
  total: 3
status: issues_found
dismissed:
  - id: CR-01
    reason: 'pg (node-postgres) chosen intentionally over postgres.js — postgres.js lacks OpenTelemetry support and the CommonJS concern is not problematic in practice. CLAUDE.md updated to reflect this decision.'
---

# Phase 06: Code Review Report

**Reviewed:** 2026-04-11T14:21:14Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

This phase introduces security headers (Nosecone), CSRF reliance on SvelteKit's built-in protection, OTEL span enrichment in locals, and environment variable validation via Zod. The overall structure is sound and aligns with the project's design decisions. Three issues require attention before this phase ships:

1. The database driver (`pg` / node-postgres) directly contradicts the mandated tech stack — `postgres` (postgres.js) is required per CLAUDE.md.
2. The CSP nonce mode is undermined by `'unsafe-inline'` in `styleSrc`, weakening the policy for styles.
3. The dev script binds to all network interfaces (`--host`), which is a latent security concern in shared or Docker environments.

---

## Critical Issues

### CR-01: Wrong PostgreSQL Driver — `pg` Instead of Mandated `postgres.js`

**File:** `package.json:44,82` and `src/lib/server/db/index.ts:2-3`

**Issue:** The runtime dependency is `"pg": "^8.20.0"` (node-postgres), and `src/lib/server/db/index.ts` imports from `drizzle-orm/node-postgres` and uses `Pool` from `pg`. CLAUDE.md explicitly mandates `postgres` (postgres.js) as the PostgreSQL driver and lists `node-postgres (pg)` under "What NOT to Use" with the explicit rationale: "pg requires CommonJS workarounds in ESM; slower in benchmarks; native binding complexity in Docker."

This is not a style preference — it is a hard project constraint. Using `pg` means the project ships with the wrong driver in direct violation of the tech stack decision, creating future migration friction and voiding the rationale for ESM-native, Docker-friendly dependencies.

**Fix:** Replace `pg` with `postgres` and use `drizzle-orm/postgres-js`:

```bash
pnpm remove pg @types/pg
pnpm add postgres
```

```typescript
// src/lib/server/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '$lib/server/env';
import * as schema from './schema';

const client = postgres(env.DATABASE_URL);
export const db = drizzle({ client, schema });
```

Also update `drizzle.config.ts` (if present) to use `driver: 'postgres-js'` or omit the driver field (Drizzle Kit infers it from the connection string).

---

## Warnings

### WR-01: CSP Nonce Mode Undermined by `'unsafe-inline'` in `styleSrc`

**File:** `svelte.config.js:14`

**Issue:** The CSP configuration uses `mode: 'nonce'` — meaning SvelteKit generates a per-request nonce and injects it into `<script>` tags. However, `styleSrc` is set to `["'self'", "'unsafe-inline'"]`. The `'unsafe-inline'` directive in `style-src` permits any inline `<style>` block or `style=` attribute from any origin, negating protection against CSS injection attacks. This is inconsistent: `scriptSrc` correctly uses `"'self'"` (nonce-enforced by SvelteKit), while `styleSrc` abandons the same protection for styles.

Note: When a nonce is present in a `style-src` directive, browsers that support CSP Level 2+ ignore `'unsafe-inline'`, but older browsers and environments without nonce support fall back to the weaker directive.

**Fix:** Use the nonce for styles as well, or restrict to `"'self'"` if DaisyUI/Tailwind styles are served as external files. SvelteKit injects the nonce automatically into `<style>` blocks when CSP mode is `nonce`:

```javascript
// svelte.config.js
csp: csp({
  mode: 'nonce',
  directives: {
    scriptSrc: ["'self'"],
    styleSrc: ["'self'"],  // Remove 'unsafe-inline'; nonce handles inline styles
  },
}),
```

If Tailwind/DaisyUI generates inline styles that break under this policy, test first with `pnpm run build && pnpm run preview` and adjust only the specific directive that fails — prefer `'nonce-{nonce}'` over `'unsafe-inline'`.

### WR-02: Dev Server Binds to All Interfaces (`--host`)

**File:** `package.json:6`

**Issue:** The `dev` script is `"vite dev --host"`. The `--host` flag without an argument defaults to `0.0.0.0`, binding the unauthenticated dev server to all network interfaces. In Docker Desktop, this exposes the dev server on the host's LAN. In CI or shared dev environments (Codespaces, remote VMs), it exposes HMR websocket and server routes to the network without any authentication.

This is a latent risk for a starter template — developers who clone and use `pnpm run dev` in a shared or containerized environment will unknowingly expose their local app.

**Fix:** If container-to-host access is needed (the likely motivation), prefer an explicit host binding rather than the wildcard:

```json
"dev": "vite dev --host 127.0.0.1"
```

If the template genuinely needs container-accessible binding for the Docker Compose workflow, document this explicitly with a warning comment, and consider providing two scripts:

```json
"dev": "vite dev",
"dev:docker": "vite dev --host"
```

---

## Info

### IN-01: `CLAUDE-DEV.md` References Phases as Future Work Without Tracking Which Are Complete

**File:** `CLAUDE-DEV.md:16,19,21-24`

**Issue:** Several commands are annotated with `_(available after Phase X)_` notes (e.g., lint, E2E tests, db commands). As phases complete, these annotations will become stale and confusing for developers cloning the template after all phases ship. The final template should have these caveats removed or replaced with standard documentation.

**Fix:** After each phase ships, update `CLAUDE-DEV.md` to remove the `_(available after Phase X)_` qualifier from commands that are now available. This is a maintenance task, not a code bug, but leaving it in the shipped template creates a poor first-run experience.

---

_Reviewed: 2026-04-11T14:21:14Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
