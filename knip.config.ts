import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  project: ['src/**/*.ts', '*.{js,ts}'],
  ignoreDependencies: [
    // Loaded via CSS @import / @plugin — not imported in JS
    'tailwindcss',
    'daisyui',
    // Required by @testcontainers/postgresql, not imported directly
    'testcontainers',
  ],
  ignore: [
    // Starter $lib barrel — intentionally exported for template users
    'src/lib/index.ts',
    // TODO: remove when first app route imports db — Knip will then detect it naturally
    'src/lib/server/db/index.ts',
  ],
  ignoreExportsUsedInFile: true,
};

export default config;
