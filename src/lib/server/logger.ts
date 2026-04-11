// src/lib/server/logger.ts
// Server-only — never import this in client-side code
import pino from 'pino';
import { trace, context } from '@opentelemetry/api';
import { env } from '$lib/server/env';

// Pino transport targets — always write to stdout; add OTEL transport when
// OTEL_EXPORTER_OTLP_ENDPOINT is explicitly set so bare local dev (no Aspire
// container) does not error attempting to connect to a missing collector.
const transportTargets: pino.TransportTargetOptions[] = [
  { target: 'pino/file', options: { destination: 1 }, level: env.LOG_LEVEL },
];

if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
  transportTargets.push({
    target: 'pino-opentelemetry-transport',
    options: { loggerName: env.OTEL_SERVICE_NAME },
    level: env.LOG_LEVEL,
  });
}

export const logger = pino({
  level: env.LOG_LEVEL,
  mixin() {
    // Inject trace correlation fields into stdout JSON for local log tailing.
    // pino-opentelemetry-transport reads OTEL context independently via its own bridge.
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
  transport: { targets: transportTargets },
});
