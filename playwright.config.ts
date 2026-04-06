import { defineConfig } from '@playwright/test';

export default defineConfig({
  webServer: { command: 'pnpm build && pnpm preview --mode test', port: 4173 },
  testMatch: '**/*.e2e.{ts,js}',
});
