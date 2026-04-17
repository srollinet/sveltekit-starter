import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import type { RequestHandler } from './$types.js';

// Module-level refs — set in beforeAll, read lazily by mock getters
let container: StartedPostgreSqlContainer;
let testPool: Pool;

// Mock $lib/server/db — prevent module-level Pool creation that requires env.DATABASE_URL
// Getter pattern defers resolution to call time (vi.mock is hoisted before beforeAll runs)
vi.mock('$lib/server/db', () => ({
  get client() {
    return testPool;
  },
  get db() {
    return null;
  },
}));

// Mock $lib/server/logger — prevent import of $lib/server/env which calls process.exit(1)
// on missing env vars. The health handler uses logger.error in the catch block.
vi.mock('$lib/server/logger', () => ({
  logger: {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  },
}));

// Dynamic import AFTER vi.mock hoisting — handler gets mocked modules
let GET: RequestHandler;

describe('GET /api/health', () => {
  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:17-alpine').start();
    testPool = new Pool({ connectionString: container.getConnectionUri() });
    // Dynamic import ensures the handler receives the mocked $lib/server/db
    const mod = await import('./+server.js');
    GET = mod.GET;
  }, 60_000); // 60s timeout for container pull + startup

  afterAll(async () => {
    await testPool?.end();
    await container?.stop();
  });

  it('returns 200 with { status: ok, db: ok } when database is reachable', async () => {
    const response = await GET({} as Parameters<typeof GET>[0]);
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.db).toBe('ok');
    expect(typeof body.timestamp).toBe('string');
  });

  it('returns a valid ISO 8601 timestamp', async () => {
    const response = await GET({} as Parameters<typeof GET>[0]);
    const body = await response.json();
    const parsed = new Date(body.timestamp);
    expect(parsed.toISOString()).toBe(body.timestamp);
  });
});
