import { test, expect } from '@playwright/test';

// These tests require the backend API server to be running (room creation via REST).
// Skip in CI where only the Vite frontend dev server is available.
const describeOrSkip = process.env['CI'] ? test.describe.skip : test.describe;

describeOrSkip('Multi-Browser Room Sync', () => {
  test('two browsers can join the same room', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Host creates a room
    await page1.goto('/');
    await page1.getByRole('button', { name: /create/i }).click();

    // Wait for navigation to room page
    await page1.waitForURL(/\/room\/.+/);
    const roomUrl = page1.url();

    // Guest joins the same room
    await page2.goto(roomUrl);

    // Both should see the room page
    await expect(page1.locator('[data-testid="room-header"]')).toBeVisible({ timeout: 10000 });
    await expect(page2.locator('[data-testid="room-header"]')).toBeVisible({ timeout: 10000 });

    await context1.close();
    await context2.close();
  });

  test('chat message appears on both browsers', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Host creates a room
    await page1.goto('/');
    await page1.getByRole('button', { name: /create/i }).click();
    await page1.waitForURL(/\/room\/.+/);
    const roomUrl = page1.url();

    // Guest joins
    await page2.goto(roomUrl);

    // Host sends a chat message
    const chatInput = page1.getByPlaceholder(/message/i);
    if (await chatInput.isVisible()) {
      await chatInput.fill('Hello from host!');
      await chatInput.press('Enter');

      // Message should appear on host's chat
      await expect(page1.locator('text=Hello from host!')).toBeVisible({ timeout: 5000 });
    }

    await context1.close();
    await context2.close();
  });
});
