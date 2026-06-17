import { test, expect } from '@playwright/test';

test.describe('P3 Features E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('P3-1: Slideshow mode - open slideshow view', async ({ page }) => {
    await page.click('[data-testid="command-palette-trigger"]');
    await page.fill('[data-testid="command-search"]', 'slideshow');
    await page.click('[data-testid="command-slideshow-start"]');
    
    await expect(page.locator('.slideshow-view')).toBeVisible();
    await expect(page.locator('.slideshow-controls')).toBeVisible();
  });

  test('P3-1: Slideshow mode - navigate slides', async ({ page }) => {
    await page.click('[data-testid="command-palette-trigger"]');
    await page.fill('[data-testid="command-search"]', 'slideshow');
    await page.click('[data-testid="command-slideshow-start"]');
    
    await page.click('.slideshow-next');
    await expect(page.locator('.slide-counter')).toContainText('2');
    
    await page.click('.slideshow-prev');
    await expect(page.locator('.slide-counter')).toContainText('1');
  });

  test('P3-6: POS highlighting - toggle on', async ({ page }) => {
    await page.click('[data-testid="command-palette-trigger"]');
    await page.fill('[data-testid="command-search"]', 'pos');
    await page.click('[data-testid="command-pos-toggle"]');
    
    await expect(page.locator('.pos-highlight-enabled')).toBeVisible();
  });

  test('P3-6: POS highlighting - color classes applied', async ({ page }) => {
    const editor = page.locator('[data-testid="editor"]');
    await editor.fill('这是一个测试句子');
    
    await page.click('[data-testid="command-palette-trigger"]');
    await page.fill('[data-testid="command-search"]', 'pos');
    await page.click('[data-testid="command-pos-toggle"]');
    
    await expect(editor.locator('.pos-n, .pos-v, .pos-a').first()).toBeVisible();
  });

  test('P3-9: Inline comments - add comment thread', async ({ page }) => {
    const editor = page.locator('[data-testid="editor"]');
    await editor.click();
    await page.keyboard.down('Shift');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.up('Shift');
    
    await page.click('[data-testid="add-comment-btn"]');
    await page.fill('[data-testid="comment-input"]', 'Test comment');
    await page.click('[data-testid="submit-comment"]');
    
    await expect(page.locator('.comment-thread')).toBeVisible();
  });

  test('P3-9: Inline comments - resolve thread', async ({ page }) => {
    await expect(page.locator('.comment-thread.resolved')).not.toBeVisible();
    
    await page.click('.comment-thread .resolve-btn');
    await expect(page.locator('.comment-thread.resolved')).toBeVisible();
  });

  test('P3-10: Sync blocks - create sync block', async ({ page }) => {
    const editor = page.locator('[data-testid="editor"]');
    await editor.click();
    
    await page.click('[data-testid="command-palette-trigger"]');
    await page.fill('[data-testid="command-search"]', 'sync');
    await page.click('[data-testid="command-create-sync-block"]');
    
    await expect(editor.locator('.sync-block')).toBeVisible();
  });

  test('P3-10: Sync blocks - update propagates', async ({ page }) => {
    const block1 = page.locator('.sync-block').first();
    await block1.fill('Updated content');
    
    await expect(page.locator('.sync-block').nth(1)).toContainText('Updated content');
  });

  test('P3-2: Publish to Web - open publish dialog', async ({ page }) => {
    await page.click('[data-testid="command-palette-trigger"]');
    await page.fill('[data-testid="command-search"]', 'publish');
    await page.click('[data-testid="command-publish"]');
    
    await expect(page.locator('.publish-dialog')).toBeVisible();
    await expect(page.locator('.platform-select select')).toBeVisible();
  });

  test('P3-2: Publish to Web - select platform', async ({ page }) => {
    await page.click('[data-testid="command-palette-trigger"]');
    await page.fill('[data-testid="command-search"]', 'publish');
    await page.click('[data-testid="command-publish"]');
    
    await page.selectOption('.platform-select select', 'github-pages');
    await expect(page.locator('[data-testid="repo-input"]')).toBeVisible();
    
    await page.selectOption('.platform-select select', 'netlify');
    await expect(page.locator('[data-testid="netlify-token-input"]')).toBeVisible();
  });

  test('P3-7: Document merge - open merge dialog', async ({ page }) => {
    await page.click('[data-testid="command-palette-trigger"]');
    await page.fill('[data-testid="command-search"]', 'merge');
    await page.click('[data-testid="command-merge"]');
    
    await expect(page.locator('.merge-dialog')).toBeVisible();
    await expect(page.locator('.mode-select select')).toBeVisible();
  });

  test('P3-7: Document merge - preview merged content', async ({ page }) => {
    await page.click('[data-testid="command-palette-trigger"]');
    await page.fill('[data-testid="command-search"]', 'merge');
    await page.click('[data-testid="command-merge"]');
    
    await page.click('.preview-btn');
    await expect(page.locator('.preview-content')).not.toBeEmpty();
  });

  test('P3-11: Encrypted notes - create encrypted note', async ({ page }) => {
    await page.click('[data-testid="command-palette-trigger"]');
    await page.fill('[data-testid="command-search"]', 'encrypt');
    await page.click('[data-testid="command-create-encrypted"]');
    
    await page.fill('[data-testid="note-title"]', 'Secret Note');
    await page.fill('[data-testid="note-password"]', 'testpassword123');
    await page.fill('[data-testid="note-content"]', 'This is a secret');
    await page.click('[data-testid="save-encrypted"]');
    
    await expect(page.locator('.encrypted-note-item')).toBeVisible();
  });

  test('P3-11: Encrypted notes - unlock note', async ({ page }) => {
    await page.click('.encrypted-note-item');
    await page.fill('[data-testid="unlock-password"]', 'testpassword123');
    await page.click('[data-testid="unlock-btn"]');
    
    await expect(page.locator('[data-testid="decrypted-content"]')).toBeVisible();
    await expect(page.locator('[data-testid="decrypted-content"]')).toContainText('This is a secret');
  });

  test('P3-8: Cover editor - set page cover', async ({ page }) => {
    await page.click('[data-testid="command-palette-trigger"]');
    await page.fill('[data-testid="command-search"]', 'cover');
    await page.click('[data-testid="command-set-cover"]');
    
    await expect(page.locator('.cover-editor-dialog')).toBeVisible();
    
    await page.fill('[data-testid="cover-url"]', 'https://example.com/image.jpg');
    await page.click('[data-testid="apply-cover"]');
    
    await expect(page.locator('.page-cover')).toBeVisible();
  });

  test('P3-5: Touchpad gestures - pinch zoom', async ({ page }) => {
    const editor = page.locator('[data-testid="editor"]');
    
    await page.mouse.move(100, 100);
    await page.evaluate(() => {
      const el = document.querySelector('[data-testid="editor"]');
      if (el) {
        el.dispatchEvent(new WheelEvent('wheel', {
          ctrlKey: true,
          deltaY: -100,
          bubbles: true
        }));
      }
    });
    
    const transform = await editor.evaluate((el) => el.style.transform);
    expect(transform).toBeTruthy();
  });
});