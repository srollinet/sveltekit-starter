import { env as rawEnv } from '$env/dynamic/private';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .url('DATABASE_URL must be a valid connection URL (e.g. postgres://user:pass@host:5432/db)'),
});

const result = envSchema.safeParse(rawEnv);

if (!result.success) {
  console.error('');
  console.error('  Invalid environment variables — server cannot start.');
  console.error('');
  for (const [key, errors] of Object.entries(result.error.flatten().fieldErrors)) {
    console.error(`  ${key}: ${errors?.join(', ')}`);
  }
  console.error('');
  console.error('  Copy .env.example to .env and set the required values.');
  console.error('');
  process.exit(1);
}

export const env = result.data;
