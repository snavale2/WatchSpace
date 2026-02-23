import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('renders the app title', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('WatchSpace');
  });

  test('has a Create Room button', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /create/i })).toBeVisible();
  });

  test('has a room code input and Join button', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByPlaceholder(/room code/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /join/i })).toBeVisible();
  });
});
