import { useEditorState } from '../../store/editorStore';
import { useUIState } from '../../store/uiStore';
import { ToolbarIcons } from './ToolbarIcons';
import './Toolbar.css';
import './ToolbarIcons.css';

export function Toolbar() {
  const { editorInstance } = useEditorState();
  const { toggleFocusMode, toggleTypewriterMode } = useUIState();

  if (!editorInstance) return null;

  const items = [
    { 
      icon: ToolbarIcons.Bold, 
      label: 'Bold',
      action: () => editorInstance.chain().focus().toggleBold().run(), 
      active: editorInstance.isActive('bold') 
    },
    { 
      icon: ToolbarIcons.Italic, 
      label: 'Italic',
      action: () => editorInstance.chain().focus().toggleItalic().run(), 
      active: editorInstance.isActive('italic') 
    },
    { 
      icon: ToolbarIcons.Underline, 
      label: 'Underline',
      action: () => editorInstance.chain().focus().toggleUnderline().run(), 
      active: editorInstance.isActive('underline') 
    },
    { 
      icon: ToolbarIcons.Strikethrough, 
      label: 'Strike',
      action: () => editorInstance.chain().focus().toggleStrike().run(), 
      active: editorInstance.isActive('strike') 
    },
    { 
      icon: ToolbarIcons.Highlight, 
      label: 'Highlight',
      action: () => editorInstance.chain().focus().toggleHighlight().run(), 
      active: editorInstance.isActive('highlight') 
    },
    { 
      icon: ToolbarIcons.Code, 
      label: 'Code',
      action: () => editorInstance.chain().focus().toggleCode().run(), 
      active: editorInstance.isActive('code') 
    },
    { 
      icon: ToolbarIcons.Link, 
      label: 'Link',
      action: () => editorInstance.chain().focus().toggleLink({ href: '' }).run(), 
      active: editorInstance.isActive('link') 
    },
    { 
      icon: ToolbarIcons.Image, 
      label: 'Image',
      action: () => {}, 
      active: false 
    },
    { 
      icon: ToolbarIcons.Table, 
      label: 'Table',
      action: () => editorInstance.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(), 
      active: editorInstance.isActive('table') 
    },
    { 
      icon: ToolbarIcons.Heading1, 
      label: 'H1',
      action: () => editorInstance.chain().focus().toggleHeading({ level: 1 }).run(), 
      active: editorInstance.isActive('heading', { level: 1 }) 
    },
    { 
      icon: ToolbarIcons.Heading2, 
      label: 'H2',
      action: () => editorInstance.chain().focus().toggleHeading({ level: 2 }).run(), 
      active: editorInstance.isActive('heading', { level: 2 }) 
    },
    { 
      icon: ToolbarIcons.Heading3, 
      label: 'H3',
      action: () => editorInstance.chain().focus().toggleHeading({ level: 3 }).run(), 
      active: editorInstance.isActive('heading', { level: 3 }) 
    },
    { 
      icon: ToolbarIcons.BulletList, 
      label: 'Bullet',
      action: () => editorInstance.chain().focus().toggleBulletList().run(), 
      active: editorInstance.isActive('bulletList') 
    },
    { 
      icon: ToolbarIcons.NumberList, 
      label: 'Number',
      action: () => editorInstance.chain().focus().toggleOrderedList().run(), 
      active: editorInstance.isActive('orderedList') 
    },
    { 
      icon: ToolbarIcons.TaskList, 
      label: 'Task',
      action: () => editorInstance.chain().focus().toggleTaskList().run(), 
      active: editorInstance.isActive('taskList') 
    },
    { 
      icon: ToolbarIcons.Quote, 
      label: 'Quote',
      action: () => editorInstance.chain().focus().toggleBlockquote().run(), 
      active: editorInstance.isActive('blockquote') 
    },
    { 
      icon: ToolbarIcons.CodeBlock, 
      label: 'Code Block',
      action: () => editorInstance.chain().focus().toggleCodeBlock().run(), 
      active: editorInstance.isActive('codeBlock') 
    },
  ];

  return (
    <div className="toolbar auto-hide-ui">
      <div className="toolbar-group">
        {items.slice(0, 6).map((item) => (
          <button
            key={item.label}
            className={`toolbar-btn toolbar-btn-with-label ${item.active ? 'active' : ''}`}
            onClick={item.action}
            title={item.label}
          >
            <item.icon className="toolbar-icon" />
            <span className="toolbar-btn-label">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        {items.slice(6, 9).map((item) => (
          <button
            key={item.label}
            className={`toolbar-btn toolbar-btn-with-label ${item.active ? 'active' : ''}`}
            onClick={item.action}
            title={item.label}
          >
            <item.icon className="toolbar-icon" />
            <span className="toolbar-btn-label">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        {items.slice(9).map((item) => (
          <button
            key={item.label}
            className={`toolbar-btn toolbar-btn-with-label ${item.active ? 'active' : ''}`}
            onClick={item.action}
            title={item.label}
          >
            <item.icon className="toolbar-icon" />
            <span className="toolbar-btn-label">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button
          className="toolbar-btn toolbar-btn-with-label"
          onClick={toggleFocusMode}
          title="Focus Mode"
        >
          <svg className="toolbar-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
          </svg>
          <span className="toolbar-btn-label">Focus</span>
        </button>
        <button
          className="toolbar-btn toolbar-btn-with-label"
          onClick={toggleTypewriterMode}
          title="Typewriter Mode"
        >
          <svg className="toolbar-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
          </svg>
          <span className="toolbar-btn-label">Typewriter</span>
        </button>
      </div>
    </div>
  );
}