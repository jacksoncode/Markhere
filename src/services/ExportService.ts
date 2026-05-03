import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';

export class ExportService {
  static async exportToPDF(html: string, title: string = 'Document'): Promise<string | null> {
    const outputPath = await save({
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
      defaultPath: `${title}.pdf`,
    });

    if (!outputPath) return null;

    try {
      const result = await invoke<string>('export_to_pdf', {
        html,
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

    try {
      const result = await invoke<string>('export_to_word', {
        markdown,
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

    const html = this.generateHTML(content, title);
    
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

  static generateHTML(content: string, title: string): string {
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
  </style>
</head>
<body>
${content}
</body>
</html>`;
  }
}