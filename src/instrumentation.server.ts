// src/instrumentation.server.ts
// Required pattern for ESM auto-instrumentation with SvelteKit
// See: https://svelte.dev/docs/kit/observability
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { createAddHookMessageChannel } from 'import-in-the-middle';
import { register } from 'node:module';

// Required for ESM module hooking — must run before NodeSDK instantiation
const { registerOptions } = createAddHookMessageChannel();
register('import-in-the-middle/hook.mjs', import.meta.url, registerOptions);

const sdk = new NodeSDK({
  // NodeSDK reads OTEL_SERVICE_NAME natively — process.env fallback for safety
  serviceName: process.env.OTEL_SERVICE_NAME ?? 'sveltekit-starter',
  traceExporter: new OTLPTraceExporter({
    // NodeSDK reads OTEL_EXPORTER_OTLP_ENDPOINT natively but does NOT append /v1/traces
    // Must pass the full path to OTLPTraceExporter explicitly
    url: (process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318') + '/v1/traces',
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      // Enable only HTTP and Node.js native fetch (undici) — per D-04, D-05
      '@opentelemetry/instrumentation-http': { enabled: true },
      '@opentelemetry/instrumentation-undici': { enabled: true },
      // All others explicitly disabled to avoid startup cost and false spans
      '@opentelemetry/instrumentation-amqplib': { enabled: false },
      '@opentelemetry/instrumentation-aws-lambda': { enabled: false },
      '@opentelemetry/instrumentation-aws-sdk': { enabled: false },
      '@opentelemetry/instrumentation-bunyan': { enabled: false },
      '@opentelemetry/instrumentation-cassandra-driver': { enabled: false },
      '@opentelemetry/instrumentation-connect': { enabled: false },
      '@opentelemetry/instrumentation-cucumber': { enabled: false },
      '@opentelemetry/instrumentation-dataloader': { enabled: false },
      '@opentelemetry/instrumentation-dns': { enabled: false },
      '@opentelemetry/instrumentation-express': { enabled: false },
      '@opentelemetry/instrumentation-fs': { enabled: false },
      '@opentelemetry/instrumentation-generic-pool': { enabled: false },
      '@opentelemetry/instrumentation-graphql': { enabled: false },
      '@opentelemetry/instrumentation-grpc': { enabled: false },
      '@opentelemetry/instrumentation-hapi': { enabled: false },
      '@opentelemetry/instrumentation-ioredis': { enabled: false },
      '@opentelemetry/instrumentation-kafkajs': { enabled: false },
      '@opentelemetry/instrumentation-knex': { enabled: false },
      '@opentelemetry/instrumentation-koa': { enabled: false },
      '@opentelemetry/instrumentation-lru-memoizer': { enabled: false },
      '@opentelemetry/instrumentation-mongodb': { enabled: false },
      '@opentelemetry/instrumentation-mongoose': { enabled: false },
      '@opentelemetry/instrumentation-mysql': { enabled: false },
      '@opentelemetry/instrumentation-mysql2': { enabled: false },
      '@opentelemetry/instrumentation-nestjs-core': { enabled: false },
      '@opentelemetry/instrumentation-net': { enabled: false },
      '@opentelemetry/instrumentation-openai': { enabled: false },
      '@opentelemetry/instrumentation-oracledb': { enabled: false },
      '@opentelemetry/instrumentation-pg': { enabled: false }, // project uses postgres.js, not pg
      '@opentelemetry/instrumentation-pino': { enabled: false }, // using manual mixin instead (D-11)
      '@opentelemetry/instrumentation-redis': { enabled: false },
      '@opentelemetry/instrumentation-restify': { enabled: false },
      '@opentelemetry/instrumentation-runtime-node': { enabled: false },
      '@opentelemetry/instrumentation-socket.io': { enabled: false },
      '@opentelemetry/instrumentation-winston': { enabled: false },
    }),
  ],
});

// sdk.start() is synchronous (void return) — do NOT await (per D-03)
sdk.start();

// Graceful shutdown on SIGTERM (e.g. Docker stop)
// Hold process open until SDK flushes buffered spans before exiting
process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .catch((err: unknown) => {
      console.error('Error shutting down OTEL SDK:', err);
    })
    .finally(() => {
      process.exit(0);
    });
});
