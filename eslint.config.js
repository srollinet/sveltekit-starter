import prettier from 'eslint-config-prettier';
import path from 'node:path';
import { includeIgnoreFile } from '@eslint/compat';
import js from '@eslint/js';
import css from '@eslint/css';
import svelte from 'eslint-plugin-svelte';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';
import svelteConfig from './svelte.config.js';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');
const prettierignorePath = path.resolve(import.meta.dirname, '.prettierignore');

export default defineConfig(
  includeIgnoreFile(gitignorePath),
  includeIgnoreFile(prettierignorePath),
  // JS/TS/Svelte: core rules scoped to lintable files only (prevents conflict with the CSS language plugin)
  {
    files: ['**/*.{js,ts,svelte}'],
    extends: [
      js.configs.recommended,
      ts.configs.recommended,
      svelte.configs.recommended,
      prettier,
      svelte.configs.prettier,
    ],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
      // see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
      'no-undef': 'off',
      // Override or add rule settings here, such as:
      // 'svelte/button-has-type': 'error'
    },
  },
  // Svelte: type-aware parsing requires its own parserOptions block
  {
    files: ['**/*.svelte', '**/*.svelte.{ts,js}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        extraFileExtensions: ['.svelte'],
        parser: ts.parser,
        svelteConfig,
      },
    },
  },
  // CSS: @eslint/css language plugin with Tailwind v4 compatibility
  {
    files: ['**/*.css'],
    plugins: { css },
    language: 'css/css',
    rules: {
      ...css.configs.recommended.rules,
      // Tailwind v4 uses non-standard at-rules (@plugin, @theme, @utility, @variant)
      'css/no-invalid-at-rules': 'off',
    },
  },
);
