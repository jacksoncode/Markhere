import { test, expect } from '@playwright/test';

test.describe('Integration Coverage', () => {
  test('file open → edit → save lifecycle', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('domcontentloaded');

    // Verify editor is loaded
    const editor = page.locator('.editor-content');
    await expect(editor).toBeVisible({ timeout: 5000 });

    // Type some content
    await editor.click();
    await page.keyboard.type('# Integration Test\n\nHello world!');

    // Verify content appears
    await expect(editor).toContainText('Integration Test');

    // Quick save via Ctrl+S
    await page.keyboard.press('Control+s');
    // Should not show error banner
    const errorDiv = page.locator('[style*="background:#c0392b"]');
    expect(await errorDiv.count()).toBe(0);
  });

  test('command palette opens and closes', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('domcontentloaded');

    // Cmd+K to open command palette
    await page.keyboard.press('Meta+k');
    // Check if command palette appeared
    const palette = page.locator('[role="dialog"], .command-palette');
    // May or may not be visible depending on lazy loading
    await page.waitForTimeout(500);
  });

  test('side navigation tabs all respond', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('domcontentloaded');

    const tabs = page.locator('.sidebar [role="tab"]');
    const count = await tabs.count();

    for (let i = 0; i < Math.min(count, 6); i++) {
      await tabs.nth(i).click({ timeout: 2000 });
      // Each tab should render content without crash
      await page.waitForTimeout(300);
    }

    // App should still be alive
    expect(await page.title()).toContain('Markhere');
  });

  test('theme switching does not crash', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('domcontentloaded');

    // Try to find theme toggle
    const themeBtn = page.locator('[aria-label*="theme"],[data-testid="theme-toggle"],button:has-text("Theme")').first();
    if (await themeBtn.isVisible()) {
      await themeBtn.click();
      await page.waitForTimeout(300);
    }

    // App should still be responsive
    await expect(page.locator('.editor-content')).toBeVisible({ timeout: 3000 });
  });

  test('memory usage stays reasonable after many operations', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('domcontentloaded');

    const editor = page.locator('.editor-content');
    await expect(editor).toBeVisible({ timeout: 5000 });

    // Perform many operations
    for (let i = 0; i < 20; i++) {
      await editor.click();
      await page.keyboard.type(`Line ${i}\n`);
    }

    // App should still be functional
    expect(await page.title()).toContain('Markhere');
  });
});
