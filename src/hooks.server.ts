// Importing env.ts here guarantees Zod validation runs at server startup.
// If DATABASE_URL is missing or malformed, the server exits immediately with a clear error.
import '$lib/server/env';

import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { trace, context } from '@opentelemetry/api';
import { logger } from '$lib/server/logger';

// Separate handle function for OTEL span-to-locals enrichment.
// Kept as a named export so Phase 6 can compose it with sequence(noseconeHandle, otelHandle).
const otelHandle: Handle = async ({ event, resolve }) => {
  const span = trace.getSpan(context.active());
  if (span) {
    const ctx = span.spanContext();
    event.locals.traceId = ctx.traceId;
    event.locals.spanId = ctx.spanId;
  }

  logger.info({ method: event.request.method, path: event.url.pathname }, 'request');

  return resolve(event);
};

// Use sequence() now so Phase 6 can add handles before/after without refactoring
export const handle = sequence(otelHandle);
