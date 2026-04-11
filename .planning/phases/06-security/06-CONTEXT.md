# Phase 6: Security - Context

**Gathered:** 2026-04-11 (discuss mode)
**Status:** Ready for planning

<domain>
## Phase Boundary

Apply security best-practice HTTP headers on every response and enforce server-only module boundaries — all wired through a clean, testable hooks pipeline. Phase delivers: nosecone security headers, SvelteKit built-in CSRF (already active, needs documentation), $lib/server/ enforcement documentation, and a refactored hooks.server.ts using sequence() with 3 focused handles.

</domain>

<decisions>
## Implementation Decisions

### Security Headers Library

- **D-01:** Use `@nosecone/sveltekit` for all HTTP security headers. This is a CLAUDE.md mandate — no alternatives considered.
- **D-02:** Nosecone delivers: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy as typed defaults. No manual header construction.

### CSP Configuration — Nonce-Based

- **D-03:** Use **nonce-based CSP**. SvelteKit injects inline scripts for hydration which break strict `'self'`-only CSP. A per-request nonce allows inline scripts without `unsafe-inline`.
- **D-04:** Configure SvelteKit to generate nonces via `svelte.config.js`:
  ```js
  csp: {
    mode: 'nonce',
    directives: { 'script-src': ["'self'"] }
  }
  ```
  SvelteKit injects the nonce attribute automatically on all inline `<script>` tags.
- **D-05:** Wire the SvelteKit-generated nonce into nosecone's CSP directive in `noseconeHandle`. The nonce is available on the response object (SvelteKit populates it before hooks resolve). Use nosecone's `contentSecurityPolicy` option to include the nonce in `script-src`.
- **D-06:** `style-src`: use `'unsafe-inline'` for styles. Tailwind v4 injects a `<style>` block at build time; nonce-based style CSP is significantly more complex and not required by the security requirements.

### CSRF

- **D-07:** SvelteKit built-in CSRF origin checking is already active — it rejects non-GET requests from different origins by default. No library or configuration needed.
- **D-08:** Add a comment in `hooks.server.ts` explaining CSRF is handled by SvelteKit's built-in origin check (satisfies SEC-02 "configured and documented").

### Server-Only Enforcement ($lib/server/)

- **D-09:** SvelteKit enforces `$lib/server/` as server-only at build time — importing any module from it in client-side code causes a build error. No runtime code needed.
- **D-10:** Document this convention in `CLAUDE-DEV.md` (Phase 2 created this file). Add a note under "Coding Conventions" explaining the `$lib/server/` boundary and that violations are caught at build time (satisfies SEC-03).

### hooks.server.ts Pipeline Structure

- **D-11:** Refactor `hooks.server.ts` to 3 focused, separately-named handle functions:
  1. `noseconeHandle` — security headers on every response (comes first)
  2. `otelHandle` — injects `traceId` / `spanId` into `event.locals` from active OTEL span
  3. `loggingHandle` — logs `method` + `path` per request via pino logger
- **D-12:** Final sequence: `export const handle = sequence(noseconeHandle, otelHandle, loggingHandle)`
- **D-13:** noseconeHandle must come first so security headers are applied to ALL responses including error responses.
- **D-14:** Logging moved out of `otelHandle` into its own `loggingHandle` — keeps each handle single-responsibility.

### HSTS in Development

- **D-15:** Rely on nosecone's built-in `NODE_ENV` awareness. Nosecone sets `max-age=0` (effectively disabling HSTS) when `NODE_ENV !== 'production'`. No explicit guard code needed.

### Claude's Discretion

- Exact nosecone CSP directive values beyond script-src and style-src (X-Frame-Options value, Referrer-Policy policy, etc.) — use nosecone's opinionated secure defaults.
- Whether to export `noseconeHandle`, `otelHandle`, and `loggingHandle` as named exports (for testability) — reasonable to export them for Phase 7 testing.

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing hooks pipeline

- `src/hooks.server.ts` — current sequence(otelHandle) implementation to refactor
- `src/app.d.ts` — App.Locals interface (traceId, spanId already defined)
- `svelte.config.js` — needs csp.mode = 'nonce' added to kit config

### Requirements

- `.planning/REQUIREMENTS.md` §Security (SEC-01 through SEC-04) — exact acceptance criteria
- `CLAUDE.md` §Security — technology mandates (nosecone, SvelteKit CSRF)
- `CLAUDE.md` §What NOT to Use — confirms no Sentry, no manual header construction

### Nosecone docs

- https://docs.arcjet.com/nosecone/quick-start?f=sveltekit — nosecone SvelteKit integration (nonce wiring pattern)

### Developer docs to update

- `CLAUDE-DEV.md` — needs $lib/server/ convention documented under Coding Conventions

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `src/hooks.server.ts` — existing `otelHandle` and `sequence()` wiring. Phase 6 adds noseconeHandle before it and extracts logging into loggingHandle.
- `src/lib/server/logger.ts` — singleton pino logger. loggingHandle imports this directly.
- `src/lib/server/env.ts` — validated env. noseconeHandle may read `NODE_ENV` but nosecone reads it directly from process.env.

### Established Patterns

- `sequence()` already in place from Phase 5 — Phase 6 just extends the argument list.
- All server-only singletons live in `src/lib/server/` — noseconeHandle setup follows this pattern.
- Phase 5 deliberately left `sequence(otelHandle)` with a comment pointing to Phase 6 for noseconeHandle composition.

### Integration Points

- `svelte.config.js` — `kit.csp` option must be added for nonce generation. This is the only file outside `src/` that Phase 6 touches.
- `src/app.d.ts` — no changes needed; nonce is not stored in locals (SvelteKit manages it internally).
- `CLAUDE-DEV.md` — add $lib/server/ section under Coding Conventions.

</code_context>

<specifics>
## Specific Ideas

- Nonce wiring: SvelteKit generates the nonce and attaches it to the response before hooks resolve. The nonce is accessible via `event.locals` or the response context in noseconeHandle — check nosecone SvelteKit docs for the exact API.
- The 3-handle split (nosecone / otel / logging) should make Phase 7 testing straightforward — each handle can be tested in isolation.

</specifics>

<deferred>
## Deferred Ideas

- Rate limiting — `sveltekit-rate-limiter` was considered but is a separate concern from security headers. CLAUDE.md explicitly separates CSRF from rate limiting. Backlog candidate.
- Content-Security-Policy reporting endpoint (`report-uri` / `report-to`) — useful for production CSP violation monitoring, but requires an external endpoint or collector. Out of scope for a zero-external-accounts starter.

</deferred>

---

_Phase: 06-security_
_Context gathered: 2026-04-11_
