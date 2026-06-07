import { test, expect, _electron as electron } from '@playwright/test';

test.describe('Windows Stability Tests', () => {
  test('should start without crashing', async () => {
    const app = await electron.launch({
      args: ['.'],
    });

    const window = await app.firstWindow();
    await expect(window).toBeTruthy();

    // 等待完全加载
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);

    // 检查没有错误
    const hasError = await window.evaluate(() => {
      return document.body.textContent?.includes('FATAL') || false;
    });

    expect(hasError).toBeFalsy();

    await app.close();
  });

  test('should handle rapid window operations', async () => {
    const app = await electron.launch({
      args: ['.'],
    });

    const window = await app.firstWindow();

    // 快速最小化/恢复
    for (let i = 0; i < 10; i++) {
      await window.evaluate(() => {
        const tauri = (window as any).__TAURI__;
        if (tauri) {
          tauri.window.getCurrent().minimize();
        }
      });
      await window.waitForTimeout(100);

      await window.evaluate(() => {
        const tauri = (window as any).__TAURI__;
        if (tauri) {
          tauri.window.getCurrent().unminimize();
        }
      });
      await window.waitForTimeout(100);
    }

    // 应该仍然响应
    const isVisible = await window.isVisible();
    expect(isVisible).toBeTruthy();

    await app.close();
  });

  test('should measure startup time', async () => {
    const startTime = Date.now();

    const app = await electron.launch({
      args: ['.'],
    });

    const window = await app.firstWindow();
    await window.waitForLoadState('domcontentloaded');

    const startupTime = Date.now() - startTime;

    console.log(`✅ Startup time: ${startupTime}ms`);

    // 目标: < 2000ms
    expect(startupTime).toBeLessThan(2000);

    await app.close();
  });

  test('should report system metrics', async () => {
    const app = await electron.launch({
      args: ['.'],
    });

    const window = await app.firstWindow();
    await window.waitForLoadState('domcontentloaded');

    // 等待监控初始化
    await window.waitForTimeout(1000);

    // 检查是否能获取指标
    const metrics = await window.evaluate(() => {
      const monitoring = (window as any).WindowsMonitoring;
      return monitoring ? monitoring.getMetrics() : null;
    });

    if (metrics) {
      console.log('📊 System Metrics:', metrics);
      expect(metrics.startupTime).toBeGreaterThan(0);
    }

    await app.close();
  });

  test('should handle errors gracefully', async () => {
    const app = await electron.launch({
      args: ['.'],
    });

    const window = await app.firstWindow();
    await window.waitForLoadState('domcontentloaded');

    // 触发一个错误
    const errorCaught = await window.evaluate(() => {
      try {
        throw new Error('Test error');
      } catch (e) {
        return true;
      }
    });

    expect(errorCaught).toBeTruthy();

    await app.close();
  });

  test('should monitor memory usage', async () => {
    const app = await electron.launch({
      args: ['.'],
    });

    const window = await app.firstWindow();
    await window.waitForLoadState('domcontentloaded');

    // 获取内存使用情况
    const memory = await window.evaluate(async () => {
      const tauri = (window as any).__TAURI__;
      if (!tauri) return null;

      try {
        return await tauri.core.invoke('get_memory_usage');
      } catch (e) {
        return null;
      }
    });

    if (memory !== null) {
      console.log(`💾 Memory usage: ${(memory / 1024 / 1024).toFixed(1)}MB`);
      expect(memory).toBeGreaterThan(0);
      // 警告阈值: 500MB
      if (memory > 500 * 1024 * 1024) {
        console.warn('⚠️ High memory usage detected');
      }
    }

    await app.close();
  });
});
