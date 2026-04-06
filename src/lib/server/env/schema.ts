import { z } from 'zod';

export const envSchema = z.object({
  DATABASE_URL: z.url({
    error: 'DATABASE_URL must be a valid connection URL (e.g. postgres://user:pass@host:5432/db)',
  }),
});
