import { expect, test } from '@playwright/test';

test('home page renders with heading', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'SvelteKit Battery-Included Starter' })).toBeVisible();
});

test('nav brand link is visible', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'SvelteKit Starter' })).toBeVisible();
});

test('desktop nav Home link is visible and clickable', async ({ page }) => {
  await page.goto('/');
  const homeLink = page.locator('.menu-horizontal').getByRole('link', { name: 'Home' });
  await expect(homeLink).toBeVisible();
  await homeLink.click();
  // After clicking Home, still on the home page
  await expect(page.getByRole('heading', { name: 'SvelteKit Battery-Included Starter' })).toBeVisible();
});

test('theme toggle button is present', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Toggle theme' })).toBeVisible();
});
