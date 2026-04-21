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
    // Schema files export types for consumers (forms, API clients, etc.)
    'src/**/schema.ts',
  ],
  ignoreExportsUsedInFile: true,
};

export default config;
