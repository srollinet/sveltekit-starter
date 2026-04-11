# Phase 6: Security - Research

**Researched:** 2026-04-11
**Domain:** SvelteKit security headers, hooks pipeline, server-only module boundaries
**Confidence:** HIGH

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Use `@nosecone/sveltekit` for all HTTP security headers. CLAUDE.md mandate — no alternatives.
- **D-02:** Nosecone delivers: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy as typed defaults. No manual header construction.
- **D-03:** Use nonce-based CSP. SvelteKit injects inline scripts for hydration which break strict `'self'`-only CSP.
- **D-04:** Configure SvelteKit to generate nonces via `svelte.config.js`: `csp: { mode: 'nonce', directives: { 'script-src': ["'self'"] } }`
- **D-05:** Wire the SvelteKit-generated nonce into nosecone's CSP directive in `noseconeHandle`.
- **D-06:** `style-src`: use `'unsafe-inline'` for styles. Tailwind v4 injects a `<style>` block at build time; nonce-based style CSP is significantly more complex and not required.
- **D-07:** SvelteKit built-in CSRF origin checking is already active. No library or configuration needed.
- **D-08:** Add a comment in `hooks.server.ts` explaining CSRF is handled by SvelteKit's built-in origin check.
- **D-09:** SvelteKit enforces `$lib/server/` as server-only at build time. No runtime code needed.
- **D-10:** Document the `$lib/server/` convention in `CLAUDE-DEV.md` under "Coding Conventions".
- **D-11:** Refactor `hooks.server.ts` to 3 focused handle functions: `noseconeHandle`, `otelHandle`, `loggingHandle`.
- **D-12:** Final sequence: `export const handle = sequence(noseconeHandle, otelHandle, loggingHandle)`
- **D-13:** `noseconeHandle` comes first so security headers are applied to ALL responses including error responses.
- **D-14:** Logging moved out of `otelHandle` into its own `loggingHandle` — single-responsibility.
- **D-15:** Rely on nosecone's built-in `NODE_ENV` awareness for HSTS in development.

### Claude's Discretion

- Exact nosecone CSP directive values beyond `script-src` and `style-src` — use nosecone's opinionated secure defaults.
- Whether to export `noseconeHandle`, `otelHandle`, and `loggingHandle` as named exports (for Phase 7 testability) — reasonable to export them.

### Deferred Ideas (OUT OF SCOPE)

- Rate limiting (`sveltekit-rate-limiter`) — separate concern, backlog candidate.
- CSP reporting endpoint (`report-uri` / `report-to`) — requires external endpoint; violates zero-external-accounts constraint.
  </user_constraints>

---

<phase_requirements>

## Phase Requirements

| ID     | Description                                                                                                                                       | Research Support                                                                                                                       |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| SEC-01 | Security HTTP headers applied in `hooks.server.ts` via `@nosecone/sveltekit`: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy | `@nosecone/sveltekit` v1.3.1 `createHook()` delivers all these headers. `csp()` integrates with SvelteKit's kit config for nonce mode. |
| SEC-02 | SvelteKit built-in CSRF origin checking configured and documented in `hooks.server.ts` comments                                                   | CSRF is on by default (`checkOrigin: true`); satisfies requirement via a documentation comment, no code change.                        |
| SEC-03 | `$lib/server/` directory enforced as server-only — no accidental client-side imports of secrets                                                   | SvelteKit enforces this at build time via static analysis. Satisfied by documenting in `CLAUDE-DEV.md`.                                |
| SEC-04 | `hooks.server.ts` uses `sequence()` to compose security headers, OTEL span enrichment, and locals population in a clean, testable pipeline        | `sequence(noseconeHandle, otelHandle, loggingHandle)` is the target structure. Already using `sequence()` from Phase 5.                |

</phase_requirements>

---

## Summary

Phase 6 delivers security hardening through three distinct deliverables: (1) HTTP security headers via `@nosecone/sveltekit`, (2) documentation of SvelteKit's already-active built-in CSRF protection, and (3) a refactored `hooks.server.ts` using `sequence()` with three single-responsibility handle functions.

The `@nosecone/sveltekit` library (v1.3.1, published 2026-04-04) has a two-part integration: `csp()` goes in `svelte.config.js` to configure SvelteKit's native CSP directive injection (including nonce generation), and `createHook()` goes in `hooks.server.ts` to apply security headers on every response. The key insight is that `csp()` translates nosecone's directive config into SvelteKit's `kit.csp` format (mode + directives), while `createHook()` handles the actual headers at request time and respects the `if not already set` rule — meaning SvelteKit's nonce-augmented CSP header won't be overwritten.

The existing `hooks.server.ts` already uses `sequence(otelHandle)` from Phase 5 and was written with an explicit comment pointing to Phase 6 for nosecone composition. The refactor is additive: prepend `noseconeHandle` (wrapping `createHook()`) and extract logging into a separate `loggingHandle`.

**Primary recommendation:** Install `@nosecone/sveltekit`, add `csp: csp()` to `svelte.config.js`, wrap `createHook()` in a named `noseconeHandle`, refactor `hooks.server.ts` to `sequence(noseconeHandle, otelHandle, loggingHandle)`, and add a CSRF documentation comment. This is a low-risk, mostly-additive phase.

---

## Project Constraints (from CLAUDE.md)

| Constraint                                        | Implication for Phase 6                                                             |
| ------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `@nosecone/sveltekit ^1.3.1` for security headers | Must use this exact library; no manual header construction                          |
| `SvelteKit built-in CSRF`                         | No external CSRF library; origin checking is default-on                             |
| `Zod` for env validation                          | Already in place via `src/lib/server/env.ts`; no new env vars needed for this phase |
| No external accounts                              | CSP `report-uri` is out of scope (requires external collector)                      |
| `$env/dynamic/private` for secrets                | Already enforced; no new env access patterns needed                                 |
| `pnpm` package manager                            | Use `pnpm add @nosecone/sveltekit`                                                  |
| TypeScript strict mode                            | All handle functions must be typed as `Handle` from `@sveltejs/kit`                 |
| Knip dead-code detection                          | New package import must not trigger a Knip unused-dependency warning                |

---

## Standard Stack

### Core

| Library               | Version | Purpose                                          | Why Standard                                                                            |
| --------------------- | ------- | ------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `@nosecone/sveltekit` | ^1.3.1  | Security headers via SvelteKit hook + CSP config | CLAUDE.md mandate; typed defaults for CSP/HSTS/X-Frame-Options/etc.; Apache-2.0 license |

[VERIFIED: npm registry — published 2026-04-04, latest: 1.3.1]

**Installation:**

```bash
pnpm add @nosecone/sveltekit
```

### Supporting (already installed, referenced in this phase)

| Library                  | Version  | Purpose             | Role in Phase 6                                                               |
| ------------------------ | -------- | ------------------- | ----------------------------------------------------------------------------- |
| `@sveltejs/kit`          | ^2.57.1  | SvelteKit framework | Provides `sequence()`, `Handle` type, built-in CSRF, and kit CSP nonce system |
| `@opentelemetry/api`     | ^1.9.1   | OTEL API            | Used by `otelHandle` (no change from Phase 5)                                 |
| `pino` (via `logger.ts`) | existing | Structured logging  | Used by extracted `loggingHandle`                                             |

[VERIFIED: npm registry + package.json inspection]

### Alternatives Considered (from CLAUDE.md)

| Instead of            | Could Use                                    | Why Nosecone                                                              |
| --------------------- | -------------------------------------------- | ------------------------------------------------------------------------- |
| `@nosecone/sveltekit` | Manual `hooks.server.ts` header construction | Manual is error-prone and hard to audit; Nosecone provides typed defaults |

---

## Architecture Patterns

### nosecone Two-Part Integration

`@nosecone/sveltekit` requires configuration in two files:

**Part 1: `svelte.config.js` — CSP directive registration**

The `csp()` function translates nosecone's directive configuration into SvelteKit's `kit.csp` format. This registers the directives with SvelteKit's native CSP system, which handles nonce injection on inline `<script>` tags automatically.

```javascript
// Source: arcjet/arcjet-js examples/sveltekit/svelte.config.js [VERIFIED: GitHub]
import { csp } from '@nosecone/sveltekit';

const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    csp: csp(), // Registers CSP directives with SvelteKit
    experimental: {
      tracing: { server: true }, // Pre-existing from Phase 5
      instrumentation: { server: true },
    },
  },
};
```

`csp()` sets `mode: 'auto'` by default, which means nonces for dynamic pages and hashes for prerendered pages. Since D-04 specifies `mode: 'nonce'`, override:

```javascript
import { csp } from '@nosecone/sveltekit';

csp({
  mode: 'nonce',
  directives: {
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"], // D-06: Tailwind v4 inline styles
  },
});
```

[ASSUMED: The `ContentSecurityPolicyConfig` type accepted by `csp()` includes a `mode` field. The source code shows `options?.mode ? options.mode : "auto"`, confirming `mode` is a valid option on the argument.]

**Part 2: `src/hooks.server.ts` — request-time header application**

`createHook()` returns a `Handle` function. It resolves the response first, then applies nosecone headers — importantly skipping headers already set (including the `Content-Security-Policy` header set by SvelteKit's own CSP nonce system).

```typescript
// Source: arcjet/arcjet-js examples/sveltekit/src/hooks.server.ts [VERIFIED: GitHub]
import { createHook } from '@nosecone/sveltekit';

const noseconeHandle = createHook(); // Uses nosecone defaults (all security headers)
```

[VERIFIED: GitHub source — createHook() implementation checks `!response.headers.has(headerName)` before setting, so it does not overwrite SvelteKit's nonce-augmented CSP]

### hooks.server.ts Refactored Structure

The target structure after Phase 6:

```typescript
// Source: derived from Phase 5 hooks.server.ts + nosecone integration pattern [VERIFIED: codebase]
import '$lib/server/env';

import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { createHook } from '@nosecone/sveltekit';
import { trace, context } from '@opentelemetry/api';
import { logger } from '$lib/server/logger';

// SEC-01: Security headers on every response via @nosecone/sveltekit.
// Comes first so headers are applied even to error responses.
const noseconeHandle: Handle = createHook();

// SEC-04: OTEL span-to-locals enrichment.
// SEC-02: SvelteKit built-in CSRF protection (checkOrigin: true by default)
// is active for all non-GET requests. No explicit configuration needed.
const otelHandle: Handle = async ({ event, resolve }) => {
  const span = trace.getSpan(context.active());
  if (span) {
    const ctx = span.spanContext();
    event.locals.traceId = ctx.traceId;
    event.locals.spanId = ctx.spanId;
  }
  return resolve(event);
};

// Logging separated from otelHandle for single-responsibility (D-14).
const loggingHandle: Handle = async ({ event, resolve }) => {
  logger.info({ method: event.request.method, path: event.url.pathname }, 'request');
  return resolve(event);
};

// SEC-04: sequence() composition — nosecone first for complete header coverage.
export const handle = sequence(noseconeHandle, otelHandle, loggingHandle);
```

### Recommended Project Structure (changes only)

```
src/
├── hooks.server.ts        # MODIFIED: 3 handles in sequence()
svelte.config.js           # MODIFIED: add csp: csp() to kit
CLAUDE-DEV.md              # MODIFIED: add $lib/server/ convention docs
```

### Anti-Patterns to Avoid

- **Manual header construction:** Do not call `response.headers.set('Content-Security-Policy', ...)` directly. Use nosecone for all security headers.
- **Inline logging inside otelHandle:** The logging concern is now a separate `loggingHandle`. Mixing them violates D-14 and reduces Phase 7 testability.
- **noseconeHandle not first:** If nosecone is placed after other handles, error responses from SvelteKit's own error handling may not receive security headers.
- **Overriding CSP after SvelteKit sets nonce:** Do not call `createHook()` with explicit CSP directives that duplicate what `csp()` already registered in `svelte.config.js` — the `!response.headers.has()` guard means nosecone's hook will skip CSP anyway since SvelteKit already set it.
- **`mode: 'nonce'` with prerendered pages:** Setting `mode: 'nonce'` globally is insecure for prerendered pages. This starter has no prerendered routes (adapter-node, all dynamic), so this is safe.

---

## Don't Hand-Roll

| Problem                | Don't Build                           | Use Instead                              | Why                                                                    |
| ---------------------- | ------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------- |
| HTTP security headers  | Custom `hooks.server.ts` header logic | `@nosecone/sveltekit` `createHook()`     | Typed defaults; correct values; dev/prod awareness; maintained         |
| CSP nonce generation   | Custom nonce generation in hooks      | SvelteKit `kit.csp` with `mode: 'nonce'` | SvelteKit injects nonce into all `<script>` tags automatically         |
| CSRF protection        | Custom origin checking hook           | SvelteKit built-in (`checkOrigin: true`) | Already active; verified by SvelteKit framework itself                 |
| Server-only boundaries | Runtime guards on module imports      | `$lib/server/` directory convention      | SvelteKit build-time static analysis; fails fast at build, not runtime |

**Key insight:** In the security domain, custom solutions introduce subtle configuration errors that typed library defaults prevent (e.g., wrong HSTS `max-age`, missing `includeSubDomains`, incorrect CSP source expressions).

---

## Common Pitfalls

### Pitfall 1: nosecone CSP Overwrites SvelteKit Nonce Header

**What goes wrong:** If `createHook()` were to set `Content-Security-Policy` after SvelteKit adds the nonce, the nonce-augmented header would be overwritten, breaking hydration.
**Why it happens:** Naive header setting overwrites existing values.
**How to avoid:** nosecone's `createHook()` implementation uses `if (!response.headers.has(headerName))` — so it will NOT overwrite SvelteKit's nonce CSP header. This is the expected behavior. To verify: `csp()` in `svelte.config.js` makes SvelteKit set the header first; `createHook()` runs after `resolve()` and skips already-set headers.
**Warning signs:** If the browser console shows `nonce` attribute on `<script>` tags but the CSP header doesn't include `nonce-...`, the order is wrong.

[VERIFIED: GitHub source code of createHook() confirms `!response.headers.has()` guard]

### Pitfall 2: style-src and Tailwind v4 Inline Styles

**What goes wrong:** Setting `style-src: "'self'"` (no `unsafe-inline`) blocks Tailwind v4's inline `<style>` block injected at build time.
**Why it happens:** Tailwind v4 generates a `<style>` element for its utility CSS. Unlike `<script>`, SvelteKit does not nonce-stamp inline style elements in the same way.
**How to avoid:** Use `styleSrc: ["'self'", "'unsafe-inline'"]` in the `csp()` config (D-06). This is explicitly decided.
**Warning signs:** Styles render as unstyled HTML; browser console shows CSP violation for `style-src`.

[VERIFIED: SvelteKit CSP docs — transitions use inline style elements, `unsafe-inline` needed for style-src]

### Pitfall 3: HSTS Locks Out HTTP-Only Development

**What goes wrong:** If `Strict-Transport-Security` with `max-age=31536000` is served from `http://localhost`, the browser will refuse HTTP for a year.
**Why it happens:** HSTS applies to the origin regardless of port.
**How to avoid:** Nosecone's defaults use `NODE_ENV` awareness — in dev mode, `max-age=0` effectively disables HSTS pinning (D-15). No explicit guard code needed.
**Warning signs:** Browser refuses `http://localhost` even after stopping the dev server.

[ASSUMED: Nosecone sets max-age=0 in non-production. The reference docs mention conditional `upgradeInsecureRequests` based on NODE_ENV, and the `defaults` export from the SvelteKit package inherits from base defaults which include this behavior. Needs verification against source if issues arise.]

### Pitfall 4: Knip Flags nosecone as Unused Dependency

**What goes wrong:** Knip may not detect `@nosecone/sveltekit` as "used" if the import is only in `hooks.server.ts` and the function return value is assigned without being explicitly named.
**Why it happens:** Knip's SvelteKit plugin handles routing files but may not deep-scan all hook files.
**How to avoid:** The import `import { createHook } from '@nosecone/sveltekit'` with explicit usage as `createHook()` should be detected. If Knip flags it after implementation, add to `ignoreDependencies` in `knip.config.ts` (like other CSS-loaded packages).
**Warning signs:** `pnpm run knip` reports `@nosecone/sveltekit` as an unlisted or unused dependency.

[ASSUMED: Based on Knip SvelteKit plugin behavior — standard named function imports are typically detected]

### Pitfall 5: csp() mode Conflicts with experimental.tracing

**What goes wrong:** Adding `csp: csp()` alongside `experimental.tracing` might cause a TypeScript type error if SvelteKit's config type doesn't declare both as simultaneous options.
**Why it happens:** `experimental` is a loosely typed field; `csp` is well-typed.
**How to avoid:** SvelteKit docs confirm `csp` and `experimental` are independent `kit` configuration keys. Both can coexist. [VERIFIED: SvelteKit configuration docs explicitly list them as separate keys]
**Warning signs:** `pnpm run check` reports a type error in `svelte.config.js` after adding `csp:`.

---

## Code Examples

Verified patterns from official sources:

### svelte.config.js with nosecone csp()

```javascript
// Source: arcjet/arcjet-js GitHub examples/sveltekit/svelte.config.js [VERIFIED]
import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { csp } from '@nosecone/sveltekit';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    csp: csp({
      mode: 'nonce',
      directives: {
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    }),
    experimental: {
      tracing: { server: true },
      instrumentation: { server: true },
    },
  },
};

export default config;
```

### hooks.server.ts createHook() Pattern

```typescript
// Source: @nosecone/sveltekit createHook() [VERIFIED: GitHub source]
import { createHook } from '@nosecone/sveltekit';
import { sequence } from '@sveltejs/kit/hooks';

const noseconeHandle = createHook(); // Returns Handle; applies all security headers

export const handle = sequence(
  noseconeHandle,
  // ... other handles
);
```

### SvelteKit CSP Mode (from svelte.config.js)

```javascript
// Source: SvelteKit configuration docs [VERIFIED: svelte.dev/docs/kit/configuration]
// mode: 'nonce' — per-request unique tokens for dynamically rendered pages
// mode: 'hash' — cryptographic hashes for prerendered pages
// mode: 'auto' — nonces for dynamic, hashes for prerendered (default)
kit: {
  csp: {
    mode: 'nonce',
    directives: {
      'script-src': ["'self'"]
      // SvelteKit augments with nonce automatically for inline scripts it generates
    }
  }
}
```

### SvelteKit CSRF Built-in (for documentation comment)

```typescript
// SvelteKit checks the `Origin` header on POST/PUT/PATCH/DELETE requests by default.
// checkOrigin: true is the default — cross-origin form submissions are rejected.
// This is equivalent to CSRF protection with no library required.
// Source: @sveltejs/kit type definitions — csrf.checkOrigin defaults to true [VERIFIED: node_modules]
// To verify: curl -X POST http://localhost:5173/any-route -H "Origin: https://evil.com" → 403
```

### $lib/server/ Build-Time Enforcement

```typescript
// Any attempt to import from $lib/server/ in client-facing code fails at build time:
// Error: Cannot import $lib/server/secrets.ts into code that runs in the browser
//        src/routes/+page.svelte imports
//          $lib/server/env.ts
// No runtime code needed — SvelteKit's static analysis handles this.
// Source: svelte.dev/docs/kit/server-only-modules [VERIFIED: official docs]
```

---

## State of the Art

| Old Approach                                 | Current Approach                                  | When Changed       | Impact                                                                          |
| -------------------------------------------- | ------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------- |
| Manual `hooks.server.ts` header construction | `@nosecone/sveltekit` typed defaults              | 2023+              | Removes class of misconfiguration bugs                                          |
| `tailwind.config.js` CSP hash extraction     | Tailwind v4 inline `<style>` with `unsafe-inline` | Tailwind v4 (2024) | Simpler; nonce for scripts, `unsafe-inline` for styles is the recommended split |
| CSRF middleware libraries                    | SvelteKit built-in origin check                   | SvelteKit 1.x+     | No dependency needed                                                            |
| Monolithic handle function                   | `sequence()` with named handles                   | SvelteKit 1.x+     | Composable, testable, single-responsibility                                     |

**Deprecated/outdated:**

- `@tailwind` directives in CSS: Replaced by `@import "tailwindcss"` in v4 (already done in this project).
- Manual `Content-Security-Policy` header strings: Error-prone; nosecone provides typed, auditable defaults.

---

## Assumptions Log

| #   | Claim                                                                     | Section               | Risk if Wrong                                                                                                                                                                                                        |
| --- | ------------------------------------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | `csp()` from `@nosecone/sveltekit` accepts a `mode` field in its argument | Architecture Patterns | Might need to set `mode` directly in the `directives` section or in `svelte.config.js kit.csp` override. Low impact — the mode can be set in a wrapper object around `csp()` output.                                 |
| A2  | Nosecone sets HSTS `max-age=0` in non-production NODE_ENV                 | Common Pitfalls       | If nosecone doesn't suppress HSTS in dev, browsers will lock out HTTP on localhost for up to 1 year. Mitigation: verify after implementation by inspecting the `Strict-Transport-Security` header in `pnpm run dev`. |
| A3  | Knip detects `@nosecone/sveltekit` import in hooks.server.ts as "used"    | Common Pitfalls       | Knip may flag it as unused; fix is trivial (add to `ignoreDependencies`).                                                                                                                                            |

---

## Open Questions

1. **Exact `csp()` type signature for `mode` field**
   - What we know: Source shows `options?.mode ? options.mode : "auto"` — `mode` exists on the argument.
   - What's unclear: TypeScript type may or may not export the `mode` field as part of `ContentSecurityPolicyConfig` (vs. a separate override).
   - Recommendation: After installing the package, inspect the exported types with `pnpm tsc --noEmit` to see if TypeScript accepts `mode` in the `csp()` argument. If not, set `kit.csp.mode` directly in `svelte.config.js` alongside `csp()`.

2. **nosecone HSTS in development**
   - What we know: Reference docs show conditional `upgradeInsecureRequests` based on NODE_ENV. The underlying `nosecone` package v1.3.1 has this behavior.
   - What's unclear: Whether the SvelteKit-specific `createHook()` defaults include NODE_ENV-aware HSTS or use raw defaults.
   - Recommendation: After implementation, run `curl -I http://localhost:5173` and inspect the `Strict-Transport-Security` header. If `max-age` is non-zero, add explicit `strictTransportSecurity: { maxAge: 0 }` in dev, or suppress via `NODE_ENV` check in the options.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 6 is purely code/config changes. All dependencies (`pnpm`, `@nosecone/sveltekit` from npm registry) are available in the standard Node.js environment. No external services needed.

The package `@nosecone/sveltekit` is not yet installed:

| Dependency            | Required By  | Available         | Notes                                                      |
| --------------------- | ------------ | ----------------- | ---------------------------------------------------------- |
| `@nosecone/sveltekit` | SEC-01       | Must install      | `pnpm add @nosecone/sveltekit` — registry confirmed v1.3.1 |
| All other deps        | SEC-02/03/04 | Already installed | `@sveltejs/kit`, OTEL API, pino logger all present         |

---

## Validation Architecture

### Test Framework

| Property           | Value                                                                           |
| ------------------ | ------------------------------------------------------------------------------- |
| Framework          | Vitest ^4.1.2                                                                   |
| Config file        | `vite.config.ts` (test: { environment: 'node', include: ['src/**/*.test.ts'] }) |
| Quick run command  | `pnpm test:unit`                                                                |
| Full suite command | `pnpm test:unit && pnpm run check && pnpm run lint`                             |

### Verification Strategy: What to Check

Phase 6 requirements are most efficiently verified via curl/grep/CLI rather than unit tests, since security headers are response-level behavior. The verifier should use the following approaches:

**SEC-01 — Security Headers Present**

```bash
# Start dev server in background, then:
curl -I http://localhost:5173/ | grep -iE "content-security-policy|strict-transport-security|x-frame-options|x-content-type-options|referrer-policy"
# Expected: all 5 headers present in response
```

**SEC-02 — CSRF Active (documentation)**

```bash
# Verify comment exists in hooks.server.ts:
grep -i "csrf\|checkOrigin\|origin" /workspaces/sveltekit-starter/src/hooks.server.ts
# Verify CSRF rejects cross-origin POST (requires running server):
curl -X POST http://localhost:5173/ -H "Content-Type: application/x-www-form-urlencoded" -H "Origin: https://evil.example.com" -d "data=test" -v 2>&1 | grep -E "HTTP|403|forbidden"
```

**SEC-03 — $lib/server/ documented**

```bash
grep -A 5 "server-only\|\$lib/server" /workspaces/sveltekit-starter/CLAUDE-DEV.md
# Expected: section documenting the convention and build-time enforcement
```

**SEC-04 — sequence() with 3 handles**

```bash
grep -E "sequence|noseconeHandle|otelHandle|loggingHandle" /workspaces/sveltekit-starter/src/hooks.server.ts
# Expected: all 3 named handles and sequence() call present
```

**Build verification:**

```bash
pnpm run build  # Must succeed — verifies $lib/server/ boundary, TS types, CSP config
pnpm run check  # svelte-check type validation
pnpm run lint   # ESLint must pass on modified files
```

### Phase Requirements → Test Map

| Req ID | Behavior                                  | Test Type    | Automated Command                                                | File Exists?            |
| ------ | ----------------------------------------- | ------------ | ---------------------------------------------------------------- | ----------------------- |
| SEC-01 | Security headers in every response        | smoke (curl) | `curl -I http://localhost:5173/ \| grep content-security-policy` | N/A — runtime check     |
| SEC-01 | noseconeHandle defined and used           | static       | `grep noseconeHandle src/hooks.server.ts`                        | ✅ after implementation |
| SEC-02 | CSRF comment documented                   | static       | `grep -i csrf src/hooks.server.ts`                               | ✅ after implementation |
| SEC-03 | $lib/server/ documented in CLAUDE-DEV.md  | static       | `grep "lib/server" CLAUDE-DEV.md`                                | ✅ after implementation |
| SEC-04 | sequence() with 3 handles                 | static       | `grep "sequence(noseconeHandle" src/hooks.server.ts`             | ✅ after implementation |
| SEC-04 | Build passes (TS types, CSP config valid) | build        | `pnpm run build && pnpm run check`                               | ✅ existing infra       |

### Sampling Rate

- **Per task commit:** `pnpm run check && pnpm run lint` (< 30 seconds)
- **Per wave merge:** `pnpm run build && pnpm test:unit`
- **Phase gate:** All above green before `/gsd-verify-work`

### Wave 0 Gaps

None — no new test files needed for Phase 6. Security header verification is done via curl/build smoke checks, not unit tests. The existing test infrastructure (Vitest, `pnpm test:unit`) is sufficient.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category         | Applies | Standard Control                                                       |
| --------------------- | ------- | ---------------------------------------------------------------------- |
| V2 Authentication     | no      | N/A — auth is out of scope for this starter                            |
| V3 Session Management | no      | N/A                                                                    |
| V4 Access Control     | partial | `$lib/server/` boundary (build-time enforcement)                       |
| V5 Input Validation   | no      | N/A — no new input surfaces in this phase                              |
| V6 Cryptography       | no      | N/A                                                                    |
| V7 Error Handling     | partial | Security headers apply to error responses (nosecone first in sequence) |
| V14 Configuration     | yes     | HTTP security headers, CSP, HSTS, CSRF, server-only boundaries         |

### Known Threat Patterns for SvelteKit Security Headers

| Pattern                               | STRIDE                 | Standard Mitigation                                                          |
| ------------------------------------- | ---------------------- | ---------------------------------------------------------------------------- |
| XSS via injected inline scripts       | Spoofing/Tampering     | CSP `script-src` with nonce — nosecone + SvelteKit kit.csp                   |
| Clickjacking (iframe embedding)       | Tampering              | `X-Frame-Options: SAMEORIGIN` — nosecone default                             |
| MIME type sniffing attacks            | Information Disclosure | `X-Content-Type-Options: nosniff` — nosecone default                         |
| Cross-origin information leakage      | Information Disclosure | `Referrer-Policy: no-referrer` — nosecone default                            |
| HTTP downgrade attacks                | Tampering              | `Strict-Transport-Security` — nosecone default; disabled in dev via NODE_ENV |
| CSRF via cross-origin form submission | Spoofing               | SvelteKit built-in `checkOrigin: true`                                       |
| Accidental secret leakage to client   | Information Disclosure | `$lib/server/` build-time boundary enforcement                               |

---

## Sources

### Primary (HIGH confidence)

- `npm view @nosecone/sveltekit` — version 1.3.1, published 2026-04-04 [VERIFIED: npm registry]
- `arcjet/arcjet-js` GitHub — `examples/sveltekit/svelte.config.js` and `src/hooks.server.ts` [VERIFIED: GitHub]
- `arcjet/arcjet-js` GitHub — `nosecone-sveltekit/index.ts` source (`createHook()` implementation) [VERIFIED: GitHub]
- `docs.arcjet.com/nosecone/reference` — NoseconeOptions TypeScript types, all header configs [VERIFIED: official docs]
- `svelte.dev/docs/kit/configuration` — `kit.csp` mode/directives documentation [VERIFIED: official docs]
- `/workspaces/sveltekit-starter/node_modules/@sveltejs/kit/types/index.d.ts` — `csrf.checkOrigin` default `true` [VERIFIED: local node_modules]
- `svelte.dev/docs/kit/server-only-modules` — `$lib/server/` build-time enforcement, error message format [VERIFIED: official docs]

### Secondary (MEDIUM confidence)

- `docs.arcjet.com/nosecone/reference` — HSTS conditional `upgradeInsecureRequests` based on NODE_ENV [CITED: docs.arcjet.com/nosecone/reference]

### Tertiary (LOW confidence)

- nosecone HSTS `max-age=0` in dev (A2 assumption) — inferred from docs pattern, not directly verified in SvelteKit adapter source

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — npm registry confirms v1.3.1; GitHub source verified; already in CLAUDE.md
- Architecture: HIGH — two-part integration pattern verified from official arcjet examples and source
- Pitfalls: HIGH for headers/nonce/Tailwind (verified); MEDIUM for HSTS dev behavior (assumed from pattern)
- Validation: HIGH — curl-based verification is straightforward; build verification uses existing scripts

**Research date:** 2026-04-11
**Valid until:** 2026-06-01 (stable library; nosecone 1.x API unlikely to change in 6 weeks)
