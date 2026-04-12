---
phase: 07-testing
reviewed: 2026-04-12T08:59:48Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - knip.config.ts
  - package.json
  - pnpm-lock.yaml
  - src/lib/components/StackBadge.svelte
  - src/lib/components/StackBadge.svelte.test.ts
  - src/routes/api/health/health.test.ts
  - tests/smoke.e2e.ts
  - vite.config.ts
  - vitest-setup.ts
findings:
  critical: 0
  warning: 2
  info: 3
  total: 5
status: issues_found
---

# Phase 07: Code Review Report

**Reviewed:** 2026-04-12T08:59:48Z
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

The testing infrastructure is well-structured overall. The unit/component/e2e split in `vite.config.ts` is clean, the `vi.mock` getter pattern in `health.test.ts` correctly handles hoisting order, and the Testcontainers integration provides real database confidence. No security issues found.

Two warnings are present: the health test mocks `db` as `null`, which means any test path that calls through `drizzle` ORM would silently succeed (rather than fail) making the mock potentially misleading for future tests added to this describe block; and the E2E smoke tests use a CSS class selector (`.menu-horizontal`) as a locator anchor, which couples tests to implementation details and can silently break when styles are refactored.

Three info items cover: a missing negative path test (DB unreachable → 503) for the health endpoint, `pnpm-lock.yaml` not being excluded from Knip's project glob, and a `prettier` version pinned exactly rather than with a range specifier.

---

## Warnings

### WR-01: Health test mocks `db` as `null` — any future test using ORM will silently pass regardless

**File:** `src/routes/api/health/health.test.ts:16`
**Issue:** The mock for `$lib/server/db` sets `db: null`. The current health handler only uses `client` (raw pg Pool) so this is harmless today, but the mock is placed at the describe-block level and will be reused by any future tests added here. If a developer adds a test that exercises a code path calling `drizzle` methods on `db`, the call will throw a `TypeError: Cannot read properties of null` which produces a confusing error rather than a meaningful test failure. Returning a stub object (even an empty one) would make failures self-documenting.
**Fix:**

```typescript
vi.mock('$lib/server/db', () => ({
  get client() {
    return testPool;
  },
  get db() {
    // Return a minimal stub so ORM calls fail with a clear error,
    // not a null-dereference TypeError.
    return {
      select: vi.fn(() => {
        throw new Error('db stub: not configured for this test');
      }),
      insert: vi.fn(() => {
        throw new Error('db stub: not configured for this test');
      }),
    };
  },
}));
```

### WR-02: E2E test uses CSS class selector as locator anchor — fragile coupling to styling

**File:** `tests/smoke.e2e.ts:15`
**Issue:** `page.locator('.menu-horizontal')` scopes the `Home` link lookup by a Tailwind/DaisyUI utility class. If the nav markup is refactored (e.g., the responsive menu class changes or the element is restructured), this test will silently stop finding the element and fail with an unintuitive "element not found" message. Playwright best-practice is to use semantic role selectors or `data-testid` attributes.
**Fix:**

```typescript
// Option A — add data-testid="desktop-nav" to the nav element in the component
const homeLink = page.locator('[data-testid="desktop-nav"]').getByRole('link', { name: 'Home' });

// Option B — use ARIA landmark if the nav has role="navigation" with an accessible name
const homeLink = page.getByRole('navigation', { name: 'Desktop' }).getByRole('link', { name: 'Home' });
```

---

## Info

### IN-01: No test for the unhappy path (DB unreachable → 503)

**File:** `src/routes/api/health/health.test.ts:50`
**Issue:** The test suite only covers the happy path (DB reachable, 200 response). The 503 error branch in `+server.ts` (lines 26–27) is exercised only when `client.query` rejects, which is never triggered. Missing this path means a regression in error handling would go undetected.
**Fix:** Add a test that uses a broken pool (or a pool whose `query` method is mocked to throw) and asserts `response.status === 503` and `body.db === 'error'`:

```typescript
it('returns 503 with { status: error, db: error } when database is unreachable', async () => {
  // Temporarily replace testPool.query to simulate DB failure
  const originalQuery = testPool.query.bind(testPool);
  testPool.query = vi.fn().mockRejectedValueOnce(new Error('connection refused'));
  const response = await GET({} as Parameters<typeof GET>[0]);
  const body = await response.json();
  expect(response.status).toBe(503);
  expect(body.status).toBe('error');
  expect(body.db).toBe('error');
  testPool.query = originalQuery;
});
```

### IN-02: `prettier` dependency pinned to exact version rather than range

**File:** `package.json:57`
**Issue:** All other `devDependencies` use caret ranges (`^`), but `prettier` is pinned to `"3.8.1"` (exact). This inconsistency means `pnpm update` will silently skip Prettier patch/minor releases. This is a minor policy inconsistency rather than a bug, but may be unintentional.
**Fix:** Change to `"prettier": "^3.8.1"` to align with the rest of the dev dependency policy, unless the exact pin is deliberate (e.g., to ensure team-wide formatting consistency — in which case a comment would clarify intent).

### IN-03: `knip.config.ts` `project` glob includes all root `*.ts` files, which will match test config files themselves

**File:** `knip.config.ts:4`
**Issue:** `project: ['src/**/*.{ts,svelte}', '*.{js,ts}']` — the second glob matches `vitest-setup.ts`, `playwright.config.ts`, `vite.config.ts`, and `knip.config.ts` at the repo root. This is likely intentional (so Knip sees dev tooling entry points), but it also means Knip will flag any symbol in these config files as "used in file" only. With `ignoreExportsUsedInFile: true` this is safe, but worth confirming the intent is to include them rather than only `*.config.{js,ts}`.
**Fix:** If only tooling config files should be included (not arbitrary root scripts), narrow the glob:

```typescript
project: ['src/**/*.{ts,svelte}', '*.config.{js,ts}'],
```

---

_Reviewed: 2026-04-12T08:59:48Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
