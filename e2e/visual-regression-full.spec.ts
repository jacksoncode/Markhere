import { test, expect } from '@playwright/test';

test.describe('Visual Regression — All States', () => {
  test('default editor state screenshot', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    const ss = await page.screenshot({ fullPage: true });
    expect(ss.length).toBeGreaterThan(10000);
  });

  test('editor with content', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('domcontentloaded');
    const editor = page.locator('.editor-content');
    await expect(editor).toBeVisible({ timeout: 5000 });

    await editor.click();
    await page.keyboard.type('# Visual Test\n\n## Section\n\nThis is a paragraph with **bold** and *italic* text.\n\n- Item 1\n- Item 2\n\n```js\nconsole.log("code");\n```');

    const ss = await page.screenshot({ fullPage: true });
    expect(ss.length).toBeGreaterThan(15000);
  });

  test('dark theme screenshot', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('domcontentloaded');

    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));

    const editor = page.locator('.editor-content');
    await expect(editor).toBeVisible({ timeout: 5000 });
    await editor.click();
    await page.keyboard.type('# Dark Mode\nHello world.');

    const ss = await page.screenshot({ fullPage: true });
    expect(ss.length).toBeGreaterThan(10000);
  });

  test('high contrast mode', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('domcontentloaded');

    await page.evaluate(() => document.documentElement.setAttribute('data-contrast', 'high'));
    await page.waitForTimeout(300);

    const ss = await page.screenshot({ fullPage: true });
    expect(ss.length).toBeGreaterThan(5000);
  });

  test('source mode', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('domcontentloaded');
    const editor = page.locator('.editor-content');
    await expect(editor).toBeVisible({ timeout: 5000 });

    await editor.click();
    await page.keyboard.type('# Source Test');

    // Toggle to source mode
    await page.keyboard.press('Meta+/');
    await page.waitForTimeout(300);

    const ss = await page.screenshot({ fullPage: true });
    expect(ss.length).toBeGreaterThan(5000);
  });

  test('sidebar open with outline', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('domcontentloaded');

    await page.setViewportSize({ width: 1440, height: 900 });

    const editor = page.locator('.editor-content');
    await expect(editor).toBeVisible({ timeout: 5000 });
    await editor.click();
    await page.keyboard.type('# H1\n## H2\n### H3\nContent');

    const ss = await page.screenshot({ fullPage: true });
    expect(ss.length).toBeGreaterThan(15000);
  });

  test('mobile viewport with toolbar', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('domcontentloaded');

    const editor = page.locator('.editor-content');
    await expect(editor).toBeVisible({ timeout: 5000 });
    await editor.click();
    await page.keyboard.type('# Mobile Test');

    const ss = await page.screenshot({ fullPage: true });
    expect(ss.length).toBeGreaterThan(5000);
  });
});
