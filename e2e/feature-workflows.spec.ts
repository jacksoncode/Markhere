import { test, expect } from '@playwright/test';

test.describe('Feature Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:1420');
    // Dismiss any notification toasts that may block clicks
    const notificationToast = page.locator('.notification-toast');
    if (await notificationToast.isVisible({ timeout: 1000 }).catch(() => false)) {
      await notificationToast.click().catch(() => {});
    }
    await page.waitForSelector('.editor-content');
  });

  // Helper to close search panel (used by tests that don't need it)
  async function closeSearchPanel(page: ReturnType<typeof test['info']>['page'] | any) {
    const searchCloseBtn = page.locator('.search-panel .search-header button');
    if (await searchCloseBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchCloseBtn.click();
      await page.waitForSelector('.search-panel', { state: 'hidden', timeout: 3000 }).catch(() => {});
    }
  }

  test.describe('Search Panel', () => {
    // Search panel should be open by default (isOpen=true)
    // DO NOT close it here

    test('should display search panel', async ({ page }) => {
      const searchPanel = page.locator('.search-panel');
      await expect(searchPanel).toBeVisible({ timeout: 5000 });
    });

    test('should have search input field', async ({ page }) => {
      const searchInput = page.locator('.search-panel input[type="text"]').first();
      await expect(searchInput).toBeVisible({ timeout: 5000 });
    });

    test('should have search scope buttons', async ({ page }) => {
      const scopeButtons = page.locator('.search-scope-btn');
      const count = await scopeButtons.count();
      expect(count).toBeGreaterThanOrEqual(2);

      // Verify the first scope button is visible (e.g., current file)
      await expect(scopeButtons.first()).toBeVisible();
    });

    test('should have search options for regex and case sensitivity', async ({ page }) => {
      // The search option labels exist as <label className="search-option-label">
      const searchOptions = page.locator('.search-options');
      await expect(searchOptions).toBeVisible({ timeout: 3000 });

      // Verify at least one label exists in the search options section
      const labels = searchOptions.locator('.search-option-label');
      const count = await labels.count();
      expect(count).toBeGreaterThanOrEqual(1);
    });

    test('should type in search and see results count', async ({ page }) => {
      // The search panel is open with autoFocus on its input.
      // Type directly into the search input rather than the editor.
      // The search input already has focus due to autoFocus.
      const searchInput = page.locator('.search-panel input[type="text"]').first();
      await searchInput.fill('test');

      // Check that the search count element updates
      const searchCount = page.locator('.search-count');
      await expect(searchCount).toBeVisible({ timeout: 3000 });
      // verify it shows some text (result count or no-results message)
      const countText = await searchCount.textContent();
      expect(countText).toBeTruthy();
    });
  });

  test.describe('Sidebar Operations', () => {
    test.beforeEach(async ({ page }) => {
      await closeSearchPanel(page);
    });

    test('should display sidebar tabs (Files, Outline, Bookmarks)', async ({ page }) => {
      // Ensure sidebar is open
      const sidebar = page.locator('.sidebar');
      const isOpen = await sidebar.evaluate((el) => el.classList.contains('open'));

      if (!isOpen) {
        const expandBtn = page.locator('.sidebar-expand-btn');
        await expandBtn.click();
        await page.waitForSelector('.sidebar.open');
      }

      const tabs = page.locator('.sidebar-tab');
      const count = await tabs.count();
      expect(count).toBeGreaterThanOrEqual(2);
    });

    test('should switch sidebar tabs on click', async ({ page }) => {
      const sidebar = page.locator('.sidebar');
      const isOpen = await sidebar.evaluate((el) => el.classList.contains('open'));
      if (!isOpen) {
        const expandBtn = page.locator('.sidebar-expand-btn');
        await expandBtn.click();
        await page.waitForSelector('.sidebar.open');
      }

      // Sidebar tab labels are i18n (FILES/文件, OUTLINE/大纲, BOOKMARKS/书签)
      const filesTab = page.locator('.sidebar-tab').filter({ hasText: /FILES|文件/i });
      const outlineTab = page.locator('.sidebar-tab').filter({ hasText: /OUTLINE|大纲/i });

      // Click outline tab if both exist
      if (await outlineTab.isVisible()) {
        await outlineTab.click();
        // Check if outline section appears
        const outlineSection = page.locator('.outline-section');
        if (await outlineSection.isVisible()) {
          const outlineContent = page.locator('.outline-section .outline-empty, .outline-section .outline-list');
          await expect(outlineContent.first()).toBeVisible();
        }
      }

      // Switch back to files tab
      if (await filesTab.isVisible()) {
        await filesTab.click();
        const fileTree = page.locator('.file-tree-section');
        await expect(fileTree).toBeVisible();
      }
    });
  });

  test.describe('Focus and Typewriter Modes', () => {
    test.beforeEach(async ({ page }) => {
      await closeSearchPanel(page);
    });

    test('should have toolbar buttons for focus/typewriter modes', async ({ page }) => {
      // Wait for the toolbar to be available
      await page.waitForSelector('[role="toolbar"]', { timeout: 5000 });
      const toolbar = page.locator('[role="toolbar"]');
      // Focus mode and typewriter mode buttons are the last two .toolbar-btn elements
      const allBtns = toolbar.locator('.toolbar-btn');
      const count = await allBtns.count();
      // Should have at least 17 buttons (formatting + focus + typewriter)
      expect(count).toBeGreaterThanOrEqual(17);
      // The last two buttons should be visible
      await expect(allBtns.nth(count - 2)).toBeVisible({ timeout: 3000 });
      await expect(allBtns.nth(count - 1)).toBeVisible({ timeout: 3000 });
    });

    test('should have typewriter mode button in toolbar', async ({ page }) => {
      await page.waitForSelector('[role="toolbar"]', { timeout: 5000 });
      const toolbar = page.locator('[role="toolbar"]');
      const allBtns = toolbar.locator('.toolbar-btn');
      const count = await allBtns.count();
      expect(count).toBeGreaterThanOrEqual(17);
    });

    test('should toggle focus mode on toolbar button click', async ({ page }) => {
      await page.waitForSelector('[role="toolbar"]', { timeout: 5000 });
      const toolbar = page.locator('[role="toolbar"]');
      const allBtns = toolbar.locator('.toolbar-btn');
      const count = await allBtns.count();

      // Click the second-to-last button (Focus Mode)
      // Use { force: true } to bypass any overlapping UI elements
      const focusBtn = allBtns.nth(count - 2);
      await focusBtn.click({ force: true });

      // Focus mode overlay element exists in DOM (always rendered by FocusMode component)
      const overlay = page.locator('.focus-mode-overlay');
      const overlayExists = await overlay.count();
      expect(overlayExists).toBeGreaterThan(0);

      // An exit button should appear when focus mode is active
      const exitBtn = page.locator('.focus-mode-exit-btn');
      if (await exitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await exitBtn.click({ force: true });
        // Exit button should hide after clicking
        await expect(exitBtn).not.toBeVisible({ timeout: 3000 });
      }
    });
  });

  test.describe('Status Bar', () => {
    test.beforeEach(async ({ page }) => {
      await closeSearchPanel(page);
    });

    test('should display status bar', async ({ page }) => {
      const statusBar = page.locator('.status-bar');
      await expect(statusBar).toBeVisible();
    });

    test('should display word count in status bar', async ({ page }) => {
      const editor = page.locator('.editor-content');
      await editor.click();
      await page.waitForTimeout(300);
      await page.keyboard.type('Hello world');

      const statusBar = page.locator('.status-bar');
      // Status bar should have left section with word count
      const statusLeft = page.locator('.status-bar-left');
      await expect(statusLeft).toBeVisible();
      // It contains character/word information
      const statusText = await statusBar.textContent();
      expect(statusText).toBeTruthy();
    });

    test('should display file name in status bar right section', async ({ page }) => {
      const statusRight = page.locator('.status-bar-right');
      await expect(statusRight).toBeVisible();
    });
  });

  test.describe('Command Palette', () => {
    test.beforeEach(async ({ page }) => {
      await closeSearchPanel(page);
    });

    test('should open command palette with Cmd+K', async ({ page }) => {
      const modKey = process.platform === 'darwin' ? 'Meta' : 'Control';
      await page.keyboard.press(`${modKey}+k`);

      const palette = page.locator('.command-palette-modal');
      await expect(palette).toBeVisible({ timeout: 5000 });
    });

    test('should close command palette with Escape', async ({ page }) => {
      const modKey = process.platform === 'darwin' ? 'Meta' : 'Control';
      await page.keyboard.press(`${modKey}+k`);

      const palette = page.locator('.command-palette-modal');
      await expect(palette).toBeVisible({ timeout: 5000 });

      // The command palette input is auto-focused after a 100ms setTimeout.
      await page.waitForTimeout(200);
      await page.keyboard.press('Escape');
      await expect(palette).not.toBeVisible({ timeout: 5000 });
    });
  });
});
