import { useState, useRef, useEffect, useCallback, type ChangeEvent } from 'react';
import {
  useThemeEditorStore,
  presetThemes,
  type ThemeConfig,
  type ThemeColors,
} from '../../store/themeEditorStore';
import './ThemeEditor.css';

/* ------------------------------------------------------------------ */
/*  Props                                                             */
/* ------------------------------------------------------------------ */

interface ThemeEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

/* ------------------------------------------------------------------ */
/*  Colour groupings for tab display                                  */
/* ------------------------------------------------------------------ */

interface ColorGroup {
  label: string;
  keys: (keyof ThemeColors)[];
}

const colorGroups: ColorGroup[] = [
  {
    label: 'Backgrounds',
    keys: ['bgPrimary', 'bgSecondary', 'bgTertiary'],
  },
  {
    label: 'Text',
    keys: ['textPrimary', 'textSecondary', 'textMuted'],
  },
  {
    label: 'Primary',
    keys: ['primaryColor', 'primaryHover'],
  },
  {
    label: 'Accent',
    keys: ['accentColor', 'accentHover'],
  },
  {
    label: 'Borders',
    keys: ['borderColor', 'borderLight'],
  },
  {
    label: 'Code',
    keys: ['codeBg', 'codeText'],
  },
  {
    label: 'Headings & Links',
    keys: ['headingColor', 'linkColor'],
  },
  {
    label: 'Toolbar / Sidebar',
    keys: ['toolbarBg', 'sidebarBg', 'statusbarBg'],
  },
  {
    label: 'Status',
    keys: ['success', 'warning', 'error'],
  },
];

/* ---------- human-readable labels ---------- */

const colorLabelMap: Record<keyof ThemeColors, string> = {
  bgPrimary: 'Main bg',
  bgSecondary: 'Secondary bg',
  bgTertiary: 'Tertiary bg',
  textPrimary: 'Main text',
  textSecondary: 'Secondary text',
  textMuted: 'Muted text',
  primaryColor: 'Primary',
  primaryHover: 'Primary hover',
  accentColor: 'Accent',
  accentHover: 'Accent hover',
  borderColor: 'Border',
  borderLight: 'Light border',
  codeBg: 'Code bg',
  codeText: 'Code text',
  headingColor: 'Headings',
  linkColor: 'Links',
  toolbarBg: 'Toolbar',
  sidebarBg: 'Sidebar',
  statusbarBg: 'Status bar',
  success: 'Success',
  warning: 'Warning',
  error: 'Error',
};

/* ------------------------------------------------------------------ */
/*  Helper: deep-clone a ThemeConfig                                  */
/* ------------------------------------------------------------------ */

function cloneTheme(t: ThemeConfig): ThemeConfig {
  return JSON.parse(JSON.stringify(t));
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function ThemeEditor({ isOpen, onClose }: ThemeEditorProps) {
  /* ---- Store ---- */
  const {
    currentTheme,
    customThemes,
    isLivePreview,
    setTheme,
    addCustomTheme,
    removeCustomTheme,
    updateThemeColors,
    updateThemeFonts,
    applyTheme,
    resetToDefault,
    toggleLivePreview,
    exportTheme,
    importTheme,
  } = useThemeEditorStore();

  /* ---- Local UI state ---- */
  const [activeSection, setActiveSection] = useState<'colors' | 'fonts' | 'presets'>('colors');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  /* Snapshot for Cancel support */
  const snapshotRef = useRef<ThemeConfig>(cloneTheme(currentTheme));

  /* Re-snapshot whenever the modal opens */
  useEffect(() => {
    if (isOpen) {
      snapshotRef.current = cloneTheme(useThemeEditorStore.getState().currentTheme);
      setImportStatus(null);
    }
  }, [isOpen]);

  /* ---- Handlers ---- */

  const handleColorChange = useCallback(
    (key: keyof ThemeColors, value: string) => {
      updateThemeColors({ [key]: value });
    },
    [updateThemeColors],
  );

  const handleFontChange = useCallback(
    (key: keyof ThemeConfig['fonts'], value: string) => {
      updateThemeFonts({ [key]: value });
    },
    [updateThemeFonts],
  );

  const handleSaveTheme = useCallback(() => {
    const name = `Custom ${customThemes.length + 1}`;
    addCustomTheme({ ...currentTheme, name });
  }, [currentTheme, customThemes.length, addCustomTheme]);

  const handleSelectPreset = useCallback(
    (theme: ThemeConfig) => {
      setTheme(theme);
      snapshotRef.current = cloneTheme(theme);
    },
    [setTheme],
  );

  /* ---- Save / Cancel ---- */

  const handleSave = useCallback(() => {
    snapshotRef.current = cloneTheme(currentTheme);
    applyTheme();
  }, [currentTheme, applyTheme]);

  const handleCancel = useCallback(() => {
    const restored = cloneTheme(snapshotRef.current);
    setTheme(restored);
    applyTheme();
  }, [setTheme, applyTheme]);

  /* ---- Import / Export ---- */

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = useCallback(() => {
    const json = exportTheme();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentTheme.name.replace(/\s+/g, '_')}.theme.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [exportTheme, currentTheme.name]);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelected = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        const ok = importTheme(text);
        if (ok) {
          setImportStatus('Theme imported successfully!');
          snapshotRef.current = cloneTheme(useThemeEditorStore.getState().currentTheme);
        } else {
          setImportStatus('Invalid theme file. Check the JSON format.');
        }
        // Clear the input so the same file can be picked again
        if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsText(file);
    },
    [importTheme],
  );

  if (!isOpen) return null;

  const hasUnsavedChanges =
    JSON.stringify(currentTheme) !== JSON.stringify(snapshotRef.current);

  return (
    <div className="theme-editor-overlay" onClick={onClose}>
      <div className="theme-editor-modal" onClick={(e) => e.stopPropagation()}>
        {/* ---- Header ---- */}
        <div className="theme-editor-header">
          <h2>Theme Editor</h2>
          <div className="header-actions">
            <button
              className="header-btn import-btn"
              onClick={handleImportClick}
              title="Import theme (.json)"
            >
              Import
            </button>
            <button
              className="header-btn export-btn"
              onClick={handleExport}
              title="Export theme as .json"
            >
              Export
            </button>
            <button className="close-btn" onClick={onClose}>
              x
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleFileSelected}
          />
        </div>

        {importStatus && (
          <div
            className={`import-status ${importStatus.includes('success') ? 'success' : 'error'}`}
          >
            {importStatus}
          </div>
        )}

        {/* ---- Tabs ---- */}
        <div className="theme-editor-tabs">
          <button
            className={`tab-btn ${activeSection === 'colors' ? 'active' : ''}`}
            onClick={() => setActiveSection('colors')}
          >
            Colors
          </button>
          <button
            className={`tab-btn ${activeSection === 'fonts' ? 'active' : ''}`}
            onClick={() => setActiveSection('fonts')}
          >
            Fonts
          </button>
          <button
            className={`tab-btn ${activeSection === 'presets' ? 'active' : ''}`}
            onClick={() => setActiveSection('presets')}
          >
            Presets
          </button>
        </div>

        {/* ---- Content ---- */}
        <div className="theme-editor-content">
          {activeSection === 'colors' && (
            <div className="colors-section">
              {colorGroups.map((group) => (
                <div key={group.label} className="color-group">
                  <h3 className="color-group-label">{group.label}</h3>
                  {group.keys.map((key) => (
                    <div key={key} className="color-item">
                      <label className="color-label">{colorLabelMap[key]}</label>
                      <div className="color-input-wrapper">
                        <input
                          type="color"
                          value={currentTheme.colors[key]}
                          onChange={(e) => handleColorChange(key, e.target.value)}
                          className="color-picker"
                          title={colorLabelMap[key]}
                        />
                        <input
                          type="text"
                          value={currentTheme.colors[key]}
                          onChange={(e) => handleColorChange(key, e.target.value)}
                          className="color-text"
                          placeholder="#000000"
                          spellCheck={false}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {activeSection === 'fonts' && (
            <div className="fonts-section">
              <div className="font-item">
                <label className="font-label">Font Family</label>
                <select
                  value={currentTheme.fonts.family}
                  onChange={(e) => handleFontChange('family', e.target.value)}
                  className="font-select"
                >
                  <option value='-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'>
                    System UI
                  </option>
                  <option value="Georgia, serif">Georgia</option>
                  <option value='"Times New Roman", serif'>Times New Roman</option>
                  <option value="Arial, sans-serif">Arial</option>
                  <option value='"Courier New", monospace'>Courier New</option>
                  <option value='"Fira Code", monospace'>Fira Code</option>
                  <option value='"JetBrains Mono", monospace'>JetBrains Mono</option>
                </select>
              </div>
              <div className="font-item">
                <label className="font-label">Font Size</label>
                <input
                  type="text"
                  value={currentTheme.fonts.size}
                  onChange={(e) => handleFontChange('size', e.target.value)}
                  className="font-text"
                  placeholder="14px"
                />
              </div>
              <div className="font-item">
                <label className="font-label">Line Height</label>
                <input
                  type="text"
                  value={currentTheme.fonts.lineHeight}
                  onChange={(e) => handleFontChange('lineHeight', e.target.value)}
                  className="font-text"
                  placeholder="1.6"
                />
              </div>
            </div>
          )}

          {activeSection === 'presets' && (
            <div className="presets-section">
              <p className="presets-hint">Click a preset to apply it instantly.</p>
              <div className="presets-grid">
                {presetThemes.map((theme) => {
                  const isActive = currentTheme.name === theme.name;
                  return (
                    <div
                      key={theme.name}
                      className={`preset-card ${isActive ? 'active' : ''}`}
                      onClick={() => handleSelectPreset(theme)}
                    >
                      {/* Colour swatch strip */}
                      <div className="preset-swatch">
                        <span
                          className="swatch-color"
                          style={{ backgroundColor: theme.colors.bgPrimary }}
                        />
                        <span
                          className="swatch-color"
                          style={{ backgroundColor: theme.colors.primaryColor }}
                        />
                        <span
                          className="swatch-color"
                          style={{ backgroundColor: theme.colors.accentColor }}
                        />
                        <span
                          className="swatch-color"
                          style={{ backgroundColor: theme.colors.textPrimary }}
                        />
                      </div>
                      <span className="preset-name">{theme.name}</span>
                      {isActive && <span className="preset-active-badge">Active</span>}
                    </div>
                  );
                })}

                {/* Custom themes */}
                {customThemes.map((theme) => {
                  const isActive = currentTheme.name === theme.name;
                  return (
                    <div
                      key={theme.name}
                      className={`preset-card custom ${isActive ? 'active' : ''}`}
                      onClick={() => handleSelectPreset(theme)}
                    >
                      <div className="preset-swatch">
                        <span
                          className="swatch-color"
                          style={{ backgroundColor: theme.colors.bgPrimary }}
                        />
                        <span
                          className="swatch-color"
                          style={{ backgroundColor: theme.colors.primaryColor }}
                        />
                        <span
                          className="swatch-color"
                          style={{ backgroundColor: theme.colors.accentColor }}
                        />
                        <span
                          className="swatch-color"
                          style={{ backgroundColor: theme.colors.textPrimary }}
                        />
                      </div>
                      <span className="preset-name">{theme.name}</span>
                      {isActive && <span className="preset-active-badge">Active</span>}
                      <button
                        className="preset-delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeCustomTheme(theme.name);
                        }}
                        title="Delete custom theme"
                      >
                        x
                      </button>
                    </div>
                  );
                })}
              </div>

              <button className="save-custom-btn" onClick={handleSaveTheme}>
                Save Current as Custom Theme
              </button>
            </div>
          )}
        </div>

        {/* ---- Footer ---- */}
        <div className="theme-editor-footer">
          <label className="live-preview-toggle">
            <input
              type="checkbox"
              checked={isLivePreview}
              onChange={toggleLivePreview}
            />
            <span>Live Preview</span>
          </label>

          <div className="footer-buttons">
            <button className="footer-btn reset-btn" onClick={resetToDefault}>
              Reset to Default
            </button>
            <button
              className="footer-btn cancel-btn"
              onClick={handleCancel}
              disabled={!hasUnsavedChanges}
            >
              Cancel
            </button>
            <button
              className="footer-btn save-btn"
              onClick={handleSave}
              disabled={!hasUnsavedChanges}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
