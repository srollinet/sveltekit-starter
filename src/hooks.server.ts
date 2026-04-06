// Importing env.ts here guarantees Zod validation runs at server startup.
// If DATABASE_URL is missing or malformed, the server exits immediately with a clear error.
import '$lib/server/env';

import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  return resolve(event);
};
