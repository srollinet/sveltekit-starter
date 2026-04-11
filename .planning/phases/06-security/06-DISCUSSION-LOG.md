# Phase 6: Security - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the discussion.

**Date:** 2026-04-11
**Phase:** 06-security
**Mode:** discuss
**Areas discussed:** CSP configuration, hooks.server.ts structure, HSTS in dev

## Gray Areas Presented

| Area           | Options offered                                 | User choice           |
| -------------- | ----------------------------------------------- | --------------------- |
| CSP approach   | Nonce-based / unsafe-inline / nosecone defaults | **Nonce-based**       |
| hooks pipeline | 3 focused handles / 2 handles (minimal)         | **3 focused handles** |
| HSTS in dev    | nosecone default / explicit NODE_ENV guard      | **nosecone default**  |

## Discussion Detail

### CSP Configuration

- **Options presented:** (a) nonce-based CSP with SvelteKit `csp.mode: 'nonce'` + nosecone nonce wiring, (b) `unsafe-inline` for scripts/styles, (c) nosecone defaults only
- **User chose:** Nonce-based
- **Implications captured in D-03 through D-06:** SvelteKit generates nonce, nosecone wires it into script-src, style-src uses unsafe-inline for Tailwind compatibility

### hooks.server.ts Structure

- **Options presented:** (a) 3 handles: noseconeHandle + otelHandle + loggingHandle, (b) 2 handles: noseconeHandle + existing otelHandle
- **User chose:** 3 focused handles
- **Implications captured in D-11 through D-14:** otelHandle trimmed to OTEL enrichment only, logging extracted to loggingHandle

### HSTS in Development

- **Options presented:** (a) nosecone built-in NODE_ENV behaviour, (b) explicit guard code
- **User chose:** nosecone default behaviour
- **Implications captured in D-15:** no extra code needed

## Locked from Prior Context (not re-discussed)

- `@nosecone/sveltekit` as the security headers library (CLAUDE.md mandate)
- SvelteKit built-in CSRF (CLAUDE.md mandate)
- `sequence()` for hooks composition (already in place from Phase 5)
- Technology stack constraints (no swapping nosecone)
