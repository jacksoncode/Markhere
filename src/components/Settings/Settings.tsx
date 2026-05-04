import { useState } from 'react';
import { useTranslation, useLanguageStore } from '../../i18n';
import { useUIState } from '../../store/uiStore';
import './Settings.css';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Settings({ isOpen, onClose }: SettingsProps) {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguageStore();
  const { focusMode, toggleFocusMode, typewriterMode, toggleTypewriterMode } = useUIState();
  const [autoSave, setAutoSave] = useState(true);
  const [spellCheck, setSpellCheck] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>{t('settings.title')}</h2>
          <button className="settings-close" onClick={onClose}>×</button>
        </div>

        <div className="settings-content">
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
            <h3>{t('settings.editor')}</h3>
            <div className="settings-option">
              <label className="settings-checkbox">
                <input 
                  type="checkbox" 
                  checked={focusMode} 
                  onChange={toggleFocusMode}
                />
                <span>{t('view.focusMode')}</span>
              </label>
            </div>
            <div className="settings-option">
              <label className="settings-checkbox">
                <input 
                  type="checkbox" 
                  checked={typewriterMode} 
                  onChange={toggleTypewriterMode}
                />
                <span>{t('view.typewriterMode')}</span>
              </label>
            </div>
          </section>

          <section className="settings-section">
            <h3>{t('settings.autoSave')}</h3>
            <div className="settings-option">
              <label className="settings-checkbox">
                <input 
                  type="checkbox" 
                  checked={autoSave} 
                  onChange={(e) => setAutoSave(e.target.checked)}
                />
                <span>启用自动保存</span>
              </label>
            </div>
          </section>

          <section className="settings-section">
            <h3>拼写检查</h3>
            <div className="settings-option">
              <label className="settings-checkbox">
                <input 
                  type="checkbox" 
                  checked={spellCheck} 
                  onChange={(e) => setSpellCheck(e.target.checked)}
                />
                <span>启用拼写检查</span>
              </label>
            </div>
          </section>
        </div>

        <div className="settings-footer">
          <button className="settings-save" onClick={onClose}>
            保存
          </button>
        </div>
      </div>
    </div>
  );
}