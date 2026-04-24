import { execSync, spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { TEST_SERVER_URL } from './constants.js';
const PREVIEW_TIMEOUT_MS = 60_000;

async function waitForServer(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
    } catch {
      // server not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`);
}

export default async function globalSetup() {
  const container = await new PostgreSqlContainer('postgres:17-alpine').start();
  const databaseUrl = container.getConnectionUri();
  console.log('Test Database URL:', databaseUrl);

  const env = { ...process.env, DATABASE_URL: databaseUrl };

  execSync('pnpm build --mode test', { env, stdio: 'inherit' });
  execSync('pnpm db:migrate', { env, stdio: 'inherit' });

  // Run the built Node server directly (not via pnpm preview) so we have direct
  // control over the process and SIGTERM triggers its own graceful shutdown,
  // which closes the pg pool cleanly before the process exits.
  const serverProcess: ChildProcess = spawn('node', ['build/index.js'], {
    env: { ...env, PORT: '4173', ORIGIN: TEST_SERVER_URL },
    stdio: 'inherit',
    detached: true,
  });

  await waitForServer(TEST_SERVER_URL, PREVIEW_TIMEOUT_MS);

  return async () => {
    console.log('Stopping test server and database container...');
    const exited = new Promise<void>((resolve) => serverProcess.once('close', resolve));
    serverProcess.kill('SIGKILL');
    await exited;
    await container.stop();
  };
}
