// src/lib/server/logger.ts
// Server-only — never import this in client-side code
//
// Uses @opentelemetry/api-logs directly — no third-party logger dependency.
// This reliably works in both Vite dev mode and the production Node build
// because it calls into the OTEL SDK directly rather than relying on
// import-in-the-middle module patching (which Vite's SSR loader bypasses).
//
// The NodeSDK in instrumentation.server.ts registers a global LoggerProvider
// backed by BatchLogRecordProcessor → OTLPLogExporter before this module loads.
import { logs, SeverityNumber, type AnyValueMap } from '@opentelemetry/api-logs';
import { trace, context } from '@opentelemetry/api';
import { env } from '$lib/server/env';
import { logLevelEnum } from '$lib/server/env/schema';

const LEVELS = logLevelEnum.options;
type Level = (typeof LEVELS)[number];

const SEVERITY: Record<Level, SeverityNumber> = {
  trace: SeverityNumber.TRACE,
  debug: SeverityNumber.DEBUG,
  info: SeverityNumber.INFO,
  warn: SeverityNumber.WARN,
  error: SeverityNumber.ERROR,
  fatal: SeverityNumber.FATAL,
};

const configuredLevelIndex = LEVELS.indexOf(env.LOG_LEVEL);

function emit(level: Level, attrs: Record<string, unknown>, body: string): void {
  if (LEVELS.indexOf(level) < configuredLevelIndex) return;

  // Inject active span context for trace correlation
  const span = trace.getSpan(context.active());
  const spanCtx = span?.spanContext();

  const allAttrs: Record<string, unknown> = spanCtx
    ? { ...attrs, trace_id: spanCtx.traceId, span_id: spanCtx.spanId, trace_flags: spanCtx.traceFlags }
    : attrs;

  // Emit to the OTEL LoggerProvider → BatchLogRecordProcessor → OTLPLogExporter
  // getLogger() is called lazily so it always resolves the provider registered by sdk.start()
  logs.getLogger('sveltekit-app').emit({
    severityNumber: SEVERITY[level],
    severityText: level,
    body,
    attributes: allAttrs as AnyValueMap,
    timestamp: Date.now(),
  });

  // Mirror to stdout for local log tailing (structlog-compatible JSON)
  process.stdout.write(JSON.stringify({ level, time: Date.now(), msg: body, ...allAttrs }) + '\n');
}

// Supports both pino-style overloads:
//   logger.info('message')
//   logger.info({ key: 'value' }, 'message')
function makeMethod(level: Level) {
  return (msgOrAttrs: string | Record<string, unknown>, msg?: string) => {
    if (typeof msgOrAttrs === 'string') {
      emit(level, {}, msgOrAttrs);
    } else {
      emit(level, msgOrAttrs, msg ?? '');
    }
  };
}

export const logger = {
  trace: makeMethod('trace'),
  debug: makeMethod('debug'),
  info: makeMethod('info'),
  warn: makeMethod('warn'),
  error: makeMethod('error'),
  fatal: makeMethod('fatal'),
};
