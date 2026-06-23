// ──── Cover Editor - 文档封面与图标编辑器 ────

import { useState, useEffect } from 'react';
import { CoverMetadata, selectCoverImage, COVER_TEMPLATES, COMMON_ICONS, generateCoverHTML } from '../../services/CoverService';
import { useFileStore } from '../../store/fileStore';
import { useTranslation } from '../../i18n';
import { useNotificationStore } from '../Notification/Notification';
import './CoverEditor.css';

interface CoverEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (metadata: CoverMetadata) => void;
  initialMetadata?: CoverMetadata;
}

export function CoverEditor({ isOpen, onClose, onApply, initialMetadata }: CoverEditorProps) {
  const { t } = useTranslation();
  const { notify } = useNotificationStore();
  const { fileName } = useFileStore();
  
  const [metadata, setMetadata] = useState<CoverMetadata>(initialMetadata || {});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [previewHTML, setPreviewHTML] = useState('');

  useEffect(() => {
    if (isOpen) {
      // 初始化标题为文件名
      if (!metadata.title && fileName) {
        setMetadata(prev => ({ ...prev, title: fileName.replace(/\.md$/, '') }));
      }
    }
  }, [isOpen, fileName]);

  useEffect(() => {
    // 更新预览
    setPreviewHTML(generateCoverHTML(metadata));
  }, [metadata]);

  const handleSelectImage = async () => {
    try {
      const imagePath = await selectCoverImage();
      if (imagePath) {
        setMetadata(prev => ({ ...prev, coverImage: imagePath }));
        notify('success', t('cover.imageSelected'));
      }
    } catch (error) {
      notify('error', String(error), t('cover.selectFailed'));
    }
  };

  const handleRemoveImage = () => {
    setMetadata(prev => ({ ...prev, coverImage: undefined }));
  };

  const handleSelectIcon = (icon: string) => {
    setMetadata(prev => ({ ...prev, icon }));
    setShowEmojiPicker(false);
  };

  const handleSelectTemplate = (templateId: string) => {
    const template = COVER_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setMetadata(prev => ({
        ...prev,
        backgroundColor: template.preset.backgroundColor,
        icon: template.preset.icon || prev.icon,
      }));
    }
  };

  const handleApply = () => {
    onApply(metadata);
    onClose();
    notify('success', t('cover.applied'));
  };

  if (!isOpen) return null;

  return (
    <div className="cover-editor-overlay" onClick={onClose}>
      <div className="cover-editor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cover-editor-header">
          <h2>{t('cover.editCover')}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="cover-editor-content">
          {/* 预览区域 */}
          <div className="cover-preview-section">
            <h3>{t('cover.preview')}</h3>
            <div className="cover-preview-container">
              {previewHTML ? (
                <div dangerouslySetInnerHTML={{ __html: previewHTML }} />
              ) : (
                <div className="cover-preview-empty">
                  {t('cover.noCover')}
                </div>
              )}
            </div>
          </div>

          {/* 模板选择 */}
          <div className="cover-template-section">
            <h3>{t('cover.templates')}</h3>
            <div className="cover-template-grid">
              {COVER_TEMPLATES.map(template => (
                <button
                  key={template.id}
                  className={`template-btn ${metadata.backgroundColor === template.preset.backgroundColor ? 'active' : ''}`}
                  onClick={() => handleSelectTemplate(template.id)}
                  style={{ backgroundColor: template.preset.backgroundColor }}
                >
                  <span className="template-icon">{template.icon}</span>
                  <span className="template-name">{template.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 封面图片 */}
          <div className="cover-image-section">
            <h3>{t('cover.coverImage')}</h3>
            <div className="cover-image-controls">
              {metadata.coverImage ? (
                <div className="cover-image-preview">
                  <img src={metadata.coverImage} alt="Cover" />
                  <button className="remove-image-btn" onClick={handleRemoveImage}>
                    {t('cover.removeImage')}
                  </button>
                </div>
              ) : (
                <button className="select-image-btn" onClick={handleSelectImage}>
                  {t('cover.selectImage')}
                </button>
              )}
            </div>
          </div>

          {/* 图标选择 */}
          <div className="cover-icon-section">
            <h3>{t('cover.icon')}</h3>
            <div className="cover-icon-controls">
              <button 
                className={`current-icon-btn ${showEmojiPicker ? 'active' : ''}`}
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              >
                {metadata.icon || '📄'}
              </button>
              
              {showEmojiPicker && (
                <div className="emoji-picker-panel">
                  {COMMON_ICONS.map(icon => (
                    <button
                      key={icon}
                      className={`emoji-option ${metadata.icon === icon ? 'selected' : ''}`}
                      onClick={() => handleSelectIcon(icon)}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 标题信息 */}
          <div className="cover-info-section">
            <h3>{t('cover.info')}</h3>
            
            <div className="cover-info-field">
              <label>{t('cover.title')}</label>
              <input
                type="text"
                value={metadata.title || ''}
                onChange={(e) => setMetadata(prev => ({ ...prev, title: e.target.value }))}
                placeholder={t('cover.titlePlaceholder')}
              />
            </div>

            <div className="cover-info-field">
              <label>{t('cover.subtitle')}</label>
              <input
                type="text"
                value={metadata.subtitle || ''}
                onChange={(e) => setMetadata(prev => ({ ...prev, subtitle: e.target.value }))}
                placeholder={t('cover.subtitlePlaceholder')}
              />
            </div>

            <div className="cover-info-field">
              <label>{t('cover.author')}</label>
              <input
                type="text"
                value={metadata.author || ''}
                onChange={(e) => setMetadata(prev => ({ ...prev, author: e.target.value }))}
                placeholder={t('cover.authorPlaceholder')}
              />
            </div>

            <div className="cover-info-field">
              <label>{t('cover.date')}</label>
              <input
                type="text"
                value={metadata.date || ''}
                onChange={(e) => setMetadata(prev => ({ ...prev, date: e.target.value }))}
                placeholder={new Date().toLocaleDateString('zh-CN')}
              />
            </div>

            <div className="cover-info-field">
              <label>{t('cover.backgroundColor')}</label>
              <input
                type="color"
                value={metadata.backgroundColor || '#ffffff'}
                onChange={(e) => setMetadata(prev => ({ ...prev, backgroundColor: e.target.value }))}
              />
              <input
                type="text"
                value={metadata.backgroundColor || '#ffffff'}
                onChange={(e) => setMetadata(prev => ({ ...prev, backgroundColor: e.target.value }))}
                placeholder="#ffffff"
              />
            </div>
          </div>
        </div>

        <div className="cover-editor-footer">
          <button className="cancel-btn" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="apply-btn" onClick={handleApply}>
            {t('cover.apply')}
          </button>
        </div>
      </div>
    </div>
  );
}