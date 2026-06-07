import { useState } from 'react';
import { useThemeStore } from '../../store/themeStore';
import { safeInvoke } from '../../services/ipcWrapper';
import './ThemeMarketplace.css';

interface ThemeFile { name: string; author: string; colors: Record<string, string> }

export function ThemeMarketplace() {
  const { currentTheme, setTheme } = useThemeStore();
  const [imported, setImported] = useState<ThemeFile | null>(null);
  const [preview, setPreview] = useState(false);
  const [status, setStatus] = useState('');

  const handleImport = async () => {
    try {
      setStatus('Opening file...');
      const { open } = await import('@tauri-apps/plugin-dialog');
      const path = await open({ filters: [{ name: 'Theme', extensions: ['theme.json'] }], multiple: false });
      if (!path || typeof path !== 'string') { setStatus(''); return; }
      const content = await safeInvoke<string>('read_file', { path });
      const theme = JSON.parse(content) as ThemeFile;
      if (!theme.name || !theme.colors) throw new Error('Invalid theme file');
      setImported(theme);
      setStatus(`Loaded: ${theme.name}`);
    } catch (e) { setStatus(`Error: ${e}`); }
  };

  const handleApply = () => {
    if (!imported) return;
    const root = document.documentElement;
    for (const [key, val] of Object.entries(imported.colors)) {
      root.style.setProperty(`--${key}`, val);
    }
    setPreview(true);
    setStatus(`Previewing: ${imported.name}`);
  };

  const handleRevert = () => {
    setTheme(currentTheme);
    setPreview(false);
    setStatus('Reverted');
  };

  const handleExport = () => {
    const root = document.documentElement;
    const style = getComputedStyle(root);
    const theme: ThemeFile = {
      name: 'My Custom Theme', author: '',
      colors: {
        'bg-primary': style.getPropertyValue('--bg-primary').trim() || style.getPropertyValue('--color-bg').trim(),
        'text-primary': style.getPropertyValue('--text-primary').trim() || style.getPropertyValue('--color-text').trim(),
        'border-primary': style.getPropertyValue('--border-primary').trim() || style.getPropertyValue('--color-border').trim(),
        'color-primary': style.getPropertyValue('--color-primary').trim() || '#3b82f6',
        'bg-secondary': style.getPropertyValue('--bg-secondary').trim() || '#f5f5f5',
        'text-secondary': style.getPropertyValue('--text-secondary').trim() || '#666',
      },
    };
    const blob = new Blob([JSON.stringify(theme, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'markhere-theme.theme.json';
    a.click(); URL.revokeObjectURL(a.href);
    setStatus('Theme exported');
  };

  return (
    <div className="theme-marketplace">
      <h2>Theme Manager</h2>
      <p className="tm-desc">Import, preview, and export themes as <code>.theme.json</code> files.</p>
      <div className="tm-actions">
        <button className="btn" onClick={handleImport}>Import Theme</button>
        <button className="btn" onClick={handleExport}>Export Current</button>
      </div>
      {status && <div className={`tm-status${status.startsWith('Error') ? ' error' : ''}`}>{status}</div>}
      {imported && (
        <div className="tm-preview-card">
          <h3>{imported.name}</h3>
          {imported.author && <p className="tm-author">by {imported.author}</p>}
          <div className="tm-color-swatches">
            {Object.entries(imported.colors).map(([k, v]) => (
              <div key={k} className="tm-swatch">
                <span className="tm-swatch-color" style={{ background: v }} />
                <span className="tm-swatch-label">{k}: {v}</span>
              </div>
            ))}
          </div>
          <div className="tm-preview-actions">
            <button className="btn-primary" onClick={handleApply} disabled={preview}>Preview</button>
            {preview && <button className="btn" onClick={handleRevert}>Revert</button>}
          </div>
        </div>
      )}
    </div>
  );
}
