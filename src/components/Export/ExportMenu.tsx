import { useState } from 'react';
import { ExportService } from '../../services/ExportService';
import { useFileStore } from '../../store/fileStore';
import { useEditorState } from '../../store/editorStore';
import { useTranslation } from '../../i18n';
import { useNotificationStore } from '../Notification/Notification';
import './ExportMenu.css';

export function ExportMenu() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const { fileName } = useFileStore();
  const { editorInstance } = useEditorState();
  const { notify } = useNotificationStore();

  const handleExportPDF = async () => {
    if (!editorInstance) return;

    setExporting('PDF');
    try {
      const markdown = (editorInstance.storage as any)?.markdown?.getMarkdown?.() || '';
      await ExportService.exportToPDF(markdown, fileName || 'Document');
      notify('success', t('export.exportSuccess', undefined, { format: 'PDF' }));
      setIsOpen(false);
    } catch (error) {
      console.error('PDF export error:', error);
      notify('error', String(error), t('export.exportFailed'));
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
      notify('success', t('export.exportSuccess', undefined, { format: 'Word' }));
      setIsOpen(false);
    } catch (error) {
      console.error('Word export error:', error);
      notify('error', String(error), t('export.exportFailed'));
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
      notify('success', t('export.exportSuccess', undefined, { format: 'HTML' }));
      setIsOpen(false);
    } catch (error) {
      console.error('HTML export error:', error);
      notify('error', String(error), t('export.exportFailed'));
    } finally {
      setExporting(null);
    }
  };

  const handleExportEPUB = async () => {
    if (!editorInstance) return;

    setExporting('EPUB');
    try {
      const markdown = (editorInstance.storage as any)?.markdown?.getMarkdown?.() || '';
      await ExportService.exportToEPUB(markdown, fileName || 'Document');
      notify('success', t('export.exportSuccess', undefined, { format: 'EPUB' }));
      setIsOpen(false);
    } catch (error) {
      console.error('EPUB export error:', error);
      notify('error', String(error), t('export.exportFailed'));
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
        {exporting
          ? t('export.exporting', undefined, { format: exporting })
          : t('export.export')}
      </button>

      {isOpen && (
        <div className="export-dropdown">
          <button onClick={handleExportPDF} disabled={exporting !== null}>
            <span className="export-icon">📄</span>
            {t('file.exportPdf')}
          </button>
          <button onClick={handleExportWord} disabled={exporting !== null}>
            <span className="export-icon">📝</span>
            {t('file.exportWord')}
          </button>
          <button onClick={handleExportHTML} disabled={exporting !== null}>
            <span className="export-icon">🌐</span>
            {t('file.exportHtml')}
          </button>
          <button onClick={handleExportEPUB} disabled={exporting !== null}>
            <span className="export-icon">📖</span>
            {t('file.exportEpub')}
          </button>
        </div>
      )}
    </div>
  );
}