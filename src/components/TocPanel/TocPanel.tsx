import { useEffect, useMemo } from 'react';
import { useTranslation } from '../../i18n';
import { useEditorState } from '../../store/editorStore';
import './TocPanel.css';

interface TocPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TocItem {
  id: string;
  level: number;
  text: string;
  position: number;
}

function extractToc(content: string): TocItem[] {
  const toc: TocItem[] = [];
  const html = content;
  const regex = /<h([1-6])[^>]*>(.*?)<\/h[1-6]>/g;
  let match;

  while ((match = regex.exec(html)) !== null) {
    const level = parseInt(match[1]);
    const text = match[2].replace(/<[^>]*>/g, '').trim();
    const position = match.index;
    const id = `toc_${position}_${text.replace(/\s+/g, '_')}`;

    toc.push({ id, level, text, position });
  }

  return toc;
}

export function TocPanel({ isOpen, onClose }: TocPanelProps) {
  const { t } = useTranslation();
  const editorInstance = useEditorState((state) => state.editorInstance);
  
  const content = useMemo(() => {
    if (!editorInstance) return '';
    return editorInstance.getHTML();
  }, [editorInstance]);
  
  const tocItems = useMemo(() => extractToc(content), [content]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
  
  const scrollToHeading = (position: number) => {
    if (editorInstance) {
      editorInstance.commands.setTextSelection(position);
      editorInstance.commands.focus();
      editorInstance.commands.scrollIntoView();
    }
  };
  
  const insertTocToDocument = () => {
    if (!editorInstance || tocItems.length === 0) return;
    
    const lines: string[] = ['## 目录', '\n'];
    
    for (const item of tocItems) {
      const indent = '  '.repeat(item.level - 1);
      const link = `[${item.text}](#${item.text.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')})`;
      lines.push(`${indent}- ${link}`);
    }
    
    lines.push('\n---\n');
    const tocMarkdown = lines.join('\n');
    editorInstance.chain().focus().insertContentAt(0, tocMarkdown).run();
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="toc-panel-overlay" onClick={onClose}>
      <div className="toc-panel" onClick={(e) => e.stopPropagation()}>
        <div className="toc-panel-header">
          <h2>{t('view.tableOfContents')}</h2>
          <div className="toc-panel-actions">
            <button className="toc-insert-btn" onClick={insertTocToDocument}>
              {t('toc.insert')}
            </button>
            <button className="toc-close-btn" onClick={onClose}>×</button>
          </div>
        </div>
        
        <div className="toc-panel-content">
          {tocItems.length === 0 ? (
            <div className="toc-empty">{t('toc.empty')}</div>
          ) : (
            <ul className="toc-list">
              {tocItems.map((item) => (
                <li
                  key={item.id}
                  className={`toc-item level-${item.level}`}
                  onClick={() => scrollToHeading(item.position)}
                >
                  <span className="toc-level">H{item.level}</span>
                  <span className="toc-text">{item.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        <div className="toc-panel-footer">
          <span className="toc-hint">{t('toc.clickToJump')}</span>
        </div>
      </div>
    </div>
  );
}