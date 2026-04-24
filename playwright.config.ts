import { defineConfig } from '@playwright/test';
import { TEST_SERVER_URL } from './tests/constants.js';

export default defineConfig({
  globalSetup: './tests/global-setup.ts',
  use: { baseURL: TEST_SERVER_URL },
  testMatch: '**/*.e2e.{ts,js}',
});
