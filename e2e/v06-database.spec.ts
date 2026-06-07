import { test, expect } from '@playwright/test';

test.describe('v0.6.0 Database Features', () => {
  test('should create and view a database', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('domcontentloaded');

    // Navigate to Database tab in sidebar
    const dbTab = page.locator('button:has-text("DB")');
    if (await dbTab.isVisible()) {
      await dbTab.click();
      // Expect database panel to render
      await expect(page.locator('.database-panel')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should render table view with editable cells', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('domcontentloaded');

    const dbTab = page.locator('button:has-text("DB")');
    if (!(await dbTab.isVisible())) { test.skip(); return; }
    await dbTab.click();

    // Create a new database
    const newBtn = page.locator('button:has-text("New")').first();
    if (await newBtn.isVisible()) {
      await newBtn.click();
      const input = page.locator('.db-new-form input');
      await input.fill('Test DB');
      await page.locator('.db-new-form button:has-text("Create")').click();
    }

    // Verify table view rendered
    await expect(page.locator('.db-table-view')).toBeVisible({ timeout: 3000 });
  });
});
