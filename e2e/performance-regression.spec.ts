import { test, expect } from '@playwright/test';

test.describe('Performance Regression Tests', () => {
  test('page loads under 5 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - start;
    console.log(`⏱️ Page load: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(5000);
  });

  test('editor interactive under 3 seconds', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('domcontentloaded');

    const start = Date.now();
    const editor = page.locator('.editor-content');
    await expect(editor).toBeVisible({ timeout: 5000 });
    const tti = Date.now() - start;
    console.log(`⏱️ Time to interactive: ${tti}ms`);
    expect(tti).toBeLessThan(3000);
  });

  test('typing 500 characters under 5 seconds', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('domcontentloaded');
    const editor = page.locator('.editor-content');
    await expect(editor).toBeVisible({ timeout: 5000 });

    const text = 'A'.repeat(500);

    const start = Date.now();
    await editor.click();
    await page.keyboard.type(text);
    const duration = Date.now() - start;
    console.log(`⏱️ 500 chars typed in: ${duration}ms`);
    expect(duration).toBeLessThan(5000);
  });

  test('undo/redo 20 times under 3 seconds', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('domcontentloaded');
    const editor = page.locator('.editor-content');
    await expect(editor).toBeVisible({ timeout: 5000 });

    await editor.click();
    for (let i = 0; i < 20; i++) {
      await page.keyboard.type(`L${i}\n`);
    }

    const start = Date.now();
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Meta+z');
    }
    const duration = Date.now() - start;
    console.log(`⏱️ 20 undos in: ${duration}ms`);
    expect(duration).toBeLessThan(3000);
  });

  test('no memory leaks after 50 operations', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('domcontentloaded');
    const editor = page.locator('.editor-content');
    await expect(editor).toBeVisible({ timeout: 5000 });

    // Pre-test: get memory baseline
    const memBefore = await page.evaluate(() => (performance as any).memory?.usedJSHeapSize || 0);

    // Perform 50 operations
    for (let i = 0; i < 50; i++) {
      await editor.click();
      await page.keyboard.type(`Line ${i}. `.repeat(5) + '\n');
      if (i % 10 === 0) {
        await page.keyboard.press('Meta+z');
        await page.keyboard.press('Meta+Shift+z'); // redo
      }
    }

    const memAfter = await page.evaluate(() => (performance as any).memory?.usedJSHeapSize || 0);

    if (memBefore > 0 && memAfter > 0) {
      const growthMB = (memAfter - memBefore) / 1024 / 1024;
      console.log(`💾 Memory growth: ${growthMB.toFixed(1)}MB`);
      // Should not grow more than 50MB for 50 operations
      expect(growthMB).toBeLessThan(50);
    }
  });

  test('CSS animations do not cause layout thrashing', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('domcontentloaded');

    // Measure layout events after 2 seconds of idle
    const layoutCount = await page.evaluate(async () => {
      let count = 0;
      const obs = new PerformanceObserver((list) => {
        for (const _ of list.getEntries()) count++;
      });
      obs.observe({ type: 'layout-shift', buffered: true });
      await new Promise(r => setTimeout(r, 2000));
      obs.disconnect();
      return count;
    });

    console.log(`📐 Layout shifts: ${layoutCount}`);
    // Fewer than 10 layout shifts in 2 seconds is acceptable
    expect(layoutCount).toBeLessThan(10);
  });
});
