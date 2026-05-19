import { describe, it, expect, beforeEach, vi } from 'vitest';

/* ------------------------------------------------------------------ */
/*  Mock Tauri dependencies at module level (hoisted by vitest)       */
/* ------------------------------------------------------------------ */
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  save: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { ExportService } from '../../services/ExportService';

/* ------------------------------------------------------------------ */
/*  ExportService – HTML generation                                    */
/* ------------------------------------------------------------------ */
describe('ExportService - HTML generation', () => {
  describe('generateHTML', () => {
    it('produces valid HTML document structure with DOCTYPE, html, head, and body', () => {
      const html = ExportService.generateHTML('<p>Hello</p>', 'Test Document');

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="zh-CN">');
      expect(html).toContain('<head>');
      expect(html).toContain('</head>');
      expect(html).toContain('<body>');
      expect(html).toContain('</body>');
      expect(html).toContain('</html>');
    });

    it('includes the provided title inside a <title> tag', () => {
      const html = ExportService.generateHTML('<p>Content</p>', 'My Custom Title');

      expect(html).toContain('<title>My Custom Title</title>');
    });

    it('places content inside the <body> with heading IDs added', () => {
      const html = ExportService.generateHTML('<h1>Hello World</h1><p>Some text.</p>', 'Doc');

      expect(html).toContain('<h1 id="hello-world">Hello World</h1>');
      expect(html).toContain('<p>Some text.</p>');
    });

    it('generates an empty body when content is empty', () => {
      const html = ExportService.generateHTML('', 'Empty');

      expect(html).toContain('<body>\n\n</body>');
    });
  });
});

/* ------------------------------------------------------------------ */
/*  ExportService – Heading ID processing                              */
/* ------------------------------------------------------------------ */
describe('ExportService - Heading ID processing', () => {
  describe('addHeadingIds', () => {
    it('adds slugified IDs to H1 through H6 headings', () => {
      const input =
        '<h1>Main Title</h1><h2>Sub Section</h2><h3>Deep Heading</h3>' +
        '<h4>Minor Topic</h4><h5>Detail Point</h5><h6>Footnote</h6>';
      const result = ExportService.addHeadingIds(input);

      expect(result).toContain('id="main-title"');
      expect(result).toContain('id="sub-section"');
      expect(result).toContain('id="deep-heading"');
      expect(result).toContain('id="minor-topic"');
      expect(result).toContain('id="detail-point"');
      expect(result).toContain('id="footnote"');
    });

    it('preserves existing IDs and does not overwrite them', () => {
      const input = '<h2 id="custom-id">My Heading</h2>';
      const result = ExportService.addHeadingIds(input);

      // Should keep the existing id attribute untouched
      expect(result).toContain('id="custom-id"');
      // Should only contain a single id attribute
      const matchCount = (result.match(/id="/g) || []).length;
      expect(matchCount).toBe(1);
    });

    it('handles CJK (Chinese) heading characters correctly', () => {
      const input = '<h1>你好世界</h1><h2>中文标题测试</h2>';
      const result = ExportService.addHeadingIds(input);

      // CJK characters (U+4E00 – U+9FFF range covered by 一-鿿) are preserved
      expect(result).toContain('id="你好世界"');
      expect(result).toContain('id="中文标题测试"');
    });

    it('strips special characters and replaces with hyphens', () => {
      const input = '<h1>Hello @#$%^&*() World!</h1>';
      const result = ExportService.addHeadingIds(input);

      // Non-word and non-CJK characters become hyphens, trimmed
      expect(result).toContain('id="hello-world"');
    });

    it('handles duplicate heading texts by generating identical IDs', () => {
      // Current implementation does NOT perform deduplication;
      // multiple headings with the same text receive the same ID.
      const input = '<h2>Overview</h2><h3>Overview</h3>';
      const result = ExportService.addHeadingIds(input);

      const matches = result.match(/id="overview"/g);
      expect(matches).toHaveLength(2);
    });

    it('does not match headings that contain nested HTML tags', () => {
      // The regex [^<]* stops at the first < character, so headings with
      // inline HTML tags are not captured and therefore not given IDs.
      const input = '<h1>Hello <em>World</em> Today</h1>';
      const result = ExportService.addHeadingIds(input);

      // Unchanged – the regex does not match this heading at all
      expect(result).toBe(input);
      expect(result).not.toContain('id=');
    });

    it('generates empty slug for headings with only special characters', () => {
      const input = '<h3>@#$%</h3>';
      const result = ExportService.addHeadingIds(input);

      // All characters are stripped; slug is empty string
      expect(result).toContain('id=""');
    });
  });
});

/* ------------------------------------------------------------------ */
/*  ExportService – Mermaid preprocessing (tested via public API)      */
/* ------------------------------------------------------------------ */
describe('ExportService - Mermaid preprocessing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('replaces mermaid divs with placeholder block via exportToHTML', async () => {
    vi.mocked(save).mockResolvedValue('/output/doc.html');
    vi.mocked(invoke).mockResolvedValue('/output/doc.html');

    const htmlContent =
      '<p>Intro text</p><div data-type="mermaid" data-content="graph TD"></div>';

    await ExportService.exportToHTML(htmlContent, 'MermaidTest');

    // Verify the content written to disk contains the mermaid placeholder
    const contentArg = (invoke as any).mock.calls[0]![1].content as string;
    expect(contentArg).toContain('class="mermaid-placeholder"');
    expect(contentArg).toContain('Mermaid Diagram');
    expect(contentArg).toContain('language-mermaid');
    expect(contentArg).toContain('graph TD');
  });

  it('replaces multiple mermaid blocks with distinct placeholders', async () => {
    vi.mocked(save).mockResolvedValue('/output/multi.html');
    vi.mocked(invoke).mockResolvedValue('/output/multi.html');

    const htmlContent =
      '<div data-type="mermaid" data-content="flowchart LR"></div>' +
      '<div data-type="mermaid" data-content="sequenceDiagram"></div>';

    await ExportService.exportToHTML(htmlContent, 'MultiMermaid');

    const contentArg = (invoke as any).mock.calls[0]![1].content as string;
    // Both mermaid blocks should have been replaced
    const placeholderCount = (contentArg.match(/class="mermaid-placeholder"/g) || []).length;
    expect(placeholderCount).toBe(2);
    expect(contentArg).toContain('flowchart LR');
    expect(contentArg).toContain('sequenceDiagram');
  });

  it('replaces markdown mermaid code blocks with [Diagram: ...] placeholders via exportToPDF', async () => {
    vi.mocked(save).mockResolvedValue('/output/doc.pdf');
    vi.mocked(invoke).mockResolvedValue('/output/doc.pdf');

    // Markdown content with embedded mermaid code block
    const markdown =
      '# My Document\n\n```mermaid\ngraph LR\nA-->B\nB-->C\n```\n\nSome text after.';

    await ExportService.exportToPDF(markdown, 'MermaidPDF');

    // The markdown passed to invoke should have the mermaid block replaced
    const markdownArg = (invoke as any).mock.calls[0]![1].markdown as string;
    expect(markdownArg).not.toContain('```mermaid');
    expect(markdownArg).toContain('[Diagram:');
    // The firstLineOf helper skips "graph LR" because it matches a diagram-type keyword
    expect(markdownArg).toContain('[Diagram: A-->B]');
    expect(markdownArg).toContain('# My Document');
    expect(markdownArg).toContain('Some text after.');
  });
});

/* ------------------------------------------------------------------ */
/*  ExportService – Export flow simulation (mocked Tauri)              */
/* ------------------------------------------------------------------ */
describe('ExportService - Export flow simulation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls save dialog and backend invoke for a full exportToPDF flow', async () => {
    const mockOutputPath = '/Users/test/output.pdf';
    vi.mocked(save).mockResolvedValue(mockOutputPath);
    vi.mocked(invoke).mockResolvedValue(mockOutputPath);

    const result = await ExportService.exportToPDF('# Hello World', 'MyDoc');

    // Verify save dialog was opened with correct filters
    expect(save).toHaveBeenCalledWith({
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
      defaultPath: 'MyDoc.pdf',
    });

    // Verify backend invoke was called with processed markdown
    expect(invoke).toHaveBeenCalledWith('export_to_pdf', {
      markdown: '# Hello World',
      outputPath: mockOutputPath,
    });

    expect(result).toBe(mockOutputPath);
  });

  it('returns null and aborts export when the save dialog is cancelled', async () => {
    vi.mocked(save).mockResolvedValue(null);

    const result = await ExportService.exportToPDF('# Content', 'Doc');

    expect(result).toBeNull();
    // invoke must not be called when the user cancels the save dialog
    expect(invoke).not.toHaveBeenCalled();
  });

  it('calls the correct Tauri invoke command for exportToWord', async () => {
    vi.mocked(save).mockResolvedValue('/output/doc.docx');
    vi.mocked(invoke).mockResolvedValue('/output/doc.docx');

    await ExportService.exportToWord('# Word Doc', 'WordTest');

    expect(invoke).toHaveBeenCalledWith('export_to_word', expect.objectContaining({
      markdown: '# Word Doc',
      outputPath: '/output/doc.docx',
    }));
  });

  it('calls the correct Tauri invoke command for exportToHTML', async () => {
    vi.mocked(save).mockResolvedValue('/output/doc.html');
    vi.mocked(invoke).mockResolvedValue('/output/doc.html');

    await ExportService.exportToHTML('<p>HTML content</p>', 'HTMLTest');

    expect(invoke).toHaveBeenCalledWith('save_file', expect.objectContaining({
      path: '/output/doc.html',
    }));
  });

  it('calls the correct Tauri invoke command for exportToEPUB', async () => {
    vi.mocked(save).mockResolvedValue('/output/doc.epub');
    vi.mocked(invoke).mockResolvedValue('/output/doc.epub');

    await ExportService.exportToEPUB('# EPUB Book', 'EPUBTest');

    expect(invoke).toHaveBeenCalledWith('export_to_epub', expect.objectContaining({
      markdown: '# EPUB Book',
      outputPath: '/output/doc.epub',
      title: 'EPUBTest',
    }));
  });

  it('throws an error when backend invoke fails', async () => {
    vi.mocked(save).mockResolvedValue('/output/doc.pdf');
    vi.mocked(invoke).mockRejectedValue(new Error('Backend error'));

    // The export should throw, wrapping the backend error
    await expect(ExportService.exportToPDF('# Content', 'Doc')).rejects.toThrow(
      'PDF导出失败',
    );
  });
});
