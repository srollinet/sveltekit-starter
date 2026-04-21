# Testing

## Test types

| Type      | Runner                   | File pattern                        | Environment |
| --------- | ------------------------ | ----------------------------------- | ----------- |
| Unit      | Vitest                   | `src/**/*.test.ts`                  | Node        |
| Component | Vitest + Testing Library | `src/**/*.svelte.test.ts`           | jsdom       |
| E2E       | Playwright               | `src/**/*.e2e.ts`, `tests/*.e2e.ts` | Browser     |

## Commands

```bash
pnpm test:unit   # unit + component tests
pnpm test:e2e    # end-to-end tests
pnpm test        # all tests
```

## Unit tests

Test pure functions and server utilities in isolation.

```ts
import { describe, expect, it } from 'vitest';
import { myFunction } from './my-module.js';

describe('myFunction', () => {
  it('returns expected result', () => {
    expect(myFunction('input')).toBe('expected');
  });
});
```

## Component tests

Use `@testing-library/svelte` to render components and assert on the DOM.

```ts
import { render, screen } from '@testing-library/svelte';
import MyComponent from './MyComponent.svelte';

it('renders the label', () => {
  render(MyComponent, { props: { label: 'Hello' } });
  expect(screen.getByText('Hello')).toBeInTheDocument();
});
```

## E2E tests

Use Playwright. Co-locate test files with the route they cover, or use `tests/` for cross-cutting flows.

```ts
import { expect, test } from '@playwright/test';

test('page heading is visible', async ({ page }) => {
  await page.goto('/demo/playwright');
  await expect(page.getByRole('heading')).toBeVisible();
});
```
