import { env as rawEnv } from '$env/dynamic/private';
import { envSchema } from './schema.js';

const result = envSchema.safeParse(rawEnv);

if (!result.success) {
  console.error({
    message: 'Invalid environment variables — server cannot start',
    hint: 'Copy .env.example to .env and set the required values',
    issues: result.error.issues.map(({ path, message, code }) => ({ path, message, code })),
  });
  process.exit(1);
}

/** @public */
export const env = result.data;
