import { test, expect } from '@playwright/test';

test.describe('Export Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForSelector('.editor-content');
  });

  // Helper: open the File menu in the titlebar
  async function openFileMenu(page: ReturnType<typeof test['info']>['page'] | any) {
    // The first menu in the titlebar is "File"
    // Click the first .typora-titlebar-menu-wrapper which contains "File"
    const fileMenuWrapper = page.locator('.typora-titlebar-menu-wrapper').first();
    await fileMenuWrapper.click();
    // Wait for the dropdown to appear
    await page.waitForSelector('.dropdown-menu');
    return page.locator('.dropdown-menu');
  }

  test('should display File menu in titlebar', async ({ page }) => {
    // Verify the File menu label exists in the titlebar
    const fileMenu = page.locator('.typora-titlebar-menu').first();
    await expect(fileMenu).toBeVisible();
    await expect(fileMenu).toContainText(/File|文件/i);
  });

  test('should open File menu dropdown on click', async ({ page }) => {
    const fileMenuWrapper = page.locator('.typora-titlebar-menu-wrapper').first();
    await fileMenuWrapper.click();

    // The dropdown should appear
    const dropdown = page.locator('.dropdown-menu');
    await expect(dropdown).toBeVisible();
  });

  test('should display PDF export option in File menu', async ({ page }) => {
    const fileMenuWrapper = page.locator('.typora-titlebar-menu-wrapper').first();
    await fileMenuWrapper.click();

    const dropdown = page.locator('.dropdown-menu');
    await expect(dropdown).toBeVisible();

    // Look for the Export PDF menu item
    const pdfItem = dropdown.locator('.menu-item').filter({ hasText: /PDF/i });
    await expect(pdfItem).toBeVisible();
  });

  test('should display Word export option in File menu', async ({ page }) => {
    const fileMenuWrapper = page.locator('.typora-titlebar-menu-wrapper').first();
    await fileMenuWrapper.click();

    const dropdown = page.locator('.dropdown-menu');
    const wordItem = dropdown.locator('.menu-item').filter({ hasText: /Word/i });
    await expect(wordItem).toBeVisible();
  });

  test('should display HTML export option in File menu', async ({ page }) => {
    const fileMenuWrapper = page.locator('.typora-titlebar-menu-wrapper').first();
    await fileMenuWrapper.click();

    const dropdown = page.locator('.dropdown-menu');
    const htmlItem = dropdown.locator('.menu-item').filter({ hasText: /HTML/i });
    await expect(htmlItem).toBeVisible();
  });

  test('should display EPUB export option in File menu', async ({ page }) => {
    const fileMenuWrapper = page.locator('.typora-titlebar-menu-wrapper').first();
    await fileMenuWrapper.click();

    const dropdown = page.locator('.dropdown-menu');
    const epubItem = dropdown.locator('.menu-item').filter({ hasText: /EPUB/i });
    await expect(epubItem).toBeVisible();
  });

  test('should close File menu when clicking again', async ({ page }) => {
    const fileMenuWrapper = page.locator('.typora-titlebar-menu-wrapper').first();

    // Open
    await fileMenuWrapper.click();
    let dropdown = page.locator('.dropdown-menu');
    await expect(dropdown).toBeVisible();

    // Close by clicking the menu again
    await fileMenuWrapper.click();
    dropdown = page.locator('.dropdown-menu');
    await expect(dropdown).not.toBeVisible();
  });

  test('should have at least 4 export format options in File menu', async ({ page }) => {
    const fileMenuWrapper = page.locator('.typora-titlebar-menu-wrapper').first();
    await fileMenuWrapper.click();

    const dropdown = page.locator('.dropdown-menu');
    // Count menu items containing export-related text
    const exportItems = dropdown.locator('.menu-item').filter({ hasText: /PDF|Word|HTML|EPUB/i });
    const count = await exportItems.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });
});
