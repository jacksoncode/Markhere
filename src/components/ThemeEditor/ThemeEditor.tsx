import { useState } from 'react';
import { useThemeEditorStore, ThemeConfig, defaultLightTheme, defaultDarkTheme } from '../../store/themeEditorStore';
import './ThemeEditor.css';

interface ThemeEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ThemeEditor({ isOpen, onClose }: ThemeEditorProps) {
  const {
    currentTheme,
    customThemes,
    setTheme,
    addCustomTheme,
    removeCustomTheme,
    updateThemeColors,
    updateThemeFonts,
    applyTheme,
    resetTheme,
  } = useThemeEditorStore();

  const [activeSection, setActiveSection] = useState<'colors' | 'fonts' | 'themes'>('colors');

  const predefinedThemes = [defaultLightTheme, defaultDarkTheme];

  const handleColorChange = (key: keyof ThemeConfig['colors'], value: string) => {
    updateThemeColors({ [key]: value });
    applyTheme();
  };

  const handleFontChange = (key: keyof ThemeConfig['fonts'], value: string) => {
    updateThemeFonts({ [key]: value });
    applyTheme();
  };

  const handleSaveTheme = () => {
    const name = `Custom ${customThemes.length + 1}`;
    addCustomTheme({ ...currentTheme, name });
  };

  const handleSelectTheme = (theme: ThemeConfig) => {
    setTheme(theme);
  };

  const handlePreviewTheme = (theme: ThemeConfig) => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', theme.colors.primary);
    root.style.setProperty('--color-bg-primary', theme.colors.background);
    root.style.setProperty('--color-bg-secondary', theme.colors.backgroundSecondary);
    root.style.setProperty('--color-text-primary', theme.colors.text);
    root.style.setProperty('--color-text-secondary', theme.colors.textSecondary);
    root.style.setProperty('--color-border', theme.colors.border);
  };

  if (!isOpen) return null;

  const allThemes = [...predefinedThemes, ...customThemes];

  return (
    <div className="theme-editor-overlay" onClick={onClose}>
      <div className="theme-editor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="theme-editor-header">
          <h2>主题编辑器</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="theme-editor-tabs">
          <button
            className={`tab-btn ${activeSection === 'colors' ? 'active' : ''}`}
            onClick={() => setActiveSection('colors')}
          >
            颜色
          </button>
          <button
            className={`tab-btn ${activeSection === 'fonts' ? 'active' : ''}`}
            onClick={() => setActiveSection('fonts')}
          >
            字体
          </button>
          <button
            className={`tab-btn ${activeSection === 'themes' ? 'active' : ''}`}
            onClick={() => setActiveSection('themes')}
          >
            主题
          </button>
        </div>

        <div className="theme-editor-content">
          {activeSection === 'colors' && (
            <div className="colors-section">
              {Object.entries(currentTheme.colors).map(([key, value]) => (
                <div key={key} className="color-item">
                  <label className="color-label">
                    {getColorLabel(key as keyof ThemeConfig['colors'])}
                  </label>
                  <div className="color-input-wrapper">
                    <input
                      type="color"
                      value={value}
                      onChange={(e) => handleColorChange(key as keyof ThemeConfig['colors'], e.target.value)}
                      className="color-picker"
                    />
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => handleColorChange(key as keyof ThemeConfig['colors'], e.target.value)}
                      className="color-text"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeSection === 'fonts' && (
            <div className="fonts-section">
              <div className="font-item">
                <label className="font-label">字体</label>
                <select
                  value={currentTheme.fonts.family}
                  onChange={(e) => handleFontChange('family', e.target.value)}
                  className="font-select"
                >
                  <option value="-apple-system, BlinkMacSystemFont, sans-serif">系统字体</option>
                  <option value="Georgia, serif">Georgia</option>
                  <option value='"Times New Roman", serif'>Times New Roman</option>
                  <option value="Arial, sans-serif">Arial</option>
                  <option value='"Courier New", monospace'>Courier New</option>
                </select>
              </div>
              <div className="font-item">
                <label className="font-label">字号</label>
                <input
                  type="text"
                  value={currentTheme.fonts.size}
                  onChange={(e) => handleFontChange('size', e.target.value)}
                  className="font-text"
                />
              </div>
              <div className="font-item">
                <label className="font-label">行高</label>
                <input
                  type="text"
                  value={currentTheme.fonts.lineHeight}
                  onChange={(e) => handleFontChange('lineHeight', e.target.value)}
                  className="font-text"
                />
              </div>
            </div>
          )}

          {activeSection === 'themes' && (
            <div className="themes-section">
              <div className="themes-list">
                {allThemes.map((theme) => (
                  <div
                    key={theme.name}
                    className={`theme-card ${currentTheme.name === theme.name ? 'active' : ''}`}
                    onClick={() => handleSelectTheme(theme)}
                    onMouseEnter={() => handlePreviewTheme(theme)}
                    onMouseLeave={() => applyTheme()}
                  >
                    <div
                      className="theme-preview"
                      style={{
                        backgroundColor: theme.colors.background,
                        color: theme.colors.text,
                        borderColor: theme.colors.border,
                      }}
                    >
                      <span style={{ color: theme.colors.primary }}>标题</span>
                      <span style={{ color: theme.colors.textSecondary }}>正文</span>
                    </div>
                    <span className="theme-name">{theme.name}</span>
                    {theme.isCustom && (
                      <button
                        className="delete-theme-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeCustomTheme(theme.name);
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button className="save-theme-btn" onClick={handleSaveTheme}>
                保存当前主题
              </button>
            </div>
          )}
        </div>

        <div className="theme-editor-footer">
          <button className="reset-btn" onClick={resetTheme}>
            重置为默认
          </button>
          <button className="apply-btn" onClick={applyTheme}>
            应用更改
          </button>
        </div>
      </div>
    </div>
  );
}

function getColorLabel(key: keyof ThemeConfig['colors']): string {
  const labels: Record<keyof ThemeConfig['colors'], string> = {
    primary: '主色',
    background: '背景色',
    backgroundSecondary: '次级背景',
    text: '文字色',
    textSecondary: '次级文字',
    border: '边框色',
    success: '成功色',
    warning: '警告色',
    error: '错误色',
  };
  return labels[key] || key;
}