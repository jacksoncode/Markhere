import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  save: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { ExportService } from './ExportService';

const mockInvoke = vi.mocked(invoke);
const mockSave = vi.mocked(save);

/** Helper to extract args from mock calls with safe typing */
function getInvokeArgs<T extends Record<string, unknown> = Record<string, unknown>>(
  callIndex = 0
): T {
  return mockInvoke.mock.calls[callIndex][1] as T;
}

describe('ExportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSave.mockResolvedValue('/fake/output.pdf');
    mockInvoke.mockResolvedValue('/fake/output.pdf');
  });

  // -----------------------------------------------------------------------
  // generateHTML
  // -----------------------------------------------------------------------
  describe('generateHTML', () => {
    it('produces valid HTML structure with DOCTYPE, html, head, body', () => {
      const result = ExportService.generateHTML('<p>Test</p>', 'My Title');

      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('<html lang="zh-CN">');
      expect(result).toContain('<head>');
      expect(result).toContain('</head>');
      expect(result).toContain('<body>');
      expect(result).toContain('</body>');
      expect(result).toContain('</html>');
    });

    it('includes provided content in body', () => {
      const result = ExportService.generateHTML(
        '<h1>Hello</h1><p>World</p>',
        'Test'
      );

      // addHeadingIds adds IDs to headings, so <h1>Hello</h1> becomes <h1 id="hello">Hello</h1>
      expect(result).toContain('Hello');
      expect(result).toContain('<p>World</p>');
    });

    it('includes title in head', () => {
      const result = ExportService.generateHTML('<p>Test</p>', 'Custom Title');

      expect(result).toContain('<title>Custom Title</title>');
    });

    it('calls addHeadingIds to add IDs to headings without IDs', () => {
      const result = ExportService.generateHTML(
        '<h1>Introduction</h1><h2>Details</h2>',
        'Test'
      );

      expect(result).toContain('id="introduction"');
      expect(result).toContain('id="details"');
    });
  });

  // -----------------------------------------------------------------------
  // addHeadingIds
  // -----------------------------------------------------------------------
  describe('addHeadingIds', () => {
    it('adds slugified IDs to headings without IDs', () => {
      const result = ExportService.addHeadingIds(
        '<h1>Hello World</h1><h2>Foo Bar Baz</h2>'
      );

      expect(result).toContain('<h1 id="hello-world">Hello World</h1>');
      expect(result).toContain('<h2 id="foo-bar-baz">Foo Bar Baz</h2>');
    });

    it('preserves existing heading IDs', () => {
      const result = ExportService.addHeadingIds(
        '<h1 id="custom-id">Hello World</h1>'
      );

      expect(result).toBe('<h1 id="custom-id">Hello World</h1>');
      expect(result).not.toContain('id="hello-world"');
    });

    it('handles CJK characters in headings', () => {
      const result = ExportService.addHeadingIds(
        '<h1>你好世界</h1><h2>中文测试内容</h2>'
      );

      expect(result).toContain('id="你好世界"');
      expect(result).toContain('id="中文测试内容"');
    });

    it('does not modify headings that contain HTML tags inside', () => {
      // The regex uses ([^<]*) for heading text, so headings with nested
      // HTML tags are not matched and pass through unchanged.
      const result = ExportService.addHeadingIds(
        '<h1>Hello <code>World</code> Today</h1>'
      );

      // Heading remains unchanged because the text capture group
      // stops at the first '<' (the opening of <code>)
      expect(result).toBe('<h1>Hello <code>World</code> Today</h1>');
      expect(result).not.toContain('id=');
    });

    it('strips leading and trailing dashes from slug', () => {
      const result = ExportService.addHeadingIds('<h1>---Special---</h1>');

      expect(result).toContain('id="special"');
    });

    it('handles h1 through h6 tags', () => {
      const html =
        '<h1>A</h1><h2>B</h2><h3>C</h3><h4>D</h4><h5>E</h5><h6>F</h6>';
      const result = ExportService.addHeadingIds(html);

      expect(result).toContain('<h1 id="a">A</h1>');
      expect(result).toContain('<h2 id="b">B</h2>');
      expect(result).toContain('<h3 id="c">C</h3>');
      expect(result).toContain('<h4 id="d">D</h4>');
      expect(result).toContain('<h5 id="e">E</h5>');
      expect(result).toContain('<h6 id="f">F</h6>');
    });

    it('returns HTML unchanged if no headings present', () => {
      const result = ExportService.addHeadingIds('<p>No headings here</p>');

      expect(result).toBe('<p>No headings here</p>');
    });
  });

  // -----------------------------------------------------------------------
  // preprocessMermaidForExport (tested via exportToHTML)
  // -----------------------------------------------------------------------
  describe('preprocessMermaidForExport (via exportToHTML)', () => {
    it('replaces mermaid div blocks with placeholder text', async () => {
      const content =
        '<div data-type="mermaid" data-content="graph TD\nA--&gt;B"></div>';

      await ExportService.exportToHTML(content, 'Test');

      const args = getInvokeArgs<{ content: string }>();
      const savedHtml = args.content;
      expect(savedHtml).toContain('mermaid-placeholder');
      expect(savedHtml).toContain('<strong>Mermaid Diagram</strong>');
      expect(savedHtml).toContain('language-mermaid');
    });

    it('handles multiple mermaid blocks', async () => {
      const content =
        '<div data-type="mermaid" data-content="graph TD\nA--&gt;B"></div>' +
        '<div data-type="mermaid" data-content="sequenceDiagram\nA-&gt;&gt;B"></div>';

      await ExportService.exportToHTML(content, 'Test');

      const args = getInvokeArgs<{ content: string }>();
      const savedHtml = args.content;
      // Match the actual div elements (not CSS class selectors in <style>)
      const matches = savedHtml.match(/class="mermaid-placeholder"/g);
      expect(matches).toHaveLength(2);
    });

    it('handles content with no mermaid blocks (passthrough)', async () => {
      const content = '<p>Just some text</p><h1>No diagrams</h1>';

      await ExportService.exportToHTML(content, 'Test');

      const args = getInvokeArgs<{ content: string }>();
      const savedHtml = args.content;
      expect(savedHtml).toContain('<p>Just some text</p>');
      expect(savedHtml).toContain('<h1 id="no-diagrams">No diagrams</h1>');
      // CSS in <style> contains .mermaid-placeholder selectors,
      // but no actual mermaid-placeholder divs should be in <body>
      expect(savedHtml).not.toContain('class="mermaid-placeholder"');
    });
  });

  // -----------------------------------------------------------------------
  // preprocessMarkdownMermaidForExport (tested via exportToPDF/Word/EPUB)
  // -----------------------------------------------------------------------
  describe('preprocessMarkdownMermaidForExport (via exportToPDF)', () => {
    it('replaces ```mermaid code blocks with diagram placeholder', async () => {
      const markdown = '```mermaid\ngraph TD\nA-->B\n```';

      await ExportService.exportToPDF(markdown, 'Test');

      const args = getInvokeArgs<{ markdown: string }>();
      const processed = args.markdown;
      expect(processed).toContain('[Diagram: ');
      expect(processed).toContain('A-->B');
      expect(processed).not.toContain('```mermaid');
    });

    it('returns content unchanged when no mermaid blocks present', async () => {
      const markdown = '# Title\n\nSome text\n\n## Section\n\nMore text';

      await ExportService.exportToPDF(markdown, 'Test');

      const args = getInvokeArgs<{ markdown: string }>();
      const processed = args.markdown;
      expect(processed).toBe(markdown);
    });
  });

  // -----------------------------------------------------------------------
  // exportToPDF
  // -----------------------------------------------------------------------
  describe('exportToPDF', () => {
    it('opens save dialog and invokes export_to_pdf', async () => {
      mockSave.mockResolvedValue('/output/doc.pdf');
      mockInvoke.mockResolvedValue('/output/doc.pdf');

      const result = await ExportService.exportToPDF('# Hello', 'Doc');

      expect(mockSave).toHaveBeenCalledWith({
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
        defaultPath: 'Doc.pdf',
      });
      expect(mockInvoke).toHaveBeenCalledWith('export_to_pdf', {
        markdown: '# Hello',
        outputPath: '/output/doc.pdf',
      });
      expect(result).toBe('/output/doc.pdf');
    });
  });

  // -----------------------------------------------------------------------
  // exportToWord
  // -----------------------------------------------------------------------
  describe('exportToWord', () => {
    it('opens save dialog and invokes export_to_word', async () => {
      mockSave.mockResolvedValue('/output/doc.docx');
      mockInvoke.mockResolvedValue('/output/doc.docx');

      const result = await ExportService.exportToWord('# Hello', 'Doc');

      expect(mockSave).toHaveBeenCalledWith({
        filters: [{ name: 'Word', extensions: ['docx'] }],
        defaultPath: 'Doc.docx',
      });
      expect(mockInvoke).toHaveBeenCalledWith('export_to_word', {
        markdown: '# Hello',
        outputPath: '/output/doc.docx',
      });
      expect(result).toBe('/output/doc.docx');
    });
  });

  // -----------------------------------------------------------------------
  // exportToHTML
  // -----------------------------------------------------------------------
  describe('exportToHTML', () => {
    it('opens save dialog and invokes save_file with generated HTML', async () => {
      mockSave.mockResolvedValue('/output/doc.html');
      mockInvoke.mockResolvedValue('/output/doc.html');

      const result = await ExportService.exportToHTML('<p>Hi</p>', 'Web');

      expect(mockSave).toHaveBeenCalledWith({
        filters: [{ name: 'HTML', extensions: ['html'] }],
        defaultPath: 'Web.html',
      });
      expect(mockInvoke).toHaveBeenCalledWith(
        'save_file',
        expect.objectContaining({
          path: '/output/doc.html',
          content: expect.stringContaining('<!DOCTYPE html>'),
        })
      );
      expect(result).toBe('/output/doc.html');
    });
  });

  // -----------------------------------------------------------------------
  // exportToEPUB
  // -----------------------------------------------------------------------
  describe('exportToEPUB', () => {
    it('opens save dialog and invokes export_to_epub with title', async () => {
      mockSave.mockResolvedValue('/output/doc.epub');
      mockInvoke.mockResolvedValue('/output/doc.epub');

      const result = await ExportService.exportToEPUB('# Hello', 'EpubBook');

      expect(mockSave).toHaveBeenCalledWith({
        filters: [{ name: 'EPUB', extensions: ['epub'] }],
        defaultPath: 'EpubBook.epub',
      });
      expect(mockInvoke).toHaveBeenCalledWith('export_to_epub', {
        markdown: '# Hello',
        outputPath: '/output/doc.epub',
        title: 'EpubBook',
      });
      expect(result).toBe('/output/doc.epub');
    });
  });

  // -----------------------------------------------------------------------
  // Error handling: save dialog cancelled
  // -----------------------------------------------------------------------
  describe('error handling', () => {
    it('returns null when save dialog is cancelled for PDF export', async () => {
      mockSave.mockResolvedValue(null);

      const result = await ExportService.exportToPDF('# Hello', 'Doc');

      expect(result).toBeNull();
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('returns null when save dialog is cancelled for Word export', async () => {
      mockSave.mockResolvedValue(null);

      const result = await ExportService.exportToWord('# Hello', 'Doc');

      expect(result).toBeNull();
    });

    it('returns null when save dialog is cancelled for HTML export', async () => {
      mockSave.mockResolvedValue(null);

      const result = await ExportService.exportToHTML('<p>Hi</p>', 'Doc');

      expect(result).toBeNull();
    });

    it('returns null when save dialog is cancelled for EPUB export', async () => {
      mockSave.mockResolvedValue(null);

      const result = await ExportService.exportToEPUB('# Hello', 'Doc');

      expect(result).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Static method availability
  // -----------------------------------------------------------------------
  describe('static methods', () => {
    it('exportToPDF is a static method', () => {
      expect(typeof ExportService.exportToPDF).toBe('function');
    });

    it('exportToWord is a static method', () => {
      expect(typeof ExportService.exportToWord).toBe('function');
    });

    it('exportToHTML is a static method', () => {
      expect(typeof ExportService.exportToHTML).toBe('function');
    });

    it('exportToEPUB is a static method', () => {
      expect(typeof ExportService.exportToEPUB).toBe('function');
    });

    it('generateHTML is a static method', () => {
      expect(typeof ExportService.generateHTML).toBe('function');
    });

    it('addHeadingIds is a static method', () => {
      expect(typeof ExportService.addHeadingIds).toBe('function');
    });
  });
});
