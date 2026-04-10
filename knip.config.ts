import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  project: ['src/**/*.{ts,svelte}', '*.{js,ts}'],
  ignoreDependencies: [
    // Loaded via CSS @import / @plugin — not imported in JS
    'tailwindcss',
    'daisyui',
    // Component test utilities — no .svelte tests yet; will be used when added
    '@testing-library/svelte',
    '@testing-library/jest-dom',
    // Dev workflow tooling — not imported in source
    'get-shit-done-cc',
    // pino logger singleton (src/lib/server/logger.ts) not yet used in routes
    'pino',
  ],
  ignore: [
    // Starter $lib barrel — intentionally exported for template users
    'src/lib/index.ts',
    // DB client singleton — foundational export, no app code imports it yet
    'src/lib/server/db/index.ts',
    // Logger singleton — foundational server export, not yet used in routes
    'src/lib/server/logger.ts',
  ],
  ignoreExportsUsedInFile: true,
};

export default config;
