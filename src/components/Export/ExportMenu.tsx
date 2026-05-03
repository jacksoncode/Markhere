import { useState } from 'react';
import { ExportService } from '../../services/ExportService';
import { useFileStore } from '../../store/fileStore';
import { useEditorState } from '../../store/editorStore';
import './ExportMenu.css';

export function ExportMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const { fileName } = useFileStore();
  const { editorInstance } = useEditorState();

  const handleExportPDF = async () => {
    if (!editorInstance) return;
    
    setExporting('PDF');
    try {
      const html = editorInstance.getHTML();
      await ExportService.exportToPDF(html, fileName || 'Document');
      setIsOpen(false);
    } catch (error) {
      console.error('PDF导出错误:', error);
      alert(`导出失败: ${error}`);
    } finally {
      setExporting(null);
    }
  };

  const handleExportWord = async () => {
    if (!editorInstance) return;
    
    setExporting('Word');
    try {
      const markdown = (editorInstance.storage as any)?.markdown?.getMarkdown?.() || '';
      await ExportService.exportToWord(markdown, fileName || 'Document');
      setIsOpen(false);
    } catch (error) {
      console.error('Word导出错误:', error);
      alert(`导出失败: ${error}`);
    } finally {
      setExporting(null);
    }
  };

  const handleExportHTML = async () => {
    if (!editorInstance) return;
    
    setExporting('HTML');
    try {
      const html = editorInstance.getHTML();
      await ExportService.exportToHTML(html, fileName || 'Document');
      setIsOpen(false);
    } catch (error) {
      console.error('HTML导出错误:', error);
      alert(`导出失败: ${error}`);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="export-menu-container">
      <button 
        className="export-trigger"
        onClick={() => setIsOpen(!isOpen)}
        disabled={exporting !== null}
      >
        {exporting ? `正在导出${exporting}...` : '导出'}
      </button>
      
      {isOpen && (
        <div className="export-dropdown">
          <button onClick={handleExportPDF} disabled={exporting !== null}>
            <span className="export-icon">📄</span>
            导出为 PDF
          </button>
          <button onClick={handleExportWord} disabled={exporting !== null}>
            <span className="export-icon">📝</span>
            导出为 Word
          </button>
          <button onClick={handleExportHTML} disabled={exporting !== null}>
            <span className="export-icon">🌐</span>
            导出为 HTML
          </button>
        </div>
      )}
    </div>
  );
}