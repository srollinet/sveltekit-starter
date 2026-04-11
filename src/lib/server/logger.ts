// src/lib/server/logger.ts
// Server-only — never import this in client-side code
import pino from 'pino';
import { trace, context } from '@opentelemetry/api';
import { env } from '$lib/server/env';

export const logger = pino({
  level: env.LOG_LEVEL,
  mixin() {
    const span = trace.getSpan(context.active());
    if (!span) return {};
    const ctx = span.spanContext();
    return {
      trace_id: ctx.traceId,
      span_id: ctx.spanId,
      trace_flags: ctx.traceFlags,
    };
  },
  formatters: {
    level(label: string) {
      // Return label string instead of numeric level for readability
      return { level: label };
    },
  },
});
