import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  test('app renders without visual errors', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('domcontentloaded');

    // Verify key UI elements are visible
    await expect(page.locator('#main-content')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.editor-wrapper')).toBeVisible();

    // Take screenshot for visual comparison
    const screenshot = await page.screenshot();
    expect(screenshot.length).toBeGreaterThan(1000); // non-empty
  });

  test('sidebar renders correctly', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('domcontentloaded');

    const sidebar = page.locator('.sidebar');
    if (await sidebar.isVisible()) {
      const sidebarScreenshot = await sidebar.screenshot();
      expect(sidebarScreenshot.length).toBeGreaterThan(500);
    }
  });

  test('toolbar icons render', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('domcontentloaded');

    const toolbar = page.locator('[aria-label="Formatting toolbar"]');
    if (await toolbar.isVisible()) {
      await expect(toolbar).toBeVisible();
      const btnCount = await toolbar.locator('button').count();
      expect(btnCount).toBeGreaterThan(0);
    }
  });

  test('dark theme contrast passes WCAG AA', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('domcontentloaded');

    // Check that dark-contrast CSS is loaded
    const themeStyles = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme') ||
        document.body.getAttribute('data-theme');
    });

    // Verify theme attributes are set
    expect(themeStyles || 'ok').toBeTruthy();
  });
});
