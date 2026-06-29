import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { useFileStore } from '../../store/fileStore';
import { useEditorState } from '../../store/editorStore';
import { useNotificationStore } from '../Notification/Notification';
import { useTranslation } from '../../i18n';
import './ImportPanel.css';

type ImportFormat = 'html' | 'docx' | 'pdf' | 'txt' | 'rtf' | 'odt' | 'notion';

interface ImportOption {
  id: ImportFormat;
  name: string;
  extension: string;
  icon: string;
}

const IMPORT_OPTIONS: ImportOption[] = [
  { id: 'html', name: 'HTML', extension: 'html', icon: '🌐' },
  { id: 'docx', name: 'Word Document', extension: 'docx', icon: '📄' },
  { id: 'pdf', name: 'PDF', extension: 'pdf', icon: '📑' },
  { id: 'notion', name: 'Notion Export', extension: 'zip', icon: '📓' },
  { id: 'txt', name: 'Plain Text', extension: 'txt', icon: '📝' },
  { id: 'rtf', name: 'Rich Text', extension: 'rtf', icon: '✒️' },
  { id: 'odt', name: 'OpenDocument', extension: 'odt', icon: '📋' },
];

export function ImportPanel() {
  const { t } = useTranslation();
  const { setCurrentPath } = useFileStore();
  const { editorInstance } = useEditorState();
  const notify = useNotificationStore((s) => s.notify);
  const [importing, setImporting] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ImportFormat | null>(null);
  
  const handleImportFile = async (format: ImportFormat) => {
    setSelectedFormat(format);
    setImporting(true);
    
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: IMPORT_OPTIONS.find(o => o.id === format)?.name || format, extensions: [IMPORT_OPTIONS.find(o => o.id === format)?.extension || format] }],
      });
      
      if (!selected) {
        setImporting(false);
        setSelectedFormat(null);
        return;
      }
      
      const filePath = selected as string;
      let markdownContent = '';
      
      switch (format) {
        case 'html':
          markdownContent = await convertHtmlToMarkdown(filePath);
          break;
        case 'docx':
          markdownContent = await convertDocxToMarkdown(filePath);
          break;
        case 'pdf':
          markdownContent = await convertPdfToMarkdown(filePath);
          break;
        case 'notion':
          markdownContent = await convertNotionToMarkdown(filePath);
          break;
        case 'txt':
          markdownContent = await invoke<string>('read_file', { path: filePath });
          break;
        case 'rtf':
          markdownContent = await convertRtfToMarkdown(filePath);
          break;
        case 'odt':
          markdownContent = await convertOdtToMarkdown(filePath);
          break;
      }
      
      if (markdownContent) {
        editorInstance?.commands.setContent(markdownContent);
        const fileName = filePath.split('/').pop() || 'Imported';
        const newPath = filePath.replace(/\.[^.]+$/, '.md');
        setCurrentPath(newPath);
        
        await invoke('write_file', { path: newPath, content: markdownContent });
        
        notify('success', `Successfully imported ${fileName}`);
      }
    } catch (err) {
      console.error('[ImportPanel] Import failed:', err);
      notify('error', 'Failed to import file');
    } finally {
      setImporting(false);
      setSelectedFormat(null);
    }
  };
  
  const convertHtmlToMarkdown = async (filePath: string): Promise<string> => {
    const html = await invoke<string>('read_file', { path: filePath });
    
    const markdown = html
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
      .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
      .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
      .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
      .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
      .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
      .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
      .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)')
      .replace(/<ul[^>]*>(.*?)<\/ul>/gi, '$1\n')
      .replace(/<ol[^>]*>(.*?)<\/ol>/gi, '$1\n')
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
      .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n\n')
      .replace(/<hr\s*\/?>/gi, '\n---\n')
      .replace(/<!--.*?-->/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\n{3,}/g, '\n\n');
    
    return markdown.trim();
  };
  
  const convertDocxToMarkdown = async (filePath: string): Promise<string> => {
    try {
      const text = await invoke<string>('extract_docx_text', { path: filePath });
      return text || '';
    } catch {
      notify('warning', 'Word import requires pandoc. Install pandoc for full support.');
      return `[Word Document Import]\n\nFile: ${filePath}\n\nInstall pandoc for full Word document import support.`;
    }
  };
  
  const convertPdfToMarkdown = async (filePath: string): Promise<string> => {
    try {
      const text = await invoke<string>('extract_pdf_text', { path: filePath });
      return text || '';
    } catch {
      notify('warning', 'PDF import requires pdftotext. Install poppler for full support.');
      return `[PDF Import]\n\nFile: ${filePath}\n\nInstall poppler (pdftotext) for full PDF import support.`;
    }
  };
  
  const convertRtfToMarkdown = async (filePath: string): Promise<string> => {
    try {
      const text = await invoke<string>('read_file', { path: filePath });
      
      const cleaned = text
        .replace(/\\par/g, '\n')
        .replace(/\\line/g, '\n')
        .replace(/\\tab/g, '\t')
        .replace(/\\b\s?/g, '**')
        .replace(/\\i\s?/g, '*')
        .replace(/\\ul\s?/g, '_')
        .replace(/\\[^a-z]+/gi, '')
        .replace(/[{}]/g, '')
        .replace(/\n{3,}/g, '\n\n');
      
      return cleaned.trim();
    } catch {
      return '';
    }
  };
  
  const convertOdtToMarkdown = async (filePath: string): Promise<string> => {
    notify('warning', 'ODT import not yet fully supported');
    return `[OpenDocument Import]\n\nFile: ${filePath}\n\nODT import support coming soon.`;
  };
  
  const convertNotionToMarkdown = async (filePath: string): Promise<string> => {
    try {
      const text = await invoke<string>('extract_notion_zip', { path: filePath });
      return text || '';
    } catch (err) {
      notify('warning', 'Notion export ZIP import failed. Ensure the file is a valid Notion export.');
      return '';
    }
  };
  
  return (
    <div className="import-panel">
      <h2 className="import-title">
        {t('import.title') || 'Import Document'}
      </h2>
      <p className="import-desc">
        {t('import.description') || 'Convert documents from various formats to Markdown'}
      </p>
      
      <div className="import-options">
        {IMPORT_OPTIONS.map(option => (
          <button
            key={option.id}
            className={`import-option ${selectedFormat === option.id ? 'import-option-active' : ''}`}
            onClick={() => handleImportFile(option.id)}
            disabled={importing}
          >
            <span className="import-option-icon">{option.icon}</span>
            <span className="import-option-name">{option.name}</span>
            <span className="import-option-ext">.{option.extension}</span>
          </button>
        ))}
      </div>
      
      {importing && (
        <div className="import-loading">
          <span className="import-spinner">⏳</span>
          <span>{t('import.importing') || 'Importing...'}</span>
        </div>
      )}
      
      <div className="import-note">
        <h4>{t('import.noteTitle') || 'Note'}</h4>
        <ul>
          <li>{t('import.noteHtml') || 'HTML: Basic tag conversion (headings, paragraphs, links)'}</li>
          <li>{t('import.noteDocx') || 'Word: Requires pandoc for full support'}</li>
          <li>{t('import.notePdf') || 'PDF: Requires poppler (pdftotext) for extraction'}</li>
          <li>{t('import.noteNotion') || 'Notion: Export your Notion pages as ZIP, then import here'}</li>
          <li>{t('import.noteTxt') || 'Plain Text: Direct import, preserves formatting'}</li>
        </ul>
      </div>
    </div>
  );
}

export default ImportPanel;