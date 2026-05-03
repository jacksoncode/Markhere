import { useEditorState } from '../../store/editorStore';
import './Toolbar.css';

export function Toolbar() {
  const { editorInstance } = useEditorState();

  if (!editorInstance) return null;

  const actions = [
    { label: 'B', action: () => editorInstance.chain().focus().toggleBold().run(), active: editorInstance.isActive('bold') },
    { label: 'I', action: () => editorInstance.chain().focus().toggleItalic().run(), active: editorInstance.isActive('italic') },
    { label: 'U', action: () => editorInstance.chain().focus().toggleUnderline().run(), active: editorInstance.isActive('underline') },
    { label: 'S', action: () => editorInstance.chain().focus().toggleStrike().run(), active: editorInstance.isActive('strike') },
    { label: 'H', action: () => editorInstance.chain().focus().toggleHighlight().run(), active: editorInstance.isActive('highlight') },
    { label: 'Code', action: () => editorInstance.chain().focus().toggleCode().run(), active: editorInstance.isActive('code') },
    { label: 'Link', action: () => editorInstance.chain().focus().toggleLink({ href: '' }).run(), active: editorInstance.isActive('link') },
    { label: 'Img', action: () => {}, active: false },
    { label: 'Table', action: () => editorInstance.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(), active: editorInstance.isActive('table') },
    { label: 'H1', action: () => editorInstance.chain().focus().toggleHeading({ level: 1 }).run(), active: editorInstance.isActive('heading', { level: 1 }) },
    { label: 'H2', action: () => editorInstance.chain().focus().toggleHeading({ level: 2 }).run(), active: editorInstance.isActive('heading', { level: 2 }) },
    { label: 'H3', action: () => editorInstance.chain().focus().toggleHeading({ level: 3 }).run(), active: editorInstance.isActive('heading', { level: 3 }) },
    { label: 'UL', action: () => editorInstance.chain().focus().toggleBulletList().run(), active: editorInstance.isActive('bulletList') },
    { label: 'OL', action: () => editorInstance.chain().focus().toggleOrderedList().run(), active: editorInstance.isActive('orderedList') },
    { label: 'Task', action: () => editorInstance.chain().focus().toggleTaskList().run(), active: editorInstance.isActive('taskList') },
    { label: 'Quote', action: () => editorInstance.chain().focus().toggleBlockquote().run(), active: editorInstance.isActive('blockquote') },
    { label: 'CB', action: () => editorInstance.chain().focus().toggleCodeBlock().run(), active: editorInstance.isActive('codeBlock') },
  ];

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        {actions.slice(0, 6).map((item) => (
          <button
            key={item.label}
            className={`toolbar-btn ${item.active ? 'active' : ''}`}
            onClick={item.action}
            title={item.label}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        {actions.slice(6, 9).map((item) => (
          <button
            key={item.label}
            className={`toolbar-btn ${item.active ? 'active' : ''}`}
            onClick={item.action}
            title={item.label}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        {actions.slice(9).map((item) => (
          <button
            key={item.label}
            className={`toolbar-btn ${item.active ? 'active' : ''}`}
            onClick={item.action}
            title={item.label}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}