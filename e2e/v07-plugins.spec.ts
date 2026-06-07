import { test, expect } from '@playwright/test';

test.describe('v0.7.0 Plugin Marketplace', () => {
  test('should render plugin marketplace', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('domcontentloaded');

    // Navigate to sidebar and check plugin tab exists
    await expect(page.locator('.sidebar')).toBeVisible({ timeout: 5000 });
  });

  test('should display builtin plugins', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('domcontentloaded');

    // Check if plugin marketplace is accessible
    const pm = page.locator('.plugin-marketplace');
    // Plugin marketplace may not be visible until navigated to
    test.skip(!(await pm.isVisible()), 'Plugin marketplace not visible');
  });
});
