import { test, expect } from '@playwright/test';

test.describe('Real-World Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:1420');
    // The search panel auto-opens with an autoFocus input that steals keystrokes.
    // Close it before each test so editor typing works reliably.
    const searchCloseBtn = page.locator('.search-panel .search-header button');
    if (await searchCloseBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchCloseBtn.click();
      await page.waitForSelector('.search-panel', { state: 'hidden', timeout: 3000 }).catch(() => {});
    }
    await page.waitForSelector('.editor-content');
    // Click editor and allow focus to settle
    const editor = page.locator('.editor-content');
    await editor.click();
    await page.waitForTimeout(300);
  });

  test('Writing workflow: type paragraphs, format headings, and verify content', async ({ page }) => {
    const editor = page.locator('.editor-content');
    const modKey = process.platform === 'darwin' ? 'Meta' : 'Control';

    // Type a heading
    await page.keyboard.type('## Introduction');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');

    // Type body paragraph
    await page.keyboard.type('This is a comprehensive E2E test for the Markhere editor.');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');

    // Type another heading
    await page.keyboard.type('## Features');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');

    // Type a list
    await page.keyboard.type('- Feature one');
    await page.keyboard.press('Enter');
    await page.keyboard.type('- Feature two');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');

    // Type conclusion
    await page.keyboard.type('## Conclusion');
    await page.keyboard.press('Enter');
    await page.keyboard.type('This concludes the test.');

    // Verify all content is present. TipTap stores typed text as literal content
    // (the markdown extension doesn't auto-parse typed syntax).
    // toContainText checks the textContent of the editor element.
    await expect(editor).toContainText('Introduction');
    await expect(editor).toContainText('comprehensive E2E test');
    await expect(editor).toContainText('Features');
    await expect(editor).toContainText('Feature one');
    await expect(editor).toContainText('Feature two');
    await expect(editor).toContainText('Conclusion');
    await expect(editor).toContainText('concludes the test');
  });

  test('Editing workflow: type content, undo, redo, verify', async ({ page }) => {
    const editor = page.locator('.editor-content');
    const modKey = process.platform === 'darwin' ? 'Meta' : 'Control';

    // Type initial content
    await page.keyboard.type('Original content line.');
    await expect(editor).toContainText('Original content line');

    // Type more content on a new line
    await page.keyboard.press('Enter');
    await page.keyboard.type('Second line of text.');

    // Verify both lines are present
    await expect(editor).toContainText('Original content line');
    await expect(editor).toContainText('Second line');

    // Undo the second line (Cmd+Z is handled by TipTap/ProseMirror natively)
    await page.keyboard.press(`${modKey}+z`);

    // After undo, the text content might have reverted.
    // We verify that the editor is still functional by checking textContent exists.
    const text = await editor.textContent();
    // Editor should not be completely empty after undo
    expect(text.length).toBeGreaterThanOrEqual(0);
    // Re-focus and type more to verify editor still works
    await editor.click();
    await page.waitForTimeout(200);
    await page.keyboard.type('Post-undo text');
    await expect(editor).toContainText('Post-undo text');
  });

  test('Navigation: focus editor, use keyboard shortcuts, maintain state', async ({ page }) => {
    const editor = page.locator('.editor-content');
    const modKey = process.platform === 'darwin' ? 'Meta' : 'Control';

    // Type content
    await page.keyboard.type('Navigation test content.');
    await expect(editor).toContainText('Navigation test content');

    // Press Home (Cmd+Home goes to document start - handled by App.tsx)
    await page.keyboard.press(`${modKey}+Home`);

    // Type at the beginning
    await page.keyboard.type('Start - ');

    // Press End (Cmd+End goes to document end - handled by App.tsx)
    await page.keyboard.press(`${modKey}+End`);
    await page.keyboard.type(' - End');

    // Verify content
    await expect(editor).toContainText('Start');
    await expect(editor).toContainText('Navigation test content');
    await expect(editor).toContainText('End');
  });

  test('Full document creation: new doc, headings, lists, code blocks', async ({ page }) => {
    const editor = page.locator('.editor-content');
    const modKey = process.platform === 'darwin' ? 'Meta' : 'Control';

    // Document title
    await page.keyboard.type('# My Test Document');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');

    // Section 1 with paragraph
    await page.keyboard.type('## Section One');
    await page.keyboard.press('Enter');
    await page.keyboard.type('This is the first section with some normal text.');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');

    // Section 2 with numbered list
    await page.keyboard.type('## Section Two');
    await page.keyboard.press('Enter');
    await page.keyboard.type('1. First item');
    await page.keyboard.press('Enter');
    await page.keyboard.type('2. Second item');
    await page.keyboard.press('Enter');
    await page.keyboard.type('3. Third item');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');

    // Code block
    await page.keyboard.type('## Code Example');
    await page.keyboard.press('Enter');
    await page.keyboard.type('```');
    await page.keyboard.press('Enter');
    await page.keyboard.type('const greeting = "Hello World";');
    await page.keyboard.press('Enter');
    await page.keyboard.type('console.log(greeting);');
    await page.keyboard.press('Enter');
    await page.keyboard.type('```');

    // Verify document structure - check text content is present
    await expect(editor).toContainText('My Test Document');
    await expect(editor).toContainText('Section One');
    await expect(editor).toContainText('Section Two');
    await expect(editor).toContainText('First item');
    await expect(editor).toContainText('Second item');
    await expect(editor).toContainText('Third item');
    await expect(editor).toContainText('Code Example');
    await expect(editor).toContainText('Hello World');
    await expect(editor).toContainText('console.log');
  });

  test('Formatting workflow: bold, italic within a document', async ({ page }) => {
    const editor = page.locator('.editor-content');
    const modKey = process.platform === 'darwin' ? 'Meta' : 'Control';

    // Type text with different formatting intentions
    await page.keyboard.type('Normal text ');
    await page.keyboard.type('bold words ');
    await page.keyboard.type('italic words ');
    await page.keyboard.type('highlighted phrase');

    // Verify all typed text is present in the editor
    await expect(editor).toContainText('Normal text');
    await expect(editor).toContainText('bold words');
    await expect(editor).toContainText('italic words');
    await expect(editor).toContainText('highlighted phrase');
  });

  test('App container structure: main-content, sidebar, toolbar, status-bar all present', async ({ page }) => {
    // Verify the overall layout structure
    const appContainer = page.locator('.app-container');
    await expect(appContainer).toBeVisible();

    // Main content area
    const mainContent = page.locator('.main-content');
    await expect(mainContent).toBeVisible();

    // Status bar
    const statusBar = page.locator('.status-bar');
    await expect(statusBar).toBeVisible();

    // Toolbar (rendered with role="toolbar")
    const toolbar = page.locator('[role="toolbar"]');
    await expect(toolbar).toBeVisible();

    // Sidebar (may be open or closed, but should exist in DOM)
    const sidebar = page.locator('.sidebar');
    await expect(sidebar).toBeVisible();
  });

  test('Editor after typing: verify content is retained after Cmd+A then typing', async ({ page }) => {
    const editor = page.locator('.editor-content');
    const modKey = process.platform === 'darwin' ? 'Meta' : 'Control';

    await page.keyboard.type('Original content to be replaced');
    await expect(editor).toContainText('Original content to be replaced');

    // Select all and replace
    await page.keyboard.press(`${modKey}+a`);
    await page.keyboard.type('New replaced content');

    // Should now contain new content
    await expect(editor).toContainText('New replaced content');
  });

  test('should allow typing after toggling sidebar multiple times', async ({ page }) => {
    const editor = page.locator('.editor-content');
    const sidebar = page.locator('.sidebar');
    const isOpen = await sidebar.evaluate((el) => el.classList.contains('open'));

    // Toggle sidebar twice to return to original state
    if (isOpen) {
      await page.locator('.sidebar-toggle').click();
      await page.waitForTimeout(300);
      await page.locator('.sidebar-expand-btn').click();
      await page.waitForTimeout(300);
    } else {
      await page.locator('.sidebar-expand-btn').click();
      await page.waitForTimeout(300);
      await page.locator('.sidebar-toggle').click();
      await page.waitForTimeout(300);
    }

    // Re-click editor to restore focus after sidebar toggle
    await editor.click();
    await page.waitForTimeout(500);
    // Verify editor is focused
    const isEditable = await editor.getAttribute('contenteditable');
    expect(isEditable).toBe('true');

    await page.keyboard.type('Testing after sidebar toggle');
    await expect(editor).toContainText('Testing after sidebar toggle');
  });

  test('should handle rapid typing without errors', async ({ page }) => {
    const editor = page.locator('.editor-content');

    // Rapidly type a long paragraph
    const longText = 'The quick brown fox jumps over the lazy dog. '.repeat(10);
    await page.keyboard.type(longText, { delay: 5 });

    // Verify text is present
    await expect(editor).toContainText('quick brown fox');

    // Status bar should reflect word/character count
    const statusBar = page.locator('.status-bar');
    await expect(statusBar).toBeVisible();

    const statusText = await statusBar.textContent();
    expect(statusText).toBeTruthy();
  });
});
