import { test, expect } from '@playwright/test';

test.describe('Markhere Editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:1420');
    // Close the search panel which auto-opens and has an autoFocus input
    // that can steal keystrokes from the editor
    const searchCloseBtn = page.locator('.search-panel .search-header button');
    if (await searchCloseBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchCloseBtn.click();
      // Wait for search panel to close
      await page.waitForSelector('.search-panel', { state: 'hidden', timeout: 3000 }).catch(() => {});
    }
    await page.waitForSelector('.editor-content');
  });

  test('should load the editor', async ({ page }) => {
    await expect(page.locator('.editor-content')).toBeVisible();
  });

  test('should type text', async ({ page }) => {
    const editor = page.locator('.editor-content');
    await editor.click();
    // Small delay to ensure focus settles before typing
    await page.waitForTimeout(300);
    await page.keyboard.type('Hello Markhere');
    await expect(editor).toContainText('Hello Markhere');
  });

  test('should toggle sidebar', async ({ page }) => {
    const sidebar = page.locator('.sidebar');
    await expect(sidebar).toBeVisible();
    const toggleBtn = page.locator('.sidebar-toggle');
    await toggleBtn.click();
    await expect(sidebar).toHaveClass(/closed/);
  });
});
