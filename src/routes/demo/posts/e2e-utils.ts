import { expect, type Page } from '@playwright/test';

/**
 * Helper to create a new post via the UI
 */
export async function createPost(page: Page, title: string, status = 'published') {
  await page.goto('/demo/posts');
  await page.locator('#create-title').fill(title);
  await page.locator('#create-body').fill('Body text');
  await page.locator('#create-status').selectOption(status);
  await page.getByRole('button', { name: 'Create Post' }).click();
  await expect(page.locator('.alert-success')).toContainText('Post created!');
}
