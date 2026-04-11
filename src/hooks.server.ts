// Importing env.ts here guarantees Zod validation runs at server startup.
// If DATABASE_URL is missing or malformed, the server exits immediately with a clear error.
import '$lib/server/env';

import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { createHook } from '@nosecone/sveltekit';
import { trace, context } from '@opentelemetry/api';
import { logger } from '$lib/server/logger';

// SEC-01: Security headers on every response via @nosecone/sveltekit (D-01, D-02).
// Must come first so headers apply even to error responses (D-13).
export const noseconeHandle: Handle = createHook();

// SEC-04: OTEL span-to-locals enrichment.
// Injects traceId and spanId from the active OTEL span into event.locals.
//
// SEC-02: SvelteKit built-in CSRF protection is active by default (checkOrigin: true).
// Cross-origin POST/PUT/PATCH/DELETE requests are rejected automatically.
// No explicit configuration or library needed — SvelteKit handles this in the framework layer.
// To verify: curl -X POST http://localhost:5173/ -H "Origin: https://evil.example.com" → 403
export const otelHandle: Handle = async ({ event, resolve }) => {
  const span = trace.getSpan(context.active());
  if (span) {
    const ctx = span.spanContext();
    event.locals.traceId = ctx.traceId;
    event.locals.spanId = ctx.spanId;
  }

  return resolve(event);
};

// Request logging — separated from otelHandle for single-responsibility (D-14).
export const loggingHandle: Handle = async ({ event, resolve }) => {
  logger.info({ method: event.request.method, path: event.url.pathname }, 'request');
  return resolve(event);
};

// SEC-04: sequence() composition — nosecone first for complete header coverage (D-12, D-13).
export const handle = sequence(noseconeHandle, otelHandle, loggingHandle);
