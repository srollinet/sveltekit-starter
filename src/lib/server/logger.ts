// src/lib/server/logger.ts
// Server-only — never import this in client-side code
import pino from 'pino';
import { trace, context } from '@opentelemetry/api';
import { env } from '$lib/server/env';

export const logger = pino({
  level: env.LOG_LEVEL,
  mixin() {
    // Inject trace correlation fields into stdout JSON for local log tailing.
    // @opentelemetry/instrumentation-pino bridges records to the OTEL LoggerProvider
    // in the main thread — no worker thread transport needed.
    const span = trace.getSpan(context.active());
    if (!span) return {};
    const ctx = span.spanContext();
    return {
      trace_id: ctx.traceId,
      span_id: ctx.spanId,
      trace_flags: ctx.traceFlags,
    };
  },
});
