import { useState } from 'react';
import { documentTemplates, DocumentTemplate, getTemplatesByCategory } from '../../data/templates';
import { useEditorState } from '../../store/editorStore';
import './TemplateSelector.css';

interface TemplateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

const categoryLabels: Record<DocumentTemplate['category'], string> = {
  academic: '学术',
  personal: '个人',
  business: '商业',
  creative: '创作',
};

export function TemplateSelector({ isOpen, onClose }: TemplateSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<DocumentTemplate['category'] | 'all'>('all');
  const { editorInstance } = useEditorState();

  const categories: DocumentTemplate['category'][] = ['academic', 'personal', 'business', 'creative'];

  const filteredTemplates = selectedCategory === 'all'
    ? documentTemplates
    : getTemplatesByCategory(selectedCategory);

  const handleSelectTemplate = (template: DocumentTemplate) => {
    if (editorInstance) {
      editorInstance.commands.setContent(template.content);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="template-selector-overlay" onClick={onClose}>
      <div className="template-selector-modal" onClick={(e) => e.stopPropagation()}>
        <div className="template-selector-header">
          <h2>选择文档模板</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="template-selector-categories">
          <button
            className={`category-btn ${selectedCategory === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('all')}
          >
            全部
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