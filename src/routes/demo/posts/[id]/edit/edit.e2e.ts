import { expect, test } from '@playwright/test';
import { createPost } from '../../e2e-utils';

test.describe('Edit Post Page', () => {
  test('can navigate to edit page, modify a post, and save it', async ({ page }) => {
    // First, create a post to edit
    const originalTitle = `Pre-edit Title ${Date.now()}`;
    await createPost(page, originalTitle);

    // Find the post and click Edit
    const row = page.getByRole('row', { name: new RegExp(originalTitle) });
    await row.getByRole('link', { name: 'Edit' }).click();

    // Verify we are on the edit page
    await expect(page.getByRole('heading', { name: 'Edit Post' })).toBeVisible();

    // Modify the post
    const updatedTitle = `Updated Title ${Date.now()}`;
    await page.locator('#edit-title').fill(updatedTitle);
    await page.locator('#edit-body').fill('Updated body content.');
    await page.locator('#edit-status').selectOption('published');

    // Save changes
    await page.getByRole('button', { name: 'Save Changes' }).click();

    // Verify redirection back to the posts list
    await expect(page).toHaveURL(/\/demo\/posts$/);

    // Verify the updated post appears in the list
    const updatedRow = page.getByRole('row', { name: new RegExp(updatedTitle) });
    await expect(updatedRow).toBeVisible();
    await expect(updatedRow.locator('.badge')).toContainText('published');

    // Ensure the old title is no longer in the list (assuming it's a unique name we just created)
    await expect(page.getByRole('row', { name: new RegExp(originalTitle) })).toHaveCount(0);
  });

  test('shows validation errors when editing with invalid data', async ({ page }) => {
    // Create a post to edit
    const title = `Validation Edit Test ${Date.now()}`;
    await createPost(page, title);

    // Navigate to edit page
    const row = page.getByRole('row', { name: new RegExp(title) });
    await row.getByRole('link', { name: 'Edit' }).click();

    // Clear the title to trigger validation error
    await page.locator('#edit-title').fill('');
    await page.locator('#edit-title').evaluate((el: HTMLInputElement) => el.removeAttribute('required'));
    await page.getByRole('button', { name: 'Save Changes' }).click();

    // Verify validation error
    await expect(page.locator('p.text-error').first()).toBeVisible();
    await expect(page.locator('p.text-error').first()).toContainText('Title is required');

    // Verify we are still on the edit page
    await expect(page.getByRole('heading', { name: 'Edit Post' })).toBeVisible();
  });
});
