import { useState } from 'react';
import { documentTemplates, DocumentTemplate, getTemplatesByCategory } from '../../data/templates';
import { useEditorState } from '../../store/editorStore';
import { useTranslation } from '../../i18n';
import { expandTemplateVariables } from '../../services/TemplateVariables';
import './TemplateSelector.css';

interface TemplateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TemplateSelector({ isOpen, onClose }: TemplateSelectorProps) {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<DocumentTemplate['category'] | 'all'>('all');
  const { editorInstance } = useEditorState();

  const categories: DocumentTemplate['category'][] = ['academic', 'personal', 'business', 'creative', 'writing'];

  const categoryLabels: Record<DocumentTemplate['category'], string> = {
    academic: t('template.academic'),
    personal: t('template.personal'),
    business: t('template.business'),
    creative: t('template.creative'),
    writing: t('template.writing') || '写作',
  };

  const filteredTemplates = selectedCategory === 'all'
    ? documentTemplates
    : getTemplatesByCategory(selectedCategory);

  const handleSelectTemplate = (template: DocumentTemplate) => {
    if (editorInstance) {
      // Expand template date/time variables before inserting
      const expanded = expandTemplateVariables(template.content);
      editorInstance.commands.setContent(expanded);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="template-selector-overlay" onClick={onClose}>
      <div className="template-selector-modal" onClick={(e) => e.stopPropagation()}>
        <div className="template-selector-header">
          <h2>{t('template.selectTemplate')}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="template-selector-categories">
          <button
            className={`category-btn ${selectedCategory === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('all')}
          >
            {t('template.all')}
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              className={`category-btn ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {categoryLabels[cat]}
            </button>
          ))}
        </div>

        <div className="template-selector-grid">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="template-card"
              onClick={() => handleSelectTemplate(template)}
            >
              <div className="template-icon">{template.icon}</div>
              <div className="template-info">
                <h3 className="template-name">{template.name}</h3>
                <p className="template-desc">{template.description}</p>
              </div>
              <span className="template-category-tag">{categoryLabels[template.category]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}