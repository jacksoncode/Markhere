import { ExportEnhanced, type ExportOptions } from '../../services/ExportEnhanced';
import { useState } from 'react';
import './ExportAdvanced.css';

export function ExportAdvanced({ content, title = 'Document' }: { content: string; title?: string }) {
  const [format, setFormat] = useState<ExportOptions['format']>('pdf');
  const [quality, setQuality] = useState<ExportOptions['quality']>('medium');
  const [includeFm, setIncludeFm] = useState(true);
  const [status, setStatus] = useState('');
  const [exporting, setExporting] = useState(false);
  const [resultPath, setResultPath] = useState('');

  const formats: { key: ExportOptions['format']; label: string; icon: string }[] = [
    { key: 'pdf', label: 'PDF', icon: '📄' }, { key: 'docx', label: 'Word', icon: '📝' },
    { key: 'html', label: 'HTML', icon: '🌐' }, { key: 'pptx', label: 'PowerPoint', icon: '📊' },
    { key: 'latex', label: 'LaTeX', icon: '📐' }, { key: 'epub', label: 'EPUB', icon: '📚' },
    { key: 'md', label: 'Markdown', icon: '📋' },
  ];

  const handleExport = async () => {
    setExporting(true); setStatus('Exporting...');
    try {
      let result: string | null = null;
      switch (format) {
        case 'pptx': result = await ExportEnhanced.exportPPTX(content, title); break;
        case 'latex': result = await ExportEnhanced.exportLaTeX(content, title); break;
        default: {
          const { ExportService } = await import('../../services/ExportService');
          switch (format) {
            case 'pdf': result = await ExportService.exportToPDF(content, title); break;
            case 'docx': result = await ExportService.exportToWord(content, title); break;
            case 'html': result = await ExportService.exportToHTML(content, title); break;
            case 'epub': result = await ExportService.exportToEPUB(content, title); break;
          }
        }
      }
      if (result) { setResultPath(result); setStatus(`✅ Exported to ${result}`); }
      else setStatus('Export cancelled');
    } catch (e) { setStatus(`❌ ${e}`); }
    setExporting(false);
  };

  return (
    <div className="export-advanced">
      <h2>Export Document</h2>
      <div className="exp-formats">
        {formats.map(f => (
          <button key={f.key} className={`exp-format${format === f.key ? ' active' : ''}`} onClick={() => setFormat(f.key)}>
            <span className="exp-icon">{f.icon}</span>
            <span>{f.label}</span>
          </button>
        ))}
      </div>

      <div className="exp-options">
        <label>Quality:
          <select value={quality} onChange={e => setQuality(e.target.value as ExportOptions['quality'])}>
            <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
          </select>
        </label>
        <label className="exp-check">
          <input type="checkbox" checked={includeFm} onChange={e => setIncludeFm(e.target.checked)} />
          Include frontmatter
        </label>
      </div>

      <button className="exp-btn" onClick={handleExport} disabled={exporting}>
        {exporting ? 'Exporting...' : `Export as ${format.toUpperCase()}`}
      </button>

      {status && <div className={`exp-status${status.startsWith('✅') ? ' success' : status.startsWith('❌') ? ' error' : ''}`}>{status}</div>}

      {resultPath && <div className="exp-result"><small>Saved to: {resultPath}</small></div>}
    </div>
  );
}
