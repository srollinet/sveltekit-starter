import { z } from 'zod';

export const envSchema = z.object({
  DATABASE_URL: z.url({
    error: 'DATABASE_URL must be a valid connection URL (e.g. postgres://user:pass@host:5432/db)',
  }),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.url().default('http://localhost:4318'),
  OTEL_SERVICE_NAME: z.string().min(1).default('sveltekit-starter'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
});
