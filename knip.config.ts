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
  ],
  ignore: [
    // Starter $lib barrel — intentionally exported for template users
    'src/lib/index.ts',
  ],
  ignoreExportsUsedInFile: true,
};

export default config;
