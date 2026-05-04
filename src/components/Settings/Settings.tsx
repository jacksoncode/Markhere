import { useState, useEffect } from 'react';
import { useTranslation, useLanguageStore } from '../../i18n';
import { useSettingsStore } from '../../store/settingsStore';
import './Settings.css';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab = 'general' | 'appearance' | 'editor' | 'markdown' | 'codeFences' | 'image' | 'files' | 'export';

const popularLanguages = [
  { value: '', label: 'None' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'c', label: 'C' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'bash', label: 'Bash' },
  { value: 'sql', label: 'SQL' },
  { value: 'json', label: 'JSON' },
  { value: 'yaml', label: 'YAML' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
];

export function Settings({ isOpen, onClose }: SettingsProps) {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguageStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');
  
  const {
    theme, setTheme,
    indentSize, setIndentSize,
    lineEnding, setLineEnding,
    exportFolder, setExportFolder,
    exportCustomPath, setExportCustomPath,
    defaultCodeLanguage, setDefaultCodeLanguage,
    imageInsertBehavior, setImageInsertBehavior,
    imageFolder, setImageFolder,
    enableDiagrams, setEnableDiagrams,
    enableMath, setEnableMath,
    enableFootnotes, setEnableFootnotes,
    enableYaml, setEnableYaml,
    enableAutoLinks, setEnableAutoLinks,
    reopenLastFiles, setReopenLastFiles,
    smartPaste, setSmartPaste,
    autoMatchBrackets, setAutoMatchBrackets,
    fontFamily, setFontFamily,
    fontSize, setFontSize,
    showLineNumber, setShowLineNumber,
    spellCheck, setSpellCheck,
    spellCheckLanguage, setSpellCheckLanguage,
    autoSave, setAutoSave,
    autoSaveInterval, setAutoSaveInterval,
    focusMode, setFocusMode,
    typewriterMode, setTypewriterMode,
    showWordCount, setShowWordCount,
  } = useSettingsStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`;
  }, [fontSize]);

  if (!isOpen) return null;

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'general', label: t('settings.general') },
    { id: 'appearance', label: t('settings.appearance') },
    { id: 'editor', label: t('settings.editor') },
    { id: 'markdown', label: t('settings.markdown') },
    { id: 'codeFences', label: t('settings.codeFences') },
    { id: 'image', label: t('settings.image') },
    { id: 'files', label: t('settings.files') },
    { id: 'export', label: t('settings.export') },
  ];

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>{t('settings.title')}</h2>
          <button className="settings-close" onClick={onClose}>×</button>
        </div>

        <div className="settings-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="settings-content">
          {activeTab === 'general' && (
            <div className="settings-section-container">
              <section className="settings-section">
                <h3>{t('settings.language')}</h3>
                <div className="settings-option">
                  <select 
                    value={language} 
                    onChange={(e) => setLanguage(e.target.value as 'zh-CN' | 'en-US')}
                    className="settings-select"
                  >
                    <option value="zh-CN">中文</option>
                    <option value="en-US">English</option>
                  </select>
                </div>
              </section>

              <section className="settings-section">
                <h3>{t('settings.generalSection.startup')}</h3>
                <div className="settings-option">
                  <label className="settings-checkbox">
                    <input 
                      type="checkbox" 
                      checked={reopenLastFiles} 
                      onChange={(e) => setReopenLastFiles(e.target.checked)}
                    />
                    <span>{t('settings.generalSection.reopenLastFiles')}</span>
                  </label>
                  <p className="settings-desc">{t('settings.generalSection.reopenLastFilesDesc')}</p>
                </div>
              </section>

              <section className="settings-section">
                <h3>{t('settings.modesSection.focusMode')}</h3>
                <div className="settings-option">
                  <label className="settings-checkbox">
                    <input 
                      type="checkbox" 
                      checked={focusMode} 
                      onChange={(e) => setFocusMode(e.target.checked)}
                    />
                    <span>{t('settings.modesSection.focusMode')}</span>
                  </label>
                  <p className="settings-desc">{t('settings.modesSection.focusModeDesc')}</p>
                </div>
                <div className="settings-option">
                  <label className="settings-checkbox">
                    <input 
                      type="checkbox" 
                      checked={typewriterMode} 
                      onChange={(e) => setTypewriterMode(e.target.checked)}
                    />
                    <span>{t('settings.modesSection.typewriterMode')}</span>
                  </label>
                  <p className="settings-desc">{t('settings.modesSection.typewriterModeDesc')}</p>
                </div>
              </section>

              <section className="settings-section">
                <h3>{t('settings.autoSaveSection.enableAutoSave')}</h3>
                <div className="settings-option">
                  <label className="settings-checkbox">
                    <input 
                      type="checkbox" 
                      checked={autoSave} 
                      onChange={(e) => setAutoSave(e.target.checked)}
                    />
                    <span>{t('settings.autoSaveSection.enableAutoSave')}</span>
                  </label>
                </div>
                <div className="settings-option">
                  <label className="settings-label">
                    <span>{t('settings.autoSaveSection.autoSaveInterval')}</span>
                    <input 
                      type="number" 
                      value={autoSaveInterval / 1000} 
                      onChange={(e) => setAutoSaveInterval(Number(e.target.value) * 1000)}
                      min={5}
                      max={300}
                      className="settings-input"
                    />
                  </label>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="settings-section-container">
              <section className="settings-section">
                <h3>{t('settings.appearanceSection.themeTitle')}</h3>
                <div className="settings-option theme-selector">
                  <button 
                    className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
                    onClick={() => setTheme('light')}
                  >
                    <span className="theme-preview light"></span>
                    {t('settings.appearanceSection.themeLight')}
                  </button>
                  <button 
                    className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
                    onClick={() => setTheme('dark')}
                  >
                    <span className="theme-preview dark"></span>
                    {t('settings.appearanceSection.themeDark')}
                  </button>
                  <button 
                    className={`theme-btn ${theme === 'sepia' ? 'active' : ''}`}
                    onClick={() => setTheme('sepia')}
                  >
                    <span className="theme-preview sepia"></span>
                    {t('settings.appearanceSection.themeSepia')}
                  </button>
                </div>
              </section>

              <section className="settings-section">
                <h3>{t('settings.appearanceSection.fontTitle')}</h3>
                <div className="settings-option">
                  <label className="settings-label">
                    <span>{t('settings.appearanceSection.fontFamily')}</span>
                    <input 
                      type="text" 
                      value={fontFamily} 
                      onChange={(e) => setFontFamily(e.target.value)}
                      className="settings-input"
                      placeholder="Font family"
                    />
                  </label>
                </div>
                <div className="settings-option">
                  <label className="settings-label">
                    <span>{t('settings.appearanceSection.fontSize')}</span>
                    <input 
                      type="number" 
                      value={fontSize} 
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      min={10}
                      max={24}
                      className="settings-input small"
                    />
                    <span className="settings-unit">px</span>
                  </label>
                </div>
              </section>

              <section className="settings-section">
                <h3>{t('settings.appearanceSection.wordCountTitle')}</h3>
                <div className="settings-option">
                  <label className="settings-checkbox">
                    <input 
                      type="checkbox" 
                      checked={showWordCount} 
                      onChange={(e) => setShowWordCount(e.target.checked)}
                    />
                    <span>{t('settings.appearanceSection.showWordCount')}</span>
                  </label>
                </div>
              </section>

              <section className="settings-section">
                <h3>{t('settings.appearanceSection.lineNumberTitle')}</h3>
                <div className="settings-option">
                  <label className="settings-checkbox">
                    <input 
                      type="checkbox" 
                      checked={showLineNumber} 
                      onChange={(e) => setShowLineNumber(e.target.checked)}
                    />
                    <span>{t('settings.appearanceSection.showLineNumber')}</span>
                  </label>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'editor' && (
            <div className="settings-section-container">
              <section className="settings-section">
                <h3>{t('settings.editorSection.indentTitle')}</h3>
                <div className="settings-option">
                  <label className="settings-label">
                    <span>{t('settings.editorSection.indentSize')}</span>
                    <select 
                      value={indentSize} 
                      onChange={(e) => setIndentSize(Number(e.target.value))}
                      className="settings-select"
                    >
                      <option value={2}>2 spaces</option>
                      <option value={4}>4 spaces</option>
                    </select>
                  </label>
                  <p className="settings-desc">{t('settings.editorSection.indentSizeDesc')}</p>
                </div>
              </section>

              <section className="settings-section">
                <h3>{t('settings.editorSection.lineEndingTitle')}</h3>
                <div className="settings-option">
                  <label className="settings-label">
                    <span>{t('settings.editorSection.lineEndingTitle')}</span>
                    <select 
                      value={lineEnding} 
                      onChange={(e) => setLineEnding(e.target.value as 'lf' | 'crlf')}
                      className="settings-select"
                    >
                      <option value="lf">{t('settings.editorSection.lineEndingLf')}</option>
                      <option value="crlf">{t('settings.editorSection.lineEndingCrlf')}</option>
                    </select>
                  </label>
                  <p className="settings-desc">{t('settings.editorSection.lineEndingDesc')}</p>
                </div>
              </section>

              <section className="settings-section">
                <h3>{t('settings.editorSection.behaviorTitle')}</h3>
                <div className="settings-option">
                  <label className="settings-checkbox">
                    <input 
                      type="checkbox" 
                      checked={smartPaste} 
                      onChange={(e) => setSmartPaste(e.target.checked)}
                    />
                    <span>{t('settings.editorSection.smartPaste')}</span>
                  </label>
                  <p className="settings-desc">{t('settings.editorSection.smartPasteDesc')}</p>
                </div>
                <div className="settings-option">
                  <label className="settings-checkbox">
                    <input 
                      type="checkbox" 
                      checked={autoMatchBrackets} 
                      onChange={(e) => setAutoMatchBrackets(e.target.checked)}
                    />
                    <span>{t('settings.editorSection.autoMatchBrackets')}</span>
                  </label>
                  <p className="settings-desc">{t('settings.editorSection.autoMatchBracketsDesc')}</p>
                </div>
              </section>

              <section className="settings-section">
                <h3>{t('settings.editorSection.spellCheckTitle')}</h3>
                <div className="settings-option">
                  <label className="settings-checkbox">
                    <input 
                      type="checkbox" 
                      checked={spellCheck} 
                      onChange={(e) => setSpellCheck(e.target.checked)}
                    />
                    <span>{t('settings.editorSection.enableSpellCheck')}</span>
                  </label>
                </div>
                <div className="settings-option">
                  <label className="settings-label">
                    <span>{t('settings.editorSection.spellCheckLanguage')}</span>
                    <select 
                      value={spellCheckLanguage} 
                      onChange={(e) => setSpellCheckLanguage(e.target.value)}
                      className="settings-select"
                    >
                      <option value="en-US">English (US)</option>
                      <option value="en-GB">English (UK)</option>
                      <option value="zh-CN">中文</option>
                    </select>
                  </label>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'markdown' && (
            <div className="settings-section-container">
              <section className="settings-section">
                <h3>{t('settings.markdownSection.syntaxTitle')}</h3>
                <p className="settings-desc">{t('settings.markdownSection.syntaxDesc')}</p>
                <div className="settings-option">
                  <label className="settings-checkbox">
                    <input 
                      type="checkbox" 
                      checked={enableDiagrams} 
                      onChange={(e) => setEnableDiagrams(e.target.checked)}
                    />
                    <span>{t('settings.markdownSection.enableDiagrams')}</span>
                  </label>
                </div>
                <div className="settings-option">
                  <label className="settings-checkbox">
                    <input 
                      type="checkbox" 
                      checked={enableMath} 
                      onChange={(e) => setEnableMath(e.target.checked)}
                    />
                    <span>{t('settings.markdownSection.enableMath')}</span>
                  </label>
                </div>
                <div className="settings-option">
                  <label className="settings-checkbox">
                    <input 
                      type="checkbox" 
                      checked={enableFootnotes} 
                      onChange={(e) => setEnableFootnotes(e.target.checked)}
                    />
                    <span>{t('settings.markdownSection.enableFootnotes')}</span>
                  </label>
                </div>
                <div className="settings-option">
                  <label className="settings-checkbox">
                    <input 
                      type="checkbox" 
                      checked={enableYaml} 
                      onChange={(e) => setEnableYaml(e.target.checked)}
                    />
                    <span>{t('settings.markdownSection.enableYaml')}</span>
                  </label>
                </div>
                <div className="settings-option">
                  <label className="settings-checkbox">
                    <input 
                      type="checkbox" 
                      checked={enableAutoLinks} 
                      onChange={(e) => setEnableAutoLinks(e.target.checked)}
                    />
                    <span>{t('settings.markdownSection.enableAutoLinks')}</span>
                  </label>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'codeFences' && (
            <div className="settings-section-container">
              <section className="settings-section">
                <h3>{t('settings.codeFencesSection.defaultLanguage')}</h3>
                <div className="settings-option">
                  <label className="settings-label">
                    <span>{t('settings.codeFencesSection.defaultLanguage')}</span>
                    <select 
                      value={defaultCodeLanguage} 
                      onChange={(e) => setDefaultCodeLanguage(e.target.value)}
                      className="settings-select"
                    >
                      {popularLanguages.map((lang) => (
                        <option key={lang.value} value={lang.value}>{lang.label}</option>
                      ))}
                    </select>
                  </label>
                  <p className="settings-desc">{t('settings.codeFencesSection.defaultLanguageDesc')}</p>
                </div>
              </section>

              <section className="settings-section">
                <h3>{t('settings.codeFencesSection.codeBlockTitle')}</h3>
                <div className="settings-option">
                  <label className="settings-checkbox">
                    <input 
                      type="checkbox" 
                      checked={showLineNumber} 
                      onChange={(e) => setShowLineNumber(e.target.checked)}
                    />
                    <span>{t('settings.appearanceSection.showLineNumber')}</span>
                  </label>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'image' && (
            <div className="settings-section-container">
              <section className="settings-section">
                <h3>{t('settings.imageSection.insertBehavior')}</h3>
                <div className="settings-option">
                  <label className="settings-label">
                    <span>{t('settings.imageSection.insertBehavior')}</span>
                    <select 
                      value={imageInsertBehavior} 
                      onChange={(e) => setImageInsertBehavior(e.target.value as 'copy' | 'link' | 'upload')}
                      className="settings-select"
                    >
                      <option value="copy">{t('settings.imageSection.insertCopy')}</option>
                      <option value="link">{t('settings.imageSection.insertLink')}</option>
                      <option value="upload">{t('settings.imageSection.insertUpload')}</option>
                    </select>
                  </label>
                  <p className="settings-desc">{t('settings.imageSection.insertBehaviorDesc')}</p>
                </div>
              </section>

              <section className="settings-section">
                <h3>{t('settings.imageSection.globalFolder')}</h3>
                <div className="settings-option">
                  <label className="settings-label">
                    <span>{t('settings.imageSection.globalFolder')}</span>
                    <input 
                      type="text" 
                      value={imageFolder} 
                      onChange={(e) => setImageFolder(e.target.value)}
                      className="settings-input"
                      placeholder="./assets"
                    />
                  </label>
                  <p className="settings-desc">{t('settings.imageSection.globalFolderDesc')}</p>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'files' && (
            <div className="settings-section-container">
              <section className="settings-section">
                <h3>{t('settings.filesSection.dropBehavior')}</h3>
                <div className="settings-option">
                  <p className="settings-desc">{t('settings.filesSection.dropBehaviorDesc')}</p>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="settings-section-container">
              <section className="settings-section">
                <h3>{t('settings.exportSection.exportFolder')}</h3>
                <div className="settings-option">
                  <label className="settings-label">
                    <span>{t('settings.exportSection.exportFolder')}</span>
                    <select 
                      value={exportFolder} 
                      onChange={(e) => setExportFolder(e.target.value as 'auto' | 'same' | 'custom')}
                      className="settings-select"
                    >
                      <option value="auto">{t('settings.exportSection.exportAuto')}</option>
                      <option value="same">{t('settings.exportSection.exportSame')}</option>
                      <option value="custom">{t('settings.exportSection.exportCustom')}</option>
                    </select>
                  </label>
                  <p className="settings-desc">{t('settings.exportSection.exportFolderDesc')}</p>
                </div>
                {exportFolder === 'custom' && (
                  <div className="settings-option">
                    <label className="settings-label">
                      <span>{t('settings.exportSection.customPath')}</span>
                      <input 
                        type="text" 
                        value={exportCustomPath} 
                        onChange={(e) => setExportCustomPath(e.target.value)}
                        className="settings-input"
                        placeholder="/path/to/export/folder"
                      />
                    </label>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>

        <div className="settings-footer">
          <button className="settings-cancel" onClick={onClose}>
            {t('settings.cancel')}
          </button>
          <button className="settings-save" onClick={onClose}>
            {t('settings.save')}
          </button>
        </div>
      </div>
    </div>
  );
}