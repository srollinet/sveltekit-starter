import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '$lib/server/env';
import * as schema from './schema';

export const client = new Pool({ connectionString: env.DATABASE_URL });
export const db = drizzle({ client, schema });
