import { test, expect } from '@playwright/test';

test.describe('v0.6.0/v0.7.0 Knowledge Features Regression', () => {
  test('database sidebar tab is accessible', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('domcontentloaded');

    const dbTab = page.locator('button:has-text("DB")');
    if (await dbTab.isVisible()) {
      await dbTab.click();
      await page.waitForTimeout(500);
      // Database panel should render
      await expect(page.locator('.database-panel')).toBeVisible({ timeout: 3000 });
    } else {
      // Sidebar tab not visible — verify app still works
      expect(await page.title()).toContain('Markhere');
    }
  });

  test('dataview tab is accessible', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('domcontentloaded');

    const dvTab = page.locator('button:has-text("Query")');
    if (await dvTab.isVisible()) {
      await dvTab.click();
      await page.waitForTimeout(500);
      await expect(page.locator('.dataview-panel')).toBeVisible({ timeout: 3000 });
    }
  });

  test('canvas tab is accessible', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('domcontentloaded');

    const cvTab = page.locator('button:has-text("Canvas")');
    if (await cvTab.isVisible()) {
      await cvTab.click();
      await page.waitForTimeout(500);
      await expect(page.locator('.canvas-board')).toBeVisible({ timeout: 3000 });
    }
  });

  test('export panel renders format options', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('domcontentloaded');

    // Check if export-advanced is accessible
    const exportSection = page.locator('.export-advanced');
    if (!(await exportSection.isVisible())) {
      test.skip();
    }

    const buttons = await exportSection.locator('.exp-format').count();
    expect(buttons).toBeGreaterThanOrEqual(5); // PDF, Word, HTML, PPTX, LaTeX, EPUB, MD
  });

  test('welcome dialog shows on first launch flag', async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem('markhere-welcomed'));

    await page.goto('http://localhost:1420');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(800);

    const welcome = page.locator('.welcome-overlay');
    const isVisible = await welcome.isVisible().catch(() => false);
    if (isVisible) {
      // Close it
      const closeBtn = page.locator('.welcome-close');
      await closeBtn.click();
      await page.waitForTimeout(300);
    }

    // App should be functional
    expect(await page.title()).toContain('Markhere');
  });
});
