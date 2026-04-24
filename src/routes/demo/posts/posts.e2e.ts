import { expect, test } from '@playwright/test';
import { createPost } from './e2e-utils';

test.describe('Posts Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo/posts');
  });

  test('renders the posts page and its headings', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Posts', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'New Post' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'All Posts' })).toBeVisible();
  });

  test('can create a new post and it appears in the list', async ({ page }) => {
    const uniqueTitle = `Test Post ${Date.now()}`;
    await createPost(page, uniqueTitle, 'published');

    // Check if the post appears in the list table
    const row = page.getByRole('row', { name: new RegExp(uniqueTitle) });
    await expect(row).toBeVisible();
    // Verify the status badge
    await expect(row.locator('.badge')).toContainText('published');
  });

  test('shows validation errors for empty title', async ({ page }) => {
    // Clear the form just in case
    await page.locator('#create-title').fill('');
    await page.locator('#create-body').fill('Body text');

    // Check HTML5 validation first since Superforms adds `required`
    const isTitleValid = await page.locator('#create-title').evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(isTitleValid).toBe(false);

    // Bypass HTML5 validation to test SvelteKit Superforms server/client custom validation
    await page.locator('#create-title').evaluate((el: HTMLInputElement) => el.removeAttribute('required'));

    // Submit the form without filling the required title
    await page.getByRole('button', { name: 'Create Post' }).click();

    // Wait for the text-error paragraph to be attached
    await expect(page.locator('p.text-error').first()).toBeVisible();
    await expect(page.locator('p.text-error').first()).toContainText('Title is required');
  });

  test('can change post status from the list', async ({ page }) => {
    const uniqueTitle = `Status Test Post ${Date.now()}`;

    // Create a new post to test status change
    await createPost(page, uniqueTitle, 'draft');

    // Find the row for the newly created post
    const row = page.getByRole('row', { name: new RegExp(uniqueTitle) });

    // Wait for the badge to be 'draft'
    await expect(row.locator('.badge').filter({ hasText: 'draft' })).toBeVisible();

    // Change the status to 'archived' using the select dropdown in the row
    await row.locator('select[name="status"]').selectOption('archived');

    // The form auto-submits, check if the badge updates to 'archived'
    await expect(row.locator('.badge').filter({ hasText: 'archived' })).toBeVisible();
  });
  test('can delete a post', async ({ page }) => {
    const uniqueTitle = `Delete Test Post ${Date.now()}`;
    await createPost(page, uniqueTitle, 'draft');

    const row = page.getByRole('row', { name: new RegExp(uniqueTitle) });
    await expect(row).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());

    await row.getByRole('button', { name: 'Delete' }).click();

    await expect(row).not.toBeVisible();
  });

  test('canceling the delete dialog does not delete the post', async ({ page }) => {
    const uniqueTitle = `Cancel Delete Test Post ${Date.now()}`;
    await createPost(page, uniqueTitle, 'draft');

    const row = page.getByRole('row', { name: new RegExp(uniqueTitle) });
    await expect(row).toBeVisible();

    page.once('dialog', (dialog) => dialog.dismiss());

    await row.getByRole('button', { name: 'Delete' }).click();

    await expect(row).toBeVisible();
  });
});
