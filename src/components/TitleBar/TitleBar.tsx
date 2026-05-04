import { useState, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { useFileStore } from '../../store/fileStore';
import { useEditorState } from '../../store/editorStore';
import { useUIState } from '../../store/uiStore';
import { ShortcutSettings } from '../ShortcutSettings';
import { TemplateSelector } from '../TemplateSelector';
import { BookmarkPanel } from '../BookmarkPanel';
import { ThemeEditor } from '../ThemeEditor';
import { VersionHistory } from '../VersionHistory';
import { CollaborationPanel } from '../Collaboration';
import './TitleBar.css';

export function TitleBar() {
  const { currentPath, setCurrentPath, setSavedContent } = useFileStore();
  const { editorInstance } = useEditorState();
  const { sidebarOpen, toggleSidebar, focusMode, toggleFocusMode, typewriterMode, toggleTypewriterMode, sourceMode, toggleSourceMode, pomodoroEnabled, togglePomodoro, wordGoalEnabled, toggleWordGoal } = useUIState();
  
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showShortcutSettings, setShowShortcutSettings] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showBookmarkPanel, setShowBookmarkPanel] = useState(false);
  const [showThemeEditor, setShowThemeEditor] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showCollaboration, setShowCollaboration] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const fileName = currentPath ? currentPath.split('/').pop() : 'Untitled';
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // File operations
  const handleOpen = async () => {
    setActiveMenu(null);
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Markdown', extensions: ['md', 'txt'] }],
      });
      if (selected) {
        const content = await invoke<string>('read_file', { path: selected });
        editorInstance?.commands.setContent(content);
        setCurrentPath(selected as string);
        setSavedContent(content);
      }
    } catch (err) {
      console.error('Open failed:', err);
    }
  };
  
  const handleSave = async () => {
    setActiveMenu(null);
    const content = editorInstance?.getText() || '';
    if (currentPath) {
      try {
        await invoke('save_file', { path: currentPath, content });
        setSavedContent(content);
      } catch (err) {
        console.error('Save failed:', err);
      }
    } else {
      handleSaveAs();
    }
  };
  
  const handleSaveAs = async () => {
    setActiveMenu(null);
    const content = editorInstance?.getText() || '';
    try {
      const path = await save({
        filters: [{ name: 'Markdown', extensions: ['md'] }],
        defaultPath: 'Untitled.md',
      });
      if (path) {
        await invoke('save_file', { path, content });
        setCurrentPath(path);
        setSavedContent(content);
      }
    } catch (err) {
      console.error('Save As failed:', err);
    }
  };
  
  const handleExportPDF = async () => {
    setActiveMenu(null);
    if (!editorInstance) return;
    
    const html = editorInstance.getHTML();
    try {
      const path = await save({
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
        defaultPath: `${fileName}.pdf`,
      });
      if (path) {
        await invoke('export_to_pdf', { html, outputPath: path });
      }
    } catch (err) {
      console.error('Export PDF failed:', err);
    }
  };
  
  const handleExportWord = async () => {
    setActiveMenu(null);
    if (!editorInstance) return;
    
    const markdown = (editorInstance.storage as any)?.markdown?.getMarkdown?.() || editorInstance.getText();
    try {
      const path = await save({
        filters: [{ name: 'Word', extensions: ['docx'] }],
        defaultPath: `${fileName}.docx`,
      });
      if (path) {
        await invoke('export_to_word', { markdown, outputPath: path });
      }
    } catch (err) {
      console.error('Export Word failed:', err);
    }
  };
  
  const handleExportHTML = async () => {
    setActiveMenu(null);
    if (!editorInstance) return;
    
    const html = editorInstance.getHTML();
    try {
      const path = await save({
        filters: [{ name: 'HTML', extensions: ['html'] }],
        defaultPath: `${fileName}.html`,
      });
      if (path) {
        const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${fileName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; line-height: 1.6; }
    pre { background: #f4f4f4; padding: 16px; border-radius: 8px; overflow-x: auto; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 4px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; }
    img { max-width: 100%; }
  </style>
</head>
<body>
${html}
</body>
</html>`;
        await invoke('save_file', { path, content: fullHtml });
      }
    } catch (err) {
      console.error('Export HTML failed:', err);
    }
  };
  
  const handleExportEPUB = async () => {
    setActiveMenu(null);
    if (!editorInstance) return;
    
    const markdown = (editorInstance.storage as any)?.markdown?.getMarkdown?.() || editorInstance.getText();
    try {
      const path = await save({
        filters: [{ name: 'EPUB', extensions: ['epub'] }],
        defaultPath: `${fileName}.epub`,
      });
      if (path) {
        await invoke('export_to_epub', { markdown, outputPath: path, title: fileName || 'Untitled' });
      }
    } catch (err) {
      console.error('Export EPUB failed:', err);
    }
  };
  
  // Edit operations
  const handleUndo = () => {
    setActiveMenu(null);
    editorInstance?.commands.undo();
  };
  
  const handleRedo = () => {
    setActiveMenu(null);
    editorInstance?.commands.redo();
  };
  
  const handleCut = async () => {
    setActiveMenu(null);
    try {
      await navigator.clipboard.writeText(editorInstance?.getText() || '');
      editorInstance?.commands.clearContent();
    } catch (err) {
      console.error('Cut failed:', err);
    }
  };
  
  const handleCopy = async () => {
    setActiveMenu(null);
    try {
      await navigator.clipboard.writeText(editorInstance?.getText() || '');
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };
  
  const handlePaste = async () => {
    setActiveMenu(null);
    try {
      const text = await navigator.clipboard.readText();
      editorInstance?.commands.insertContent(text);
    } catch (err) {
      console.error('Paste failed:', err);
    }
  };
  
  // View operations
  const handleToggleSidebar = () => {
    setActiveMenu(null);
    toggleSidebar();
  };
  
  const handleFocusMode = () => {
    setActiveMenu(null);
    toggleFocusMode();
  };
  
  const handleTypewriterMode = () => {
    setActiveMenu(null);
    toggleTypewriterMode();
  };
  
  return (
    <div className="typora-titlebar" ref={menuRef}>
      <div className="typora-titlebar-controls">
        {/* File Menu */}
        <div 
          className="typora-titlebar-menu-wrapper"
          onMouseEnter={() => setActiveMenu('file')}
          onMouseLeave={() => setActiveMenu(null)}
        >
          <span className={`typora-titlebar-menu ${activeMenu === 'file' ? 'active' : ''}`}>
            File
          </span>
          {activeMenu === 'file' && (
            <div className="dropdown-menu">
              <div className="menu-item" onClick={handleOpen}>
                <span>Open...</span>
                <span className="shortcut">⌘O</span>
              </div>
              <div className="menu-item" onClick={() => { setActiveMenu(null); setShowTemplateSelector(true); }}>
                <span>New from Template...</span>
              </div>
              <div className="menu-item" onClick={handleSave}>
                <span>Save</span>
                <span className="shortcut">⌘S</span>
              </div>
              <div className="menu-item" onClick={handleSaveAs}>
                <span>Save As...</span>
                <span className="shortcut">⌘⇧S</span>
              </div>
              <div className="menu-divider" />
              <div className="menu-item" onClick={handleExportPDF}>
                <span>Export PDF</span>
              </div>
              <div className="menu-item" onClick={handleExportWord}>
                <span>Export Word</span>
              </div>
              <div className="menu-item" onClick={handleExportHTML}>
                <span>Export HTML</span>
              </div>
              <div className="menu-item" onClick={handleExportEPUB}>
                <span>Export EPUB</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Edit Menu */}
        <div 
          className="typora-titlebar-menu-wrapper"
          onMouseEnter={() => setActiveMenu('edit')}
          onMouseLeave={() => setActiveMenu(null)}
        >
          <span className={`typora-titlebar-menu ${activeMenu === 'edit' ? 'active' : ''}`}>
            Edit
          </span>
          {activeMenu === 'edit' && (
            <div className="dropdown-menu">
              <div className="menu-item" onClick={handleUndo}>
                <span>Undo</span>
                <span className="shortcut">⌘Z</span>
              </div>
              <div className="menu-item" onClick={handleRedo}>
                <span>Redo</span>
                <span className="shortcut">⌘⇧Z</span>
              </div>
              <div className="menu-divider" />
              <div className="menu-item" onClick={handleCut}>
                <span>Cut</span>
                <span className="shortcut">⌘X</span>
              </div>
              <div className="menu-item" onClick={handleCopy}>
                <span>Copy</span>
                <span className="shortcut">⌘C</span>
              </div>
              <div className="menu-item" onClick={handlePaste}>
                <span>Paste</span>
                <span className="shortcut">⌘V</span>
              </div>
            </div>
          )}
        </div>
        
        {/* View Menu */}
        <div 
          className="typora-titlebar-menu-wrapper"
          onMouseEnter={() => setActiveMenu('view')}
          onMouseLeave={() => setActiveMenu(null)}
        >
          <span className={`typora-titlebar-menu ${activeMenu === 'view' ? 'active' : ''}`}>
            View
          </span>
          {activeMenu === 'view' && (
            <div className="dropdown-menu">
              <div className="menu-item" onClick={handleToggleSidebar}>
                <span>{sidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}</span>
                <span className="shortcut">⌘\</span>
              </div>
              <div className="menu-divider" />
              <div className="menu-item" onClick={handleFocusMode}>
                <span>{focusMode ? '✓ Focus Mode' : 'Focus Mode'}</span>
                <span className="shortcut">⌘⇧F</span>
              </div>
              <div className="menu-item" onClick={handleTypewriterMode}>
                <span>{typewriterMode ? '✓ Typewriter Mode' : 'Typewriter Mode'}</span>
                <span className="shortcut">⌘⇧T</span>
              </div>
              <div className="menu-divider" />
              <div className="menu-item" onClick={() => { setActiveMenu(null); toggleSourceMode(); }}>
                <span>{sourceMode ? '✓ Source Mode' : 'Source Mode'}</span>
                <span className="shortcut">⌘/</span>
              </div>
              <div className="menu-divider" />
              <div className="menu-item" onClick={() => { setActiveMenu(null); setShowShortcutSettings(true); }}>
                <span>Keyboard Shortcuts...</span>
                <span className="shortcut">⌘⇧K</span>
              </div>
              <div className="menu-divider" />
              <div className="menu-item" onClick={() => { setActiveMenu(null); toggleWordGoal(); }}>
                <span>{wordGoalEnabled ? '✓ Word Goal' : 'Word Goal'}</span>
              </div>
              <div className="menu-item" onClick={() => { setActiveMenu(null); togglePomodoro(); }}>
                <span>{pomodoroEnabled ? '✓ Pomodoro Timer' : 'Pomodoro Timer'}</span>
              </div>
              <div className="menu-divider" />
              <div className="menu-item" onClick={() => { setActiveMenu(null); setShowThemeEditor(true); }}>
                <span>Theme Editor...</span>
              </div>
              <div className="menu-divider" />
              <div className="menu-item" onClick={() => { setActiveMenu(null); setShowBookmarkPanel(true); }}>
                <span>Bookmarks...</span>
              </div>
              <div className="menu-divider" />
              <div className="menu-item" onClick={() => { setActiveMenu(null); setShowVersionHistory(true); }}>
                <span>Version History...</span>
              </div>
              <div className="menu-divider" />
              <div className="menu-item" onClick={() => { setActiveMenu(null); setShowCollaboration(true); }}>
                <span>Collaboration...</span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="typora-titlebar-drag-region" />
      
      <span className="typora-titlebar-title">{fileName} - Markhere</span>
      
      <ShortcutSettings isOpen={showShortcutSettings} onClose={() => setShowShortcutSettings(false)} />
      <TemplateSelector isOpen={showTemplateSelector} onClose={() => setShowTemplateSelector(false)} />
      <BookmarkPanel isOpen={showBookmarkPanel} onClose={() => setShowBookmarkPanel(false)} />
      <ThemeEditor isOpen={showThemeEditor} onClose={() => setShowThemeEditor(false)} />
      <VersionHistory isOpen={showVersionHistory} onClose={() => setShowVersionHistory(false)} />
      <CollaborationPanel isOpen={showCollaboration} onClose={() => setShowCollaboration(false)} />
    </div>
  );
}