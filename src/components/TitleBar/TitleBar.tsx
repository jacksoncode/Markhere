import { useState, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { listen } from '@tauri-apps/api/event';
import { useFileStore } from '../../store/fileStore';
import { useEditorState } from '../../store/editorStore';
import { useUIState } from '../../store/uiStore';
import { useTabsStore } from '../../store/tabsStore';
import { useAutoSaveStore } from '../../store/autoSaveStore';
import { useThemeStore } from '../../store/themeStore';
import { themes } from '../../store/themes';
import { useTranslation } from '../../i18n';
import { useNotificationStore } from '../Notification/Notification';
import { ShortcutSettings } from '../ShortcutSettings';
import { TemplateSelector } from '../TemplateSelector';
import { BookmarkPanel } from '../BookmarkPanel';
import { ThemeEditor } from '../ThemeEditor';
import { VersionHistory } from '../VersionHistory';
import { CollaborationPanel } from '../Collaboration';
import { Settings } from '../Settings/Settings';
import { SearchPanel } from '../Search/SearchPanel';
import './TitleBar.css';

interface TitleBarProps {
  onCheckUpdates?: () => void;
}

export function TitleBar({ onCheckUpdates }: TitleBarProps) {
  const { t } = useTranslation();
  const { currentPath, setCurrentPath, setSavedContent } = useFileStore();
  const { editorInstance } = useEditorState();
  const { 
    sidebarOpen, sidebarMode, toggleSidebar, setSidebarMode,
    focusMode, toggleFocusMode, 
    typewriterMode, toggleTypewriterMode, 
    sourceMode, toggleSourceMode, 
    pomodoroEnabled, togglePomodoro, 
    wordGoalEnabled, toggleWordGoal 
  } = useUIState();
  const notify = useNotificationStore((s) => s.notify);
  const { currentTheme, setTheme } = useThemeStore();

  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showShortcutSettings, setShowShortcutSettings] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showBookmarkPanel, setShowBookmarkPanel] = useState(false);
  const [showThemeEditor, setShowThemeEditor] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showCollaboration, setShowCollaboration] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [recentFiles, setRecentFiles] = useState<string[]>([]);
  const [showAboutDialog, setShowAboutDialog] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const fileName = currentPath ? currentPath.split('/').pop() : 'Untitled';
  
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const menuHandlerRef = useRef<((menuId: string) => void) | null>(null);

  menuHandlerRef.current = (menuId: string) => {
    try {
      switch (menuId) {
        case 'new':
          handleNewFile();
          break;
        case 'open':
          handleOpen();
          break;
        case 'save':
          handleSave();
          break;
        case 'save_as':
          handleSaveAs();
          break;
        case 'toggle_sidebar':
          toggleSidebar();
          break;
        case 'focus_mode':
          toggleFocusMode();
          break;
        case 'docs':
          window.open('https://github.com/jacksoncode/Markhere#readme', '_blank');
          break;
        case 'updates':
          window.open('https://github.com/jacksoncode/Markhere/releases', '_blank');
          break;
        case 'about':
          setActiveMenu(null);
          setShowAboutDialog(true);
          break;
      }
    } catch (error) {
      console.error('Menu event handling failed:', error);
      notify('error', 'A menu action failed');
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('markhere-recent-files');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Validate: must be an array of strings (not objects)
        if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
          setRecentFiles(parsed);
        } else {
          // Data format is wrong (might be object array from old version)
          // Clear invalid data
          console.warn('Invalid recent files format, clearing data');
          localStorage.removeItem('markhere-recent-files');
          setRecentFiles([]);
        }
      } catch { /* ignore corrupt data */ }
    }

    let unlisten: (() => void) | undefined;

    listen<string>('menu-event', (event) => {
      menuHandlerRef.current?.(event.payload);
    }).then((fn) => {
      unlisten = fn;
    }).catch((error) => {
      console.error('Failed to listen to menu events:', error);
    });

    return () => {
      unlisten?.();
    };
  }, []);
  
  const addToRecentFiles = (path: string) => {
    const updated = [path, ...recentFiles.filter(f => f !== path)].slice(0, 10);
    setRecentFiles(updated);
    localStorage.setItem('markhere-recent-files', JSON.stringify(updated));
  };
  
  const handleNewFile = () => {
    setActiveMenu(null);
    editorInstance?.commands.clearContent();
    setCurrentPath(null);
    setSavedContent('');
  };
  
  const handleReopenClosedTab = () => {
    setActiveMenu(null);
    const { reopenClosedTab } = useTabsStore.getState();
    reopenClosedTab();
  };
  
  const handleOpen = async () => {
    setActiveMenu(null);
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Markdown', extensions: ['md', 'txt', 'markdown'] }],
      });
      if (selected) {
        const content = await invoke<string>('read_file', { path: selected });
        const fileName = (selected as string).split('/').pop() || 'Untitled';
        // Open as new tab instead of replacing current
        useTabsStore.getState().openTab(selected as string, fileName, content);
        // setContent may throw NodeViewWrapper for content with rich nodes
        try { editorInstance?.commands.setContent(content); }
        catch (nvErr) { console.warn('setContent NodeView (non-fatal):', nvErr); }
        setCurrentPath(selected as string);
        setSavedContent(content);
        addToRecentFiles(selected as string);
      }
    } catch (err) {
      console.error('Open failed:', err);
      notify('error', 'Failed to open file');
    }
  };

  const handleOpenRecent = async (path: string) => {
    setActiveMenu(null);
    try {
      const content = await invoke<string>('read_file', { path });
      const fileName = path.split('/').pop() || 'Untitled';
      useTabsStore.getState().openTab(path, fileName, content);
      // setContent may throw NodeViewWrapper for content with rich nodes
      try { editorInstance?.commands.setContent(content); }
      catch (nvErr) { console.warn('setContent NodeView (non-fatal):', nvErr); }
      setCurrentPath(path);
      setSavedContent(content);
      addToRecentFiles(path);
    } catch (err) {
      console.error('Open recent failed:', err);
      notify('error', 'Failed to open recent file');
      const updated = recentFiles.filter(f => f !== path);
      setRecentFiles(updated);
      localStorage.setItem('markhere-recent-files', JSON.stringify(updated));
    }
  };
  
  const handleClearRecent = () => {
    setActiveMenu(null);
    setRecentFiles([]);
    localStorage.removeItem('markhere-recent-files');
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
        notify('error', 'Failed to save file');
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
        addToRecentFiles(path);
      }
    } catch (err) {
      console.error('Save As failed:', err);
        notify('error', 'Failed to save file');
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
        notify('error', 'Failed to export PDF');
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
        notify('error', 'Failed to export Word document');
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
        notify('error', 'Failed to export HTML');
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
        notify('error', 'Failed to export EPUB');
    }
  };
  
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
      notify('error', 'Failed to cut content');
    }
  };
  
  const handleCopy = async () => {
    setActiveMenu(null);
    try {
      await navigator.clipboard.writeText(editorInstance?.getText() || '');
    } catch (err) {
      console.error('Copy failed:', err);
      notify('error', 'Failed to copy content');
    }
  };
  
  const handleCopyAsMarkdown = async () => {
    setActiveMenu(null);
    try {
      const markdown = (editorInstance?.storage as any)?.markdown?.getMarkdown?.() || editorInstance?.getText() || '';
      await navigator.clipboard.writeText(markdown);
    } catch (err) {
      console.error('Copy as Markdown failed:', err);
      notify('error', 'Failed to copy as Markdown');
    }
  };
  
  const handleCopyAsHTML = async () => {
    setActiveMenu(null);
    try {
      const html = editorInstance?.getHTML() || '';
      await navigator.clipboard.writeText(html);
    } catch (err) {
      console.error('Copy as HTML failed:', err);
      notify('error', 'Failed to copy as HTML');
    }
  };
  
  const handlePaste = async () => {
    setActiveMenu(null);
    try {
      const text = await navigator.clipboard.readText();
      editorInstance?.commands.insertContent(text);
    } catch (err) {
      console.error('Paste failed:', err);
      notify('error', 'Failed to paste content');
    }
  };
  
  const handleSelectAll = () => {
    setActiveMenu(null);
    editorInstance?.commands.selectAll();
  };
  
  const handleSelectLine = () => {
    setActiveMenu(null);
    const { from } = editorInstance?.state.selection || { from: 0 };
    const doc = editorInstance?.state.doc;
    if (!doc) return;
    
    const $pos = doc.resolve(from);
    const start = $pos.before($pos.depth);
    const end = $pos.after($pos.depth);
    editorInstance?.commands.setTextSelection({ from: start, to: end });
  };
  
  const handleSelectWord = () => {
    setActiveMenu(null);
    const { from } = editorInstance?.state.selection || { from: 0 };
    const doc = editorInstance?.state.doc;
    if (!doc) return;
    
    const $pos = doc.resolve(from);
    const node = $pos.nodeBefore || $pos.nodeAfter;
    if (node && node.isText) {
      const start = $pos.before();
      const end = $pos.after();
      editorInstance?.commands.setTextSelection({ from: start, to: end });
    }
  };
  
  const handleFind = () => {
    setActiveMenu(null);
    setShowSearchPanel(true);
  };
  
  const handleReplace = () => {
    setActiveMenu(null);
    setShowSearchPanel(true);
  };
  
  const handleHeading = (level: 1 | 2 | 3 | 4 | 5 | 6) => {
    setActiveMenu(null);
    editorInstance?.chain().focus().toggleHeading({ level }).run();
  };
  
  const handleNormalText = () => {
    setActiveMenu(null);
    editorInstance?.chain().focus().setParagraph().run();
  };
  
  const handleBulletList = () => {
    setActiveMenu(null);
    editorInstance?.chain().focus().toggleBulletList().run();
  };
  
  const handleOrderedList = () => {
    setActiveMenu(null);
    editorInstance?.chain().focus().toggleOrderedList().run();
  };
  
  const handleTaskList = () => {
    setActiveMenu(null);
    editorInstance?.chain().focus().toggleTaskList().run();
  };
  
  const handleCodeBlock = () => {
    setActiveMenu(null);
    editorInstance?.chain().focus().toggleCodeBlock().run();
  };
  
  const handleQuoteBlock = () => {
    setActiveMenu(null);
    editorInstance?.chain().focus().toggleBlockquote().run();
  };
  
  const handleInsertTable = () => {
    setActiveMenu(null);
    editorInstance?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };
  
  const handleMathBlock = () => {
    setActiveMenu(null);
    editorInstance?.chain().focus().insertContent('$$\n\n$$').run();
  };
  
  const handleIndent = () => {
    setActiveMenu(null);
    editorInstance?.chain().focus().sinkListItem('listItem').run();
  };
  
  const handleOutdent = () => {
    setActiveMenu(null);
    editorInstance?.chain().focus().liftListItem('listItem').run();
  };
  
  const handleBold = () => {
    setActiveMenu(null);
    editorInstance?.chain().focus().toggleBold().run();
  };
  
  const handleItalic = () => {
    setActiveMenu(null);
    editorInstance?.chain().focus().toggleItalic().run();
  };
  
  const handleUnderline = () => {
    setActiveMenu(null);
    editorInstance?.chain().focus().toggleUnderline().run();
  };
  
  const handleStrikethrough = () => {
    setActiveMenu(null);
    editorInstance?.chain().focus().toggleStrike().run();
  };
  
  const handleHighlight = () => {
    setActiveMenu(null);
    editorInstance?.chain().focus().toggleHighlight().run();
  };
  
  const handleInlineCode = () => {
    setActiveMenu(null);
    editorInstance?.chain().focus().toggleCode().run();
  };
  
  const handleInlineMath = () => {
    setActiveMenu(null);
    editorInstance?.chain().focus().insertContent('$ $').run();
  };
  
  const handleInsertLink = async () => {
    setActiveMenu(null);
    const url = await promptForURL();
    if (url) {
      editorInstance?.chain().focus().setLink({ href: url }).run();
    }
  };
  
  const handleInsertImage = async () => {
    setActiveMenu(null);
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Image', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'] }],
      });
      if (selected) {
        editorInstance?.chain().focus().setImage({ src: selected as string }).run();
      }
    } catch (err) {
      console.error('Insert image failed:', err);
        notify('error', 'Failed to insert image');
    }
  };
  
  const handleClearFormat = () => {
    setActiveMenu(null);
    editorInstance?.chain().focus()
      .unsetBold()
      .unsetItalic()
      .unsetUnderline()
      .unsetStrike()
      .unsetHighlight()
      .unsetCode()
      .unsetLink()
      .setParagraph()
      .run();
  };

  const handlePasteAsPlainText = async () => {
    setActiveMenu(null);
    try {
      const text = await navigator.clipboard.readText();
      editorInstance?.chain().focus().insertContent(text).run();
    } catch (err) {
      console.error('Paste as plain text failed:', err);
      notify('error', 'Failed to paste content');
    }
  };

  const handleCloseWindow = async () => {
    setActiveMenu(null);
    try {
      // Check for unsaved changes
      const { hasUnsavedChanges } = useAutoSaveStore.getState();
      const text = editorInstance?.getText() || '';
      if (hasUnsavedChanges && text.trim().length > 0) {
        // Delegate to App.tsx dialog flow
        window.dispatchEvent(new CustomEvent('markhere:close-requested'));
        return;
      }
      // No unsaved changes — close directly via Tauri API
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().close();
    } catch (err) {
      console.error('Close window failed:', err);
      // Fallback: dispatch event to App.tsx
      try {
        window.dispatchEvent(new CustomEvent('markhere:close-requested'));
      } catch { /* last resort failed */ }
    }
  };

  const handleIncreaseHeading = () => {
    setActiveMenu(null);
    let currentLevel = 0;
    for (let i = 1; i <= 6; i++) {
      if (editorInstance?.isActive('heading', { level: i })) {
        currentLevel = i;
        break;
      }
    }
    const newLevel = currentLevel === 0 ? 6 : currentLevel === 1 ? 1 : currentLevel - 1;
    editorInstance?.chain().focus().toggleHeading({ level: newLevel as 1|2|3|4|5|6 }).run();
  };

  const handleDecreaseHeading = () => {
    setActiveMenu(null);
    let currentLevel = 0;
    for (let i = 1; i <= 6; i++) {
      if (editorInstance?.isActive('heading', { level: i })) {
        currentLevel = i;
        break;
      }
    }
    if (currentLevel === 0 || currentLevel === 6) {
      editorInstance?.chain().focus().setParagraph().run();
    } else {
      editorInstance?.chain().focus().toggleHeading({ level: (currentLevel + 1) as 1|2|3|4|5|6 }).run();
    }
  };

  const handleJumpToTop = () => {
    setActiveMenu(null);
    editorInstance?.chain().focus().setTextSelection({ from: 0, to: 0 }).run();
  };

  const handleJumpToSelection = () => {
    setActiveMenu(null);
    const { from, to } = editorInstance?.state.selection || { from: 0, to: 0 };
    if (from !== to) {
      editorInstance?.commands.scrollIntoView();
    } else {
      handleSelectLine();
    }
  };

  const handleJumpToBottom = () => {
    setActiveMenu(null);
    const docSize = editorInstance?.state.doc.content.size || 0;
    editorInstance?.chain().focus().setTextSelection({ from: docSize, to: docSize }).run();
  };

  const handleHorizontalRule = () => {
    setActiveMenu(null);
    editorInstance?.chain().focus().insertContent('\n---\n').run();
  };

  const handleYamlFrontMatter = () => {
    setActiveMenu(null);
    const yamlTemplate = `---
title: 
author: 
date: ${new Date().toISOString().split('T')[0]}
tags: []
---

`;
    editorInstance?.chain().focus().insertContentAt(0, yamlTemplate).run();
  };

  const handleFootnote = () => {
    setActiveMenu(null);
    const footnoteId = `fn-${Date.now()}`;
    editorInstance?.chain().focus().insertContent(`[^${footnoteId}]`).run();
  };

  const handleDeleteWord = () => {
    setActiveMenu(null);
    const { from } = editorInstance?.state.selection || { from: 0 };
    const doc = editorInstance?.state.doc;
    if (!doc) return;
    
    const $pos = doc.resolve(from);
    const textNode = $pos.nodeBefore || $pos.nodeAfter;
    if (textNode && textNode.isText) {
      const start = from - (textNode.text?.length || 0);
      editorInstance?.chain().focus().deleteRange({ from: start, to: from }).run();
    }
  };

  const handleDeleteLine = () => {
    setActiveMenu(null);
    const { from } = editorInstance?.state.selection || { from: 0 };
    const doc = editorInstance?.state.doc;
    if (!doc) return;
    
    const $pos = doc.resolve(from);
    const depth = $pos.depth;
    const start = $pos.before(depth);
    const end = $pos.after(depth);
    editorInstance?.chain().focus().deleteRange({ from: start, to: end }).run();
  };

  const handleSelectStyleScope = () => {
    setActiveMenu(null);
    const { from } = editorInstance?.state.selection || { from: 0 };
    const doc = editorInstance?.state.doc;
    if (!doc) return;
    
    const $pos = doc.resolve(from);
    const marks = $pos.marks();
    
    if (marks.length > 0) {
      let startPos = from;
      let endPos = from;
      
      for (let i = from - 1; i >= 0; i--) {
        const $posBack = doc.resolve(i);
        const backMarks = $posBack.marks();
        if (backMarks.some(m => marks.some(m2 => m2.eq(m)))) {
          startPos = i;
        } else {
          break;
        }
      }
      
      for (let i = from + 1; i <= doc.content.size; i++) {
        const $posForward = doc.resolve(i);
        const forwardMarks = $posForward.marks();
        if (forwardMarks.some(m => marks.some(m2 => m2.eq(m)))) {
          endPos = i;
        } else {
          break;
        }
      }
      
      editorInstance?.chain().focus().setTextSelection({ from: startPos, to: endPos }).run();
    } else {
      handleSelectLine();
    }
  };

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
  
  const handleZoomIn = () => {
    setActiveMenu(null);
    const newZoom = Math.min(zoomLevel + 10, 200);
    setZoomLevel(newZoom);
    document.documentElement.style.fontSize = `${newZoom}%`;
  };
  
  const handleZoomOut = () => {
    setActiveMenu(null);
    const newZoom = Math.max(zoomLevel - 10, 50);
    setZoomLevel(newZoom);
    document.documentElement.style.fontSize = `${newZoom}%`;
  };
  
  const handleResetZoom = () => {
    setActiveMenu(null);
    setZoomLevel(100);
    document.documentElement.style.fontSize = '100%';
  };
  
  const handleFullScreen = async () => {
    setActiveMenu(null);
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const win = getCurrentWindow();
      const isFullscreen = await win.isFullscreen();
      await win.setFullscreen(!isFullscreen);
    } catch (err) {
      console.error('Fullscreen failed:', err);
      notify('error', 'Failed to toggle fullscreen');
    }
  };
  
  const handleOpenDocs = () => {
    setActiveMenu(null);
    window.open('https://github.com/jacksoncode/Markhere#readme', '_blank');
  };
  
  const handleMarkdownReference = () => {
    setActiveMenu(null);
    window.open('https://www.markdownguide.org/basic-syntax/', '_blank');
  };
  
  const handleCheckUpdates = () => {
    setActiveMenu(null);
    onCheckUpdates?.();
  };
  
  const handleReportIssue = () => {
    setActiveMenu(null);
    window.open('https://github.com/jacksoncode/Markhere/issues', '_blank');
  };
  
  const promptForURL = async (): Promise<string | null> => {
    const url = prompt('Enter URL:');
    return url || null;
  };
  
  const isHeadingActive = (level: number) => editorInstance?.isActive('heading', { level }) ?? false;
  const isBoldActive = editorInstance?.isActive('bold') ?? false;
  const isItalicActive = editorInstance?.isActive('italic') ?? false;
  const isBulletListActive = editorInstance?.isActive('bulletList') ?? false;
  const isOrderedListActive = editorInstance?.isActive('orderedList') ?? false;
  const isCodeBlockActive = editorInstance?.isActive('codeBlock') ?? false;
  const isQuoteBlockActive = editorInstance?.isActive('blockquote') ?? false;
  
  return (
    <div className="typora-titlebar" ref={menuRef}>
      <div className="typora-titlebar-drag-region" data-tauri-drag-region />
      <div className="typora-titlebar-controls">
        <div className="typora-titlebar-menu-wrapper"
          onClick={() => setActiveMenu(activeMenu === 'file' ? null : 'file')}
        >
          <span className={`typora-titlebar-menu ${activeMenu === 'file' ? 'active' : ''}`}>
            {t('menu.file')}
          </span>
          {activeMenu === 'file' && (
            <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
              <div className="menu-item" onClick={handleNewFile}>
                <span>{t('file.new')}</span>
                <span className="shortcut">{t('shortcuts.ctrlN')}</span>
              </div>
              <div className="menu-item" onClick={handleOpen}>
                <span>{t('file.open')}</span>
                <span className="shortcut">{t('shortcuts.ctrlO')}</span>
              </div>
              
              {recentFiles.length > 0 && (
                <div className="menu-item submenu-trigger">
                  <span>{t('file.openRecent')}</span>
                  <div className="submenu">
                    {recentFiles.map((file, idx) => (
                      <div 
                        key={idx} 
                        className="menu-item" 
                        onClick={() => handleOpenRecent(file)}
                      >
                        <span>{file.split('/').pop()}</span>
                      </div>
                    ))}
                    <div className="menu-divider" />
                    <div className="menu-item" onClick={handleClearRecent}>
                      <span>{t('file.clearRecent')}</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="menu-item" onClick={handleReopenClosedTab}>
                <span>{t('file.reopenClosed')}</span>
                <span className="shortcut">{t('shortcuts.ctrlShiftT')}</span>
              </div>
              
              <div className="menu-item" onClick={() => { setActiveMenu(null); setShowTemplateSelector(true); }}>
                <span>{t('file.newFromTemplate')}</span>
              </div>
              <div className="menu-divider" />
              <div className="menu-item" onClick={handleSave}>
                <span>{t('file.save')}</span>
                <span className="shortcut">{t('shortcuts.ctrlS')}</span>
              </div>
              <div className="menu-item" onClick={handleSaveAs}>
                <span>{t('file.saveAs')}</span>
                <span className="shortcut">{t('shortcuts.ctrlShiftS')}</span>
              </div>
              <div className="menu-divider" />
              <div className="menu-item" onClick={handleExportPDF}>
                <span>{t('file.exportPdf')}</span>
              </div>
              <div className="menu-item" onClick={handleExportWord}>
                <span>{t('file.exportWord')}</span>
              </div>
              <div className="menu-item" onClick={handleExportHTML}>
                <span>{t('file.exportHtml')}</span>
              </div>
              <div className="menu-item" onClick={handleExportEPUB}>
                <span>{t('file.exportEpub')}</span>
              </div>
              <div className="menu-divider" />
              <div className="menu-item" onClick={() => { setActiveMenu(null); setShowSettings(true); }}>
                <span>{t('settings.title')}</span>
              </div>
              <div className="menu-divider" />
              <div className="menu-item" onClick={handleCloseWindow}>
                <span>{t('file.closeWindow')}</span>
                <span className="shortcut">{t('shortcuts.ctrlW')}</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="typora-titlebar-menu-wrapper"
          onClick={() => setActiveMenu(activeMenu === 'edit' ? null : 'edit')}
        >
          <span className={`typora-titlebar-menu ${activeMenu === 'edit' ? 'active' : ''}`}>
            {t('menu.edit')}
          </span>
          {activeMenu === 'edit' && (
            <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
              <div className="menu-item" onClick={handleUndo}>
                <span>{t('edit.undo')}</span>
                <span className="shortcut">{t('shortcuts.ctrlZ')}</span>
              </div>
              <div className="menu-item" onClick={handleRedo}>
                <span>{t('edit.redo')}</span>
                <span className="shortcut">{t('shortcuts.ctrlShiftZ')}</span>
              </div>
              <div className="menu-divider" />
              <div className="menu-item" onClick={handleCut}>
                <span>{t('edit.cut')}</span>
                <span className="shortcut">{t('shortcuts.ctrlX')}</span>
              </div>
              <div className="menu-item" onClick={handleCopy}>
                <span>{t('edit.copy')}</span>
                <span className="shortcut">{t('shortcuts.ctrlC')}</span>
              </div>
              <div className="menu-item submenu-trigger">
                <span>{t('edit.copyAsMarkdown')}</span>
                <div className="submenu">
                  <div className="menu-item" onClick={handleCopyAsMarkdown}>
                    <span>{t('edit.copyAsMarkdown')}</span>
                  </div>
                  <div className="menu-item" onClick={handleCopyAsHTML}>
                    <span>{t('edit.copyAsHtml')}</span>
                  </div>
                </div>
              </div>
              <div className="menu-item" onClick={handlePaste}>
                <span>{t('edit.paste')}</span>
                <span className="shortcut">{t('shortcuts.ctrlV')}</span>
              </div>
              <div className="menu-item" onClick={handlePasteAsPlainText}>
                <span>{t('edit.pasteAsPlainText')}</span>
                <span className="shortcut">{t('shortcuts.ctrlShiftV')}</span>
              </div>
              <div className="menu-divider" />
              <div className="menu-item" onClick={handleSelectAll}>
                <span>{t('edit.selectAll')}</span>
                <span className="shortcut">{t('shortcuts.ctrlA')}</span>
              </div>
              <div className="menu-item" onClick={handleSelectLine}>
                <span>{t('edit.selectLine')}</span>
                <span className="shortcut">{t('shortcuts.ctrlL')}</span>
              </div>
              <div className="menu-item" onClick={handleSelectWord}>
                <span>{t('edit.selectWord')}</span>
                <span className="shortcut">{t('shortcuts.ctrlD')}</span>
              </div>
              <div className="menu-item" onClick={handleSelectStyleScope}>
                <span>{t('edit.selectStyleScope')}</span>
                <span className="shortcut">{t('shortcuts.ctrlE')}</span>
              </div>
              <div className="menu-divider" />
              <div className="menu-item" onClick={handleDeleteWord}>
                <span>{t('edit.deleteWord')}</span>
                <span className="shortcut">{t('shortcuts.ctrlShiftD')}</span>
              </div>
              <div className="menu-item" onClick={handleDeleteLine}>
                <span>{t('edit.deleteLine')}</span>
              </div>
              <div className="menu-divider" />
              <div className="menu-item" onClick={handleJumpToTop}>
                <span>{t('edit.jumpToTop')}</span>
                <span className="shortcut">{t('shortcuts.ctrlHome')}</span>
              </div>
              <div className="menu-item" onClick={handleJumpToSelection}>
                <span>{t('edit.jumpToSelection')}</span>
                <span className="shortcut">{t('shortcuts.ctrlJ')}</span>
              </div>
              <div className="menu-item" onClick={handleJumpToBottom}>
                <span>{t('edit.jumpToBottom')}</span>
                <span className="shortcut">{t('shortcuts.ctrlEnd')}</span>
              </div>
              <div className="menu-divider" />
              <div className="menu-item" onClick={handleFind}>
                <span>{t('edit.find')}</span>
                <span className="shortcut">{t('shortcuts.ctrlF')}</span>
              </div>
              <div className="menu-item" onClick={handleReplace}>
                <span>{t('edit.replace')}</span>
                <span className="shortcut">{t('shortcuts.ctrlH')}</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="typora-titlebar-menu-wrapper"
          onClick={() => setActiveMenu(activeMenu === 'paragraph' ? null : 'paragraph')}
        >
          <span className={`typora-titlebar-menu ${activeMenu === 'paragraph' ? 'active' : ''}`}>
            {t('menu.paragraph')}
          </span>
          {activeMenu === 'paragraph' && (
            <div className="dropdown-menu paragraph-menu" onClick={(e) => e.stopPropagation()}>
              <div className="menu-item" onClick={() => handleHeading(1)}>
                <span>{isHeadingActive(1) ? `✓ ${t('paragraph.heading1')}` : t('paragraph.heading1')}</span>
                <span className="shortcut">{t('shortcuts.ctrl1')}</span>
              </div>
              <div className="menu-item" onClick={() => handleHeading(2)}>
                <span>{isHeadingActive(2) ? `✓ ${t('paragraph.heading2')}` : t('paragraph.heading2')}</span>
                <span className="shortcut">{t('shortcuts.ctrl2')}</span>
              </div>
              <div className="menu-item" onClick={() => handleHeading(3)}>
                <span>{isHeadingActive(3) ? `✓ ${t('paragraph.heading3')}` : t('paragraph.heading3')}</span>
                <span className="shortcut">{t('shortcuts.ctrl3')}</span>
              </div>
              <div className="menu-item" onClick={() => handleHeading(4)}>
                <span>{isHeadingActive(4) ? `✓ ${t('paragraph.heading4')}` : t('paragraph.heading4')}</span>
                <span className="shortcut">{t('shortcuts.ctrl4')}</span>
              </div>
              <div className="menu-item" onClick={() => handleHeading(5)}>
                <span>{isHeadingActive(5) ? `✓ ${t('paragraph.heading5')}` : t('paragraph.heading5')}</span>
                <span className="shortcut">{t('shortcuts.ctrl5')}</span>
              </div>
              <div className="menu-item" onClick={() => handleHeading(6)}>
                <span>{isHeadingActive(6) ? `✓ ${t('paragraph.heading6')}` : t('paragraph.heading6')}</span>
                <span className="shortcut">{t('shortcuts.ctrl6')}</span>
              </div>
              <div className="menu-item" onClick={handleNormalText}>
                <span>{t('paragraph.normalText')}</span>
                <span className="shortcut">{t('shortcuts.ctrl0')}</span>
              </div>
              <div className="menu-divider" />
              <div className="menu-item" onClick={handleIncreaseHeading}>
                <span>{t('paragraph.increaseHeading')}</span>
                <span className="shortcut">{t('shortcuts.ctrlShiftUp')}</span>
              </div>
              <div className="menu-item" onClick={handleDecreaseHeading}>
                <span>{t('paragraph.decreaseHeading')}</span>
                <span className="shortcut">{t('shortcuts.ctrlShiftDown')}</span>
              </div>
              <div className="menu-divider" />
              
              <div className="menu-item" onClick={handleBulletList}>
                <span>{isBulletListActive ? `✓ ${t('paragraph.bulletList')}` : t('paragraph.bulletList')}</span>
              </div>
              <div className="menu-item" onClick={handleOrderedList}>
                <span>{isOrderedListActive ? `✓ ${t('paragraph.orderedList')}` : t('paragraph.orderedList')}</span>
              </div>
              <div className="menu-item" onClick={handleTaskList}>
                <span>{t('paragraph.taskList')}</span>
              </div>
              <div className="menu-divider" />
              
              <div className="menu-item" onClick={handleCodeBlock}>
                <span>{isCodeBlockActive ? `✓ ${t('paragraph.codeBlock')}` : t('paragraph.codeBlock')}</span>
                <span className="shortcut">{t('shortcuts.ctrlShiftM')}</span>
              </div>
              <div className="menu-item" onClick={handleQuoteBlock}>
                <span>{isQuoteBlockActive ? `✓ ${t('paragraph.quoteBlock')}` : t('paragraph.quoteBlock')}</span>
                <span className="shortcut">{t('shortcuts.ctrlQ')}</span>
              </div>
              <div className="menu-item" onClick={handleInsertTable}>
                <span>{t('paragraph.table')}</span>
                <span className="shortcut">{t('shortcuts.ctrlT')}</span>
              </div>
              <div className="menu-item" onClick={handleMathBlock}>
                <span>{t('paragraph.mathBlock')}</span>
              </div>
              <div className="menu-item" onClick={handleHorizontalRule}>
                <span>{t('paragraph.horizontalRule')}</span>
                <span className="shortcut">{t('shortcuts.ctrlShiftH')}</span>
              </div>
              <div className="menu-item" onClick={handleYamlFrontMatter}>
                <span>{t('paragraph.yamlFrontMatter')}</span>
              </div>
              <div className="menu-item" onClick={handleFootnote}>
                <span>{t('paragraph.footnote')}</span>
              </div>
              <div className="menu-divider" />
              
              <div className="menu-item" onClick={handleIndent}>
                <span>{t('paragraph.indent')}</span>
              </div>
              <div className="menu-item" onClick={handleOutdent}>
                <span>{t('paragraph.outdent')}</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="typora-titlebar-menu-wrapper"
          onClick={() => setActiveMenu(activeMenu === 'format' ? null : 'format')}
        >
          <span className={`typora-titlebar-menu ${activeMenu === 'format' ? 'active' : ''}`}>
            {t('menu.format')}
          </span>
          {activeMenu === 'format' && (
            <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
              <div className="menu-item" onClick={handleBold}>
                <span>{isBoldActive ? `✓ ${t('format.bold')}` : t('format.bold')}</span>
                <span className="shortcut">{t('shortcuts.ctrlB')}</span>
              </div>
              <div className="menu-item" onClick={handleItalic}>
                <span>{isItalicActive ? `✓ ${t('format.italic')}` : t('format.italic')}</span>
                <span className="shortcut">{t('shortcuts.ctrlI')}</span>
              </div>
              <div className="menu-item" onClick={handleUnderline}>
                <span>{t('format.underline')}</span>
                <span className="shortcut">{t('shortcuts.ctrlU')}</span>
              </div>
              <div className="menu-item" onClick={handleStrikethrough}>
                <span>{t('format.strikethrough')}</span>
              </div>
              <div className="menu-item" onClick={handleHighlight}>
                <span>{t('format.highlight')}</span>
                <span className="shortcut">{t('shortcuts.altShiftF')}</span>
              </div>
              <div className="menu-divider" />
              <div className="menu-item" onClick={handleInlineCode}>
                <span>{t('format.inlineCode')}</span>
                <span className="shortcut">{t('shortcuts.ctrlEqual')}</span>
              </div>
              <div className="menu-item" onClick={handleInlineMath}>
                <span>{t('format.inlineMath')}</span>
              </div>
              <div className="menu-divider" />
              <div className="menu-item" onClick={handleInsertLink}>
                <span>{t('format.link')}</span>
                <span className="shortcut">{t('shortcuts.ctrlK')}</span>
              </div>
              <div className="menu-item" onClick={handleInsertImage}>
                <span>{t('format.image')}</span>
                <span className="shortcut">{t('shortcuts.ctrlShiftI')}</span>
              </div>
              <div className="menu-divider" />
              <div className="menu-item" onClick={handleClearFormat}>
                <span>{t('format.clearFormat')}</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="typora-titlebar-menu-wrapper"
          onClick={() => setActiveMenu(activeMenu === 'view' ? null : 'view')}
        >
          <span className={`typora-titlebar-menu ${activeMenu === 'view' ? 'active' : ''}`}>
            {t('menu.view')}
          </span>
          {activeMenu === 'view' && (
            <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
              <div className="menu-item" onClick={handleToggleSidebar}>
                <span>{sidebarOpen ? t('view.hideSidebar') : t('view.showSidebar')}</span>
                <span className="shortcut">{t('shortcuts.ctrlB')}</span>
              </div>
              <div className="menu-item submenu-trigger">
                <span>{t('view.sidebarMode')}</span>
                <div className="submenu">
                  <div className="menu-item" onClick={() => { setActiveMenu(null); setSidebarMode('outline'); }}>
                    <span>{sidebarMode === 'outline' ? `✓ ${t('view.sidebarOutline')}` : t('view.sidebarOutline')}</span>
                  </div>
                  <div className="menu-item" onClick={() => { setActiveMenu(null); setSidebarMode('fileTree'); }}>
                    <span>{sidebarMode === 'fileTree' ? `✓ ${t('view.sidebarFileTree')}` : t('view.sidebarFileTree')}</span>
                  </div>
                  <div className="menu-item" onClick={() => { setActiveMenu(null); setSidebarMode('fileList'); }}>
                    <span>{sidebarMode === 'fileList' ? `✓ ${t('view.sidebarFileList')}` : t('view.sidebarFileList')}</span>
                  </div>
                </div>
              </div>
              <div className="menu-divider" />
              <div className="menu-item" onClick={handleJumpToTop}>
                <span>{t('view.jumpToTop')}</span>
                <span className="shortcut">{t('shortcuts.ctrlHome')}</span>
              </div>
              <div className="menu-item" onClick={handleJumpToSelection}>
                <span>{t('view.jumpToSelection')}</span>
                <span className="shortcut">{t('shortcuts.ctrlJ')}</span>
              </div>
              <div className="menu-item" onClick={handleJumpToBottom}>
                <span>{t('view.jumpToBottom')}</span>
                <span className="shortcut">{t('shortcuts.ctrlEnd')}</span>
              </div>
              <div className="menu-divider" />
              <div className="menu-item" onClick={handleFocusMode}>
                <span>{focusMode ? `✓ ${t('view.focusMode')}` : t('view.focusMode')}</span>
                <span className="shortcut">{t('shortcuts.ctrlShiftF')}</span>
              </div>
              <div className="menu-item" onClick={handleTypewriterMode}>
                <span>{typewriterMode ? `✓ ${t('view.typewriterMode')}` : t('view.typewriterMode')}</span>
                <span className="shortcut">{t('shortcuts.ctrlShiftT')}</span>
              </div>
              <div className="menu-divider" />
              <div className="menu-item" onClick={() => { setActiveMenu(null); toggleSourceMode(); }}>
                <span>{sourceMode ? `✓ ${t('view.sourceMode')}` : t('view.sourceMode')}</span>
                <span className="shortcut">{t('shortcuts.ctrlSlash')}</span>
              </div>
              <div className="menu-divider" />
              
              <div className="menu-item" onClick={handleZoomIn}>
                <span>{t('view.zoomIn')}</span>
                <span className="shortcut">{t('shortcuts.ctrlShiftEqual')}</span>
              </div>
              <div className="menu-item" onClick={handleZoomOut}>
                <span>{t('view.zoomOut')}</span>
                <span className="shortcut">{t('shortcuts.ctrlMinus')}</span>
              </div>
              <div className="menu-item" onClick={handleResetZoom}>
                <span>{t('view.resetZoom')}</span>
                <span className="shortcut">{t('shortcuts.ctrl0')}</span>
              </div>
              <div className="menu-item" onClick={handleFullScreen}>
                <span>{t('view.fullScreen')}</span>
              </div>
              <div className="menu-divider" />
              
              <div className="menu-item submenu-trigger">
                <span>{t('settings.theme')}</span>
                <div className="submenu theme-submenu" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                  {Object.entries(themes).map(([key, theme]) => (
                    <div
                      key={key}
                      className="menu-item"
                      onClick={() => { setActiveMenu(null); setTheme(key as any); }}
                    >
                      <span>{currentTheme === key ? `✓ ${theme.name}` : theme.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="menu-divider" />
              
              <div className="menu-item" onClick={() => { setActiveMenu(null); setShowShortcutSettings(true); }}>
                <span>{t('view.keyboardShortcuts')}</span>
                <span className="shortcut">{t('shortcuts.ctrlShiftK')}</span>
              </div>
              <div className="menu-divider" />
              <div className="menu-item" onClick={() => { setActiveMenu(null); toggleWordGoal(); }}>
                <span>{wordGoalEnabled ? `✓ ${t('view.wordGoal')}` : t('view.wordGoal')}</span>
              </div>
              <div className="menu-item" onClick={() => { setActiveMenu(null); togglePomodoro(); }}>
                <span>{pomodoroEnabled ? `✓ ${t('view.pomodoroTimer')}` : t('view.pomodoroTimer')}</span>
              </div>
              <div className="menu-divider" />
              <div className="menu-item" onClick={() => { setActiveMenu(null); setShowThemeEditor(true); }}>
                <span>{t('view.themeEditor')}</span>
              </div>
              <div className="menu-divider" />
              <div className="menu-item" onClick={() => { setActiveMenu(null); setShowBookmarkPanel(true); }}>
                <span>{t('view.bookmarks')}</span>
              </div>
              <div className="menu-divider" />
              <div className="menu-item" onClick={() => { setActiveMenu(null); setShowVersionHistory(true); }}>
                <span>{t('view.versionHistory')}</span>
              </div>
              <div className="menu-divider" />
              <div className="menu-item" onClick={() => { setActiveMenu(null); setShowCollaboration(true); }}>
                <span>{t('view.collaboration')}</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="typora-titlebar-menu-wrapper"
          onClick={() => setActiveMenu(activeMenu === 'help' ? null : 'help')}
        >
          <span className={`typora-titlebar-menu ${activeMenu === 'help' ? 'active' : ''}`}>
            {t('menu.help')}
          </span>
          {activeMenu === 'help' && (
            <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
              <div className="menu-item" onClick={handleOpenDocs}>
                <span>{t('help.documentation')}</span>
              </div>
              <div className="menu-item" onClick={handleMarkdownReference}>
                <span>{t('help.markdownReference')}</span>
              </div>
              <div className="menu-item" onClick={() => { setActiveMenu(null); setShowShortcutSettings(true); }}>
                <span>{t('help.keyboardShortcuts')}</span>
              </div>
              <div className="menu-divider" />
              <div className="menu-item" onClick={handleCheckUpdates}>
                <span>{t('help.checkUpdates')}</span>
              </div>
              <div className="menu-item" onClick={handleReportIssue}>
                <span>{t('help.reportIssue')}</span>
              </div>
              <div className="menu-divider" />
              <div className="menu-item" onClick={() => { setActiveMenu(null); setShowAboutDialog(true); }}>
                <span>{t('help.about')}</span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <span className="typora-titlebar-title">{fileName} - Markhere</span>

      {/* Fallback close button — works even if macOS traffic lights are blocked */}
      <button className="typora-titlebar-close-btn" onClick={handleCloseWindow} title="Close Window (Cmd+W)">
        ×
      </button>
      
      <ShortcutSettings isOpen={showShortcutSettings} onClose={() => setShowShortcutSettings(false)} />
      <TemplateSelector isOpen={showTemplateSelector} onClose={() => setShowTemplateSelector(false)} />
      <BookmarkPanel isOpen={showBookmarkPanel} onClose={() => setShowBookmarkPanel(false)} />
      <ThemeEditor isOpen={showThemeEditor} onClose={() => setShowThemeEditor(false)} />
      <VersionHistory isOpen={showVersionHistory} onClose={() => setShowVersionHistory(false)} />
      <CollaborationPanel isOpen={showCollaboration} onClose={() => setShowCollaboration(false)} />
      <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />
      
      {showSearchPanel && <SearchPanel />}

      {showAboutDialog && (
        <div className="about-dialog-overlay" onClick={() => setShowAboutDialog(false)}>
          <div className="about-dialog" onClick={(e) => e.stopPropagation()}>
            <h2 className="about-dialog-title">Markhere</h2>
            <div className="about-dialog-version">Version 0.4.8</div>
            <p className="about-dialog-desc">A modern WYSIWYG Markdown editor with cross-platform support</p>
            <div className="about-dialog-tech">
              <span>Tauri 2.5</span>
              <span className="about-dialog-sep">|</span>
              <span>React 19</span>
            </div>
            <div className="about-dialog-license">MIT License</div>
            <div className="about-dialog-copyright">2026 Markhere Team</div>
            <button className="about-dialog-close-btn" onClick={() => setShowAboutDialog(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}