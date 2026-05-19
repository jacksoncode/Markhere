import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';

// ---- Mermaid preprocessing helpers ----

/** Extract the first meaningful line from a mermaid definition. */
function firstLineOf(content: string): string {
  const lines = content.trim().split('\n');
  // Skip lines that are only whitespace or diagram-type declarations
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gantt|pie|quadrantChart|requirementDiagram|gitGraph|C4Context|mindmap|timeline|zenuml|sankey-beta|block-beta|packet-beta|architecture-beta)\b/i.test(trimmed)) {
      return trimmed;
    }
  }
  return lines[0]?.trim() || 'diagram';
}

/**
 * Preprocess HTML content to handle mermaid diagram blocks.
 *
 * - Wraps `<div data-type="mermaid" ...>` blocks in
 *   `<div class="mermaid-placeholder">` containing the raw mermaid code
 *   and a note that the diagram requires live rendering (JavaScript).
 *
 * - This preserves the diagram definition so the exported HTML can still
 *   render diagrams when mermaid.js is loaded in a browser.
 */
function preprocessMermaidForExport(html: string): string {
  // Match <div data-type="mermaid" ... data-content="..."></div>
  // The data-content attribute contains the raw mermaid definition.
  return html.replace(
    /<div\b[^>]*\bdata-type\s*=\s*["']mermaid["'][^>]*\bdata-content\s*=\s*["']([^"']*)["'][^>]*><\/div>/gi,
    (_fullMatch, content: string) => {
      const decoded = content
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"');

      return (
        '<div class="mermaid-placeholder">\n' +
        `  <strong>Mermaid Diagram</strong>\n` +
        `  <pre><code class="language-mermaid">${escapeHtmlContent(decoded)}</code></pre>\n` +
        '  <p class="placeholder-note">This diagram requires JavaScript (mermaid.js) for live rendering.</p>\n' +
        '</div>'
      );
    }
  );
}

/**
 * Preprocess markdown content to replace mermaid code blocks with
 * descriptive placeholders suitable for non-HTML export targets
 * (PDF, Word).
 */
function preprocessMarkdownMermaidForExport(markdown: string): string {
  // Match ```mermaid ... ``` blocks
  return markdown.replace(
    /```mermaid\s*\n([\s\S]*?)```/gi,
    (_fullMatch, content: string) => {
      const first = firstLineOf(content);
      return `[Diagram: ${first}]`;
    }
  );
}

function escapeHtmlContent(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export class ExportService {
  static async exportToPDF(markdown: string, title: string = 'Document'): Promise<string | null> {
    const outputPath = await save({
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
      defaultPath: `${title}.pdf`,
    });

    if (!outputPath) return null;

    // Replace mermaid code blocks with placeholder text
    const processed = preprocessMarkdownMermaidForExport(markdown);

    try {
      const result = await invoke<string>('export_to_pdf', {
        markdown: processed,
        outputPath,
      });
      return result;
    } catch (error) {
      throw new Error(`PDF导出失败: ${error}`);
    }
  }

  static async exportToWord(markdown: string, title: string = 'Document'): Promise<string | null> {
    const outputPath = await save({
      filters: [{ name: 'Word', extensions: ['docx'] }],
      defaultPath: `${title}.docx`,
    });

    if (!outputPath) return null;

    // Replace mermaid code blocks with placeholder text
    const processed = preprocessMarkdownMermaidForExport(markdown);

    try {
      const result = await invoke<string>('export_to_word', {
        markdown: processed,
        outputPath,
      });
      return result;
    } catch (error) {
      throw new Error(`Word导出失败: ${error}`);
    }
  }

  static async exportToHTML(content: string, title: string = 'Document'): Promise<string | null> {
    const outputPath = await save({
      filters: [{ name: 'HTML', extensions: ['html'] }],
      defaultPath: `${title}.html`,
    });

    if (!outputPath) return null;

    // Wrap mermaid blocks in placeholders that preserve the code
    const processed = preprocessMermaidForExport(content);
    const html = this.generateHTML(processed, title);

    try {
      const result = await invoke<string>('save_file', {
        path: outputPath,
        content: html,
      });
      return result;
    } catch (error) {
      throw new Error(`HTML导出失败: ${error}`);
    }
  }

  static async exportToEPUB(markdown: string, title: string = 'Document'): Promise<string | null> {
    const outputPath = await save({
      filters: [{ name: 'EPUB', extensions: ['epub'] }],
      defaultPath: `${title}.epub`,
    });

    if (!outputPath) return null;

    // Replace mermaid code blocks with placeholder text
    const processed = preprocessMarkdownMermaidForExport(markdown);

    try {
      const result = await invoke<string>('export_to_epub', {
        markdown: processed,
        outputPath,
        title,
      });
      return result;
    } catch (error) {
      throw new Error(`EPUB导出失败: ${error}`);
    }
  }

  /**
   * Add heading IDs to HTML content so anchor links (e.g., `[text](#heading)`)
   * work in exported HTML documents.
   */
  static addHeadingIds(html: string): string {
    return html.replace(
      /<h([1-6])([^>]*)>([^<]*)<\/h\1>/gi,
      (fullMatch, level: string, attrs: string, text: string) => {
        // Only add id if one is not already present
        if (/\bid\s*=/.test(attrs)) {
          return fullMatch;
        }
        const slug = text
          .toLowerCase()
          .replace(/<[^>]+>/g, '')   // strip any HTML tags inside heading
          .replace(/[^\w一-鿿]+/g, '-')
          .replace(/^-+|-+$/g, '');
        return `<h${level}${attrs} id="${slug}">${text}</h${level}>`;
      }
    );
  }

  static generateHTML(content: string, title: string): string {
    const contentWithIds = this.addHeadingIds(content);
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      color: #333;
    }
    h1, h2, h3, h4 { margin-top: 24px; margin-bottom: 16px; font-weight: 600; }
    h1 { font-size: 2em; border-bottom: 1px solid #eaecef; padding-bottom: 8px; }
    h2 { font-size: 1.5em; }
    h3 { font-size: 1.25em; }
    code { background: #f6f8fa; padding: 2px 4px; border-radius: 3px; font-family: 'Courier New', monospace; }
    pre { background: #f6f8fa; padding: 16px; overflow: auto; border-radius: 6px; }
    blockquote { border-left: 4px solid #dfe2e5; padding-left: 16px; color: #6a737d; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    th, td { border: 1px solid #dfe2e5; padding: 8px; text-align: left; }
    th { background: #f6f8fa; font-weight: 600; }
    img { max-width: 100%; }

    /* Mermaid placeholders in exported HTML */
    .mermaid-placeholder {
      border: 2px dashed #ccc;
      border-radius: 8px;
      padding: 16px;
      margin: 12px 0;
      background: #fafafa;
      text-align: center;
      color: #666;
      font-style: italic;
    }
    .mermaid-placeholder pre {
      text-align: left;
      margin: 8px 0 0;
      font-style: normal;
      background: #f0f0f0;
      padding: 8px;
      border-radius: 4px;
      overflow-x: auto;
    }
    .mermaid-placeholder .placeholder-note {
      font-size: 0.85em;
      color: #888;
      margin-top: 8px;
    }
  </style>
</head>
<body>
${contentWithIds}
</body>
</html>`;
  }
}
