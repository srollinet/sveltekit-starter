// src/routes/api/health/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { client } from '$lib/server/db';
import { logger } from '$lib/server/logger';

/**
 * GET /api/health
 *
 * Liveness probe for Docker health checks and load balancers.
 * Checks database connectivity using a raw SELECT 1 (no ORM overhead).
 *
 * Returns:
 *   200 { status: 'ok', db: 'ok', timestamp: ISO8601 }      — healthy
 *   503 { status: 'error', db: 'error', timestamp: ISO8601 } — DB unreachable
 */
export const GET: RequestHandler = async () => {
  const timestamp = new Date().toISOString();

  try {
    // Raw postgres.js tagged template — no Drizzle ORM (per D-18)
    await client`SELECT 1`;

    return json({ status: 'ok', db: 'ok', timestamp }, { status: 200 });
  } catch (err: unknown) {
    logger.error({ err: err instanceof Error ? err : new Error(String(err)) }, 'Health check DB query failed');
    return json({ status: 'error', db: 'error', timestamp }, { status: 503 });
  }
};
