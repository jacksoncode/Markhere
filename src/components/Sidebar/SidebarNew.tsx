import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { Editor } from '@tiptap/react';
import { useFileStore } from '../../store/fileStore';
import { useEditorState } from '../../store/editorStore';
import { useUIState } from '../../store/uiStore';
import { useAutoSaveStore } from '../../store/autoSaveStore';
import { useRecentFilesStore } from '../../store/recentFilesStore';
import { useTranslation } from '../../i18n';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { readDir } from '@tauri-apps/plugin-fs';
import type { DirEntry } from '@tauri-apps/plugin-fs';
import { useNotificationStore } from '../Notification/Notification';
import { BookmarkList } from '../Bookmarks/BookmarkList';
import './Sidebar-New.css';
import { TagPanel } from './TagPanel';

type SidebarTab = 'files' | 'outline' | 'bookmarks' | 'tags' | 'diary' | 'import' | 'database' | 'dataview' | 'canvas' | 'links';

function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

interface OutlineItem {
  level: number;
  text: string;
  pos: number;
  lineNumber: number;
}

/** Extract headings from the ProseMirror document via the Editor instance. */
function extractHeadings(editor: Editor | null): OutlineItem[] {
  if (!editor) return [];
  const headings: OutlineItem[] = [];
  const { doc } = editor.state;

  doc.descendants((node, pos) => {
    if (node.type.name === 'heading') {
      const lineNumber = doc.textBetween(0, pos).split('\n').length;
      headings.push({
        level: node.attrs.level as number,
        text: node.textContent,
        pos,
        lineNumber,
      });
    }
  });

  return headings;
}

/**
 * Find the document position where the current heading's section ends.
 * A section ends at the next heading of equal or higher level (lower number),
 * or at end-of-document if none follows.
 */
function findSectionEnd(editor: Editor, headingPos: number, level: number): number {
  let end = editor.state.doc.content.size;

  editor.state.doc.descendants((node, pos) => {
    if (pos <= headingPos) return true;
    if (node.type.name === 'heading' && (node.attrs.level as number) <= level) {
      end = pos;
      return false;
    }
    return true;
  });

  return end;
}

const TAB_ORDER: SidebarTab[] = ['files', 'outline', 'tags', 'diary', 'import', 'bookmarks', 'database', 'dataview', 'canvas', 'links'];
const DatabasePanelLazy = lazy(() => import('../Database/DatabasePanel').then(m => ({ default: m.DatabasePanel })));
const DataviewPanelLazy = lazy(() => import('../Dataview/DataviewPanel').then(m => ({ default: m.DataviewPanel })));
const CanvasBoardLazy = lazy(() => import('../Canvas/CanvasBoard').then(m => ({ default: m.CanvasBoard })));
const BacklinksPanelLazy = lazy(() => import('./BacklinksPanel').then(m => ({ default: m.BacklinksPanel })));
const DiaryPanelLazy = lazy(() => import('../Diary/DiaryPanel').then(m => ({ default: m.DiaryPanel })));
const ImportPanelLazy = lazy(() => import('../Import/ImportPanel').then(m => ({ default: m.ImportPanel })));

export function SidebarNew() {
  const [activeTab, setActiveTab] = useState<SidebarTab>('files');
  const { t } = useTranslation();
  const { sidebarOpen, toggleSidebar } = useUIState();
  const { currentPath, setCurrentPath, setSavedContent } = useFileStore();
  const { editorInstance } = useEditorState();
  const { clearBackup } = useAutoSaveStore();
  const { files: recentFiles, addFile } = useRecentFilesStore();
  const notify = useNotificationStore((s) => s.notify);
  const sidebarRef = useRef<HTMLElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('markhere-sidebar-width');
    const w = saved ? parseInt(saved, 10) : 260;
    return Number.isFinite(w) ? Math.max(180, Math.min(500, w)) : 260;
  });
  const [isDragging, setIsDragging] = useState(false);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    if (isMobile) return;
    e.preventDefault();
    setIsDragging(true);
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    let newWidth = startWidth;
    const onMove = (ev: globalThis.MouseEvent) => {
      const delta = ev.clientX - startX;
      newWidth = Math.max(180, Math.min(500, startWidth + delta));
      setSidebarWidth(newWidth);
    };
    const onUp = () => {
      setIsDragging(false);
      localStorage.setItem('markhere-sidebar-width', String(newWidth));
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [isMobile, sidebarWidth]);

  /* ── Browse mode state ── */
  const [isBrowseMode, setIsBrowseMode] = useState(() => {
    const saved = localStorage.getItem('markhere-browse-mode');
    return saved === 'true';
  });
  const [browsePath, setBrowsePath] = useState<string | null>(() => {
    return localStorage.getItem('markhere-browse-path') || null;
  });
  const [dirEntries, setDirEntries] = useState<DirEntry[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [dirChildrenCache, setDirChildrenCache] = useState<Map<string, DirEntry[]>>(new Map());
  const [dirLoading, setDirLoading] = useState(false);

  /* ── Detect mobile for overlay behavior ── */
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches);
    };
    handler(mq);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  /* ── Restore last-opened folder on mount ── */
  useEffect(() => {
    const savedMode = localStorage.getItem('markhere-browse-mode');
    const savedPath = localStorage.getItem('markhere-browse-path');
    if (savedMode === 'true' && savedPath) {
      loadDirectory(savedPath);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Lock body scroll when mobile sidebar is open ── */
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobile, sidebarOpen]);

  // Focus first focusable element when sidebar opens
  useEffect(() => {
    if (sidebarOpen && sidebarRef.current) {
      const timer = setTimeout(() => {
        const firstButton = sidebarRef.current?.querySelector<HTMLElement>(
          'button[role="tab"], .file-tree-action-btn, .sidebar-open-btn'
        );
        firstButton?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [sidebarOpen]);

  /** Close sidebar on mobile (used after selecting a file). */
  const closeOnMobile = useCallback(() => {
    if (isMobile && sidebarOpen) {
      toggleSidebar();
    }
  }, [isMobile, sidebarOpen, toggleSidebar]);

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const currentIndex = TAB_ORDER.indexOf(activeTab);
    let nextIndex = currentIndex;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextIndex = (currentIndex + 1) % TAB_ORDER.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      nextIndex = (currentIndex - 1 + TAB_ORDER.length) % TAB_ORDER.length;
    }
    if (nextIndex !== currentIndex) {
      setActiveTab(TAB_ORDER[nextIndex]);
    }
  };

  /* ── Directory browser helpers ── */

  const loadDirectory = useCallback(async (dirPath: string) => {
    setDirLoading(true);
    try {
      const entries = await readDir(dirPath);
      // Sort: directories first, then files, both alphabetically
      entries.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
      setDirEntries(entries);
      setBrowsePath(dirPath);
      localStorage.setItem('markhere-browse-path', dirPath);
    } catch (err) {
      console.error('Failed to read directory:', err);
      notify('error', `${t('sidebar.browseFolderFailed')}: ${(err as Error).message || String(err)}`);
    } finally {
      setDirLoading(false);
    }
  }, [notify, t]);

  const handleBrowseFolder = useCallback(async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: t('sidebar.browseFolder'),
      });
      if (!selected || typeof selected !== 'string') return;
      setIsBrowseMode(true);
      localStorage.setItem('markhere-browse-mode', 'true');
      localStorage.setItem('markhere-browse-path', selected);
      await loadDirectory(selected);
    } catch (err) {
      console.error('Failed to open folder picker:', err);
    }
  }, [loadDirectory, t]);

  const handleToggleDir = useCallback(async (entryPath: string, _entryName: string) => {
    if (expandedDirs.has(entryPath)) {
      // Collapse
      setExpandedDirs((prev) => {
        const next = new Set(prev);
        next.delete(entryPath);
        return next;
      });
    } else {
      // Expand: load children
      try {
        const children = await readDir(entryPath);
        children.sort((a, b) => {
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        });
        setDirChildrenCache((prev) => {
          const next = new Map(prev);
          next.set(entryPath, children);
          return next;
        });
        setExpandedDirs((prev) => {
          const next = new Set(prev);
          next.add(entryPath);
          return next;
        });
      } catch (err) {
        console.error('Failed to read directory:', err);
        notify('error', `${t('sidebar.browseFolderFailed')}: ${(err as Error).message || String(err)}`);
      }
    }
  }, [expandedDirs, notify, t]);

  const handleBrowseFileClick = useCallback(async (filePath: string) => {
    try {
      const content = await invoke<string>('read_file', { path: filePath });
      // Load into editor — setContent may throw NodeViewWrapper when content
      // contains nodes (images, mermaid, wiki-links) whose React renderer
      // is not yet ready, but the content usually loads correctly nonetheless.
      try {
        editorInstance?.commands.setContent(content);
      } catch (nodeViewErr) {
        console.warn('setContent NodeView warning (non-fatal):', nodeViewErr);
      }
      setCurrentPath(filePath);
      setSavedContent(content);
      try {
        addFile(filePath, filePath.split('/').pop() || 'Untitled');
        notify('success', `${t('sidebar.openFileSuccess')}: ${filePath.split('/').pop()}`);
      } catch { /* non-critical */ }
      closeOnMobile();
    } catch (err) {
      console.error('Failed to open file:', err);
      notify('error', `${t('sidebar.openFileFailed')}: ${(err as Error).message || String(err)}`);
    }
  }, [editorInstance, setCurrentPath, setSavedContent, addFile, notify, t, closeOnMobile]);

  const handleNavigateUp = useCallback(() => {
    if (!browsePath) return;
    // Get parent directory
    const parts = browsePath.split('/');
    parts.pop();
    const parentPath = parts.join('/') || '/';
    if (parentPath) {
      loadDirectory(parentPath);
    }
  }, [browsePath, loadDirectory]);

  const filteredRecentFiles = recentFiles.filter(
    (f) => f.path !== currentPath
  );

  /* ── Outline state ── */
  const [headings, setHeadings] = useState<OutlineItem[]>([]);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragSourceIndex = useRef<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Debounced heading extraction (500 ms) – runs on every editor update
  useEffect(() => {
    if (!editorInstance) {
      setHeadings([]);
      return;
    }

    const schedule = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setHeadings(extractHeadings(editorInstance));
      }, 500);
    };

    editorInstance.on('update', schedule);
    editorInstance.on('selectionUpdate', schedule);
    schedule(); // initial extraction

    return () => {
      editorInstance.off('update', schedule);
      editorInstance.off('selectionUpdate', schedule);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [editorInstance]);

  const scrollToHeading = useCallback(
    (pos: number) => {
      editorInstance?.chain().focus().setTextSelection(pos).run();
    },
    [editorInstance]
  );

  const handleDragStart = useCallback((index: number) => {
    dragSourceIndex.current = index;
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragOverIndex(index);
    },
    []
  );

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetIndex: number) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOverIndex(null);

      const sourceIndex = dragSourceIndex.current;
      dragSourceIndex.current = null;

      if (
        sourceIndex === null ||
        sourceIndex === targetIndex ||
        !editorInstance
      ) {
        return;
      }

      // Re-extract to get fresh positions (document may have changed)
      const currentHeadings = extractHeadings(editorInstance);
      if (
        sourceIndex >= currentHeadings.length ||
        targetIndex >= currentHeadings.length
      ) {
        return;
      }

      const dragged = currentHeadings[sourceIndex];
      const target = currentHeadings[targetIndex];

      const dragFrom = dragged.pos;
      const dragTo = findSectionEnd(editorInstance, dragged.pos, dragged.level);
      const targetTo = findSectionEnd(editorInstance, target.pos, target.level);

      const { tr } = editorInstance.state;
      const slice = editorInstance.state.doc.slice(dragFrom, dragTo);

      if (dragFrom < targetTo) {
        // dragged section comes before target: delete first, then insert
        tr.delete(dragFrom, dragTo);
        const newTargetEnd = tr.mapping.map(targetTo);
        tr.insert(newTargetEnd, slice.content);
      } else {
        // dragged section comes after target: insert first, then delete
        tr.insert(targetTo, slice.content);
        const newDragFrom = tr.mapping.map(dragFrom);
        const newDragTo = tr.mapping.map(dragTo);
        tr.delete(newDragFrom, newDragTo);
      }

      editorInstance.view.dispatch(tr);
    },
    [editorInstance]
  );
  /* ── end outline state ── */

  const handleNewFile = () => {
    editorInstance?.commands.clearContent();
    setCurrentPath(null);
    setSavedContent('');
    clearBackup();
  };

  const handleOpenFile = async () => {
    try {
      const selected = await open({
        filters: [{ name: 'Markdown', extensions: ['md', 'txt'] }],
        multiple: false,
      });
      if (!selected || typeof selected !== 'string') return;
      const content = await invoke<string>('read_file', { path: selected });
      // setContent may throw NodeViewWrapper when content contains nodes
      // (images/mermaid/wiki-links) whose React renderers aren't ready yet.
      // The content still loads — catch this gracefully.
      try {
        editorInstance?.commands.setContent(content);
      } catch (nodeViewErr) {
        console.warn('setContent NodeView warning (non-fatal):', nodeViewErr);
      }
      setCurrentPath(selected);
      setSavedContent(content);
      try {
        addFile(selected, selected.split('/').pop() || 'Untitled');
        notify('success', `${t('sidebar.openFileSuccess')}: ${selected.split('/').pop()}`);
      } catch { /* non-critical */ }
      closeOnMobile();
    } catch (err) {
      console.error('Failed to open file:', err);
      notify('error', `${t('sidebar.openFileFailed')}: ${(err as Error).message || String(err)}`);
    }
  };

  const handleRecentFileClick = async (path: string) => {
    try {
      const content = await invoke<string>('read_file', { path });
      // setContent may throw NodeViewWrapper when content contains nodes
      // (images/mermaid/wiki-links) whose React renderers aren't ready yet.
      // The content still loads — catch this gracefully.
      try {
        editorInstance?.commands.setContent(content);
      } catch (nodeViewErr) {
        console.warn('setContent NodeView warning (non-fatal):', nodeViewErr);
      }
      setCurrentPath(path);
      setSavedContent(content);
      try {
        addFile(path, path.split('/').pop() || 'Untitled');
      } catch { /* non-critical */ }
      closeOnMobile();
    } catch (err) {
      console.error('Failed to open file:', err);
      notify('error', `${t('sidebar.openFileFailed')}: ${(err as Error).message || String(err)}`);
    }
  };

  const handleBookmarkNavigate = (position: number) => {
    editorInstance?.chain().focus().setTextSelection(position).run();
  };

  const tabs: { key: SidebarTab; icon: string; label: string }[] = [
    { key: 'files', icon: '📁', label: t('sidebar.files') },
    { key: 'outline', icon: '📋', label: t('sidebar.outline') },
    { key: 'diary', icon: '📅', label: 'Diary' },
    { key: 'import', icon: '📥', label: 'Import' },
    { key: 'bookmarks', icon: '🔖', label: t('sidebar.bookmarks') },
    { key: 'tags', icon: '#', label: 'Tags' },
    { key: 'database', icon: '🗄', label: 'Database' },
    { key: 'dataview', icon: '🔍', label: 'Query' },
    { key: 'canvas', icon: '🎨', label: 'Canvas' },
    { key: 'links', icon: '🔗', label: 'Links' },
  ];

  /** Recursively render a single directory level for the Browse view. */
  const renderDirectoryTree = useCallback(
    (entries: DirEntry[], parentPath: string, depth: number): React.ReactNode => {
      return entries.map((entry) => {
        const entryPath = `${parentPath}/${entry.name}`.replace(/\/\//g, '/');
        const isMarkdown = entry.isFile && entry.name.toLowerCase().endsWith('.md');
        const isExpanded = expandedDirs.has(entryPath);
        const children = dirChildrenCache.get(entryPath);

        if (entry.isDirectory) {
          return (
            <div key={entryPath}>
              <div
                className="browse-tree-item browse-tree-dir"
                style={{ paddingLeft: `${12 + depth * 16}px` }}
                onClick={() => handleToggleDir(entryPath, entry.name)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleToggleDir(entryPath, entry.name);
                  }
                }}
                role="treeitem"
                tabIndex={0}
                aria-expanded={isExpanded}
              >
                <svg className="browse-tree-chevron" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                  <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                </svg>
                <svg className="browse-tree-icon browse-tree-folder-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                </svg>
                <span className="browse-tree-name">{entry.name}</span>
              </div>
              {isExpanded && children && children.length > 0 && (
                <div role="group">
                  {renderDirectoryTree(children, entryPath, depth + 1)}
                </div>
              )}
              {isExpanded && children && children.length === 0 && (
                <div className="browse-tree-empty" style={{ paddingLeft: `${28 + depth * 16}px` }}>
                  {t('sidebar.emptyDirectory')}
                </div>
              )}
            </div>
          );
        }

        // File entry
        return (
          <div
            key={entryPath}
            className={`browse-tree-item browse-tree-file${isMarkdown ? ' browse-tree-md' : ''}`}
            style={{ paddingLeft: `${28 + depth * 16}px` }}
            onClick={() => {
              if (isMarkdown) handleBrowseFileClick(entryPath);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (isMarkdown) handleBrowseFileClick(entryPath);
              }
            }}
            role="treeitem"
            tabIndex={0}
            title={entryPath}
          >
            <svg className="browse-tree-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              {isMarkdown ? (
                <>
                  <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                </>
              ) : (
                <>
                  <path d="M6 2c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6H6zm7 7V3.5L18.5 9H13z" />
                </>
              )}
            </svg>
            <span className="browse-tree-name">{entry.name}</span>
          </div>
        );
      });
    },
    [expandedDirs, dirChildrenCache, handleToggleDir, handleBrowseFileClick, t]
  );

  const renderBrowseView = () => (
    <div className="browse-tree-section">
      {/* Breadcrumb bar */}
      <div className="browse-breadcrumb">
        <button
          className="browse-breadcrumb-btn"
          onClick={handleNavigateUp}
          title={t('sidebar.navigateUp')}
          aria-label={t('sidebar.navigateUp')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </button>
        <span className="browse-breadcrumb-path" title={browsePath || ''}>
          {browsePath ? (browsePath.split('/').filter(Boolean).pop() || browsePath) : ''}
        </span>
      </div>

      {/* Directory contents */}
      <div className="browse-tree" role="tree" aria-label={t('sidebar.browseFolder')}>
        {dirLoading ? (
          <div className="browse-tree-empty">{t('sidebar.loadingDirectory')}</div>
        ) : dirEntries.length === 0 ? (
          <div className="browse-tree-empty">{t('sidebar.emptyDirectory')}</div>
        ) : (
          renderDirectoryTree(dirEntries, browsePath || '', 0)
        )}
      </div>
    </div>
  );

  const renderFileTreeView = () => (
    <div className="file-tree-section">
      <div className="file-tree-header">
        <span>{isBrowseMode ? t('sidebar.browseView') : t('sidebar.recentFiles')}</span>
        <div className="file-tree-actions">
          <button
            className={`file-tree-action-btn${isBrowseMode ? ' active' : ''}`}
            onClick={() => setIsBrowseMode(false)}
            title={t('sidebar.recentView')}
            aria-label={t('sidebar.recentView')}
            aria-pressed={!isBrowseMode}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18z" />
            </svg>
          </button>
          <button
            className={`file-tree-action-btn${isBrowseMode ? ' active' : ''}`}
            onClick={handleBrowseFolder}
            title={t('sidebar.browseFolder')}
            aria-label={t('sidebar.browseFolder')}
            aria-pressed={isBrowseMode}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
            </svg>
          </button>
          <button
            className="file-tree-action-btn"
            onClick={handleOpenFile}
            title={t('sidebar.openFileDialog')}
            aria-label={t('sidebar.openFileDialog')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
            </svg>
          </button>
          <button
            className="file-tree-action-btn"
            onClick={handleNewFile}
            title={t('sidebar.newFile')}
            aria-label={t('sidebar.newFile')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Browse view */}
      {isBrowseMode ? (
        <>
          {browsePath ? (
            renderBrowseView()
          ) : (
            <div className="browse-tree-section">
              <div className="browse-tree-empty" style={{ padding: '24px 16px' }}>
                {t('sidebar.browseFolder')}
              </div>
              <button className="sidebar-open-btn" onClick={handleBrowseFolder} aria-label={t('sidebar.browseFolder')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                </svg>
                {t('sidebar.browseFolder')}
              </button>
            </div>
          )}

          {/* Also show current file */}
          {currentPath && (
            <>
              <div className="file-tree-current-header">{t('sidebar.currentFile')}</div>
              <ul className="file-tree-list" role="listbox" aria-label={t('sidebar.currentFile')}>
                <li className="file-tree-item active" role="option" aria-selected="true">
                  <div className="file-tree-item-content">
                    <svg className="file-tree-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                    </svg>
                    <span className="file-tree-name">{currentPath.split('/').pop()}</span>
                  </div>
                </li>
              </ul>
            </>
          )}
        </>
      ) : (
        <>
          {/* Recent files view (original) */}
          {currentPath && (
            <>
              <div className="file-tree-current-header">{t('sidebar.currentFile')}</div>
              <ul className="file-tree-list" role="listbox" aria-label={t('sidebar.currentFile')}>
                <li className="file-tree-item active" role="option" aria-selected="true">
                  <div className="file-tree-item-content">
                    <svg className="file-tree-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                    </svg>
                    <span className="file-tree-name">{currentPath.split('/').pop()}</span>
                  </div>
                </li>
              </ul>
            </>
          )}

          {!currentPath && (
            <>
              <div className="file-tree-current-header">{t('sidebar.currentFile')}</div>
              <ul className="file-tree-list" role="listbox" aria-label={t('sidebar.currentFile')}>
                <li className="file-tree-item active" role="option" aria-selected="true">
                  <div className="file-tree-item-content">
                    <svg className="file-tree-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                    </svg>
                    <span className="file-tree-name">Untitled.md</span>
                  </div>
                </li>
              </ul>
            </>
          )}

          <ul className="file-tree-list" role="listbox" aria-label={t('sidebar.recentFiles')}>
            {filteredRecentFiles.length === 0 ? (
              <li className="file-tree-empty" role="option" aria-selected="false">{t('sidebar.noRecentFiles')}</li>
            ) : (
              filteredRecentFiles.map((file) => (
                <li
                  key={file.path}
                  className="file-tree-item"
                  role="option"
                  aria-selected="false"
                  tabIndex={0}
                  onClick={() => handleRecentFileClick(file.path)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleRecentFileClick(file.path);
                    }
                  }}
                  title={file.path}
                >
                  <div className="file-tree-item-content">
                    <svg className="file-tree-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                    </svg>
                    <span className="file-tree-name">{file.name}</span>
                    <span className="file-tree-time">{formatRelativeTime(file.lastOpened)}</span>
                  </div>
                </li>
              ))
            )}
          </ul>

          <button className="sidebar-open-btn" onClick={handleOpenFile} aria-label={t('sidebar.openFile')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
            </svg>
            {t('sidebar.openFile')}
          </button>
        </>
      )}
    </div>
  );

  const renderOutlineView = () => (
    <div className="outline-section">
      {headings.length === 0 ? (
        <div className="outline-empty">{t('sidebar.noHeadings')}</div>
      ) : (
        <>
          <div className="outline-hint">{t('sidebar.dragToReorder')}</div>
          <ul className="outline-list" role="list" aria-label={t('sidebar.outline')}>
            {headings.map((item, index) => (
              <li
                key={`${item.pos}-${item.text}`}
                className={`outline-item level-${item.level}${
                  dragOverIndex === index ? ' drag-over' : ''
                }`}
                onClick={() => scrollToHeading(item.pos)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    scrollToHeading(item.pos);
                  }
                }}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                role="listitem"
                tabIndex={0}
                aria-label={`${t('paragraph.heading' + item.level) || `Heading ${item.level}`}: ${item.text}`}
              >
                <span className={`heading-badge h${item.level}`}>
                  H{item.level}
                </span>
                <span className="outline-text">{item.text}</span>
                <span className="outline-line-number">
                  {t('sidebar.lineNumber')} {item.lineNumber}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );

  const renderBookmarksView = () => (
    <div className="sidebar-bookmark-panel">
      <BookmarkList onNavigate={handleBookmarkNavigate} />
    </div>
  );

  const renderView = () => {
    switch (activeTab) {
      case 'outline':
        return renderOutlineView();
      case 'bookmarks':
        return renderBookmarksView();
      case 'diary':
        return <Suspense fallback={<div className="sidebar-loading">Loading...</div>}><DiaryPanelLazy /></Suspense>;
      case 'import':
        return <Suspense fallback={<div className="sidebar-loading">Loading...</div>}><ImportPanelLazy /></Suspense>;
      case 'database':
        return <Suspense fallback={<div className="sidebar-loading">Loading...</div>}><DatabasePanelLazy /></Suspense>;
      case 'dataview':
        return <Suspense fallback={<div className="sidebar-loading">Loading...</div>}><DataviewPanelLazy /></Suspense>;
      case 'tags':
        return <Suspense fallback={<div className="sidebar-loading">Loading...</div>}><TagPanel /></Suspense>;
      case 'canvas':
        return <Suspense fallback={<div className="sidebar-loading">Loading...</div>}><CanvasBoardLazy /></Suspense>;
      case 'links':
        return <Suspense fallback={<div className="sidebar-loading">Loading...</div>}><BacklinksPanelLazy /></Suspense>;
      case 'files':
      default:
        return renderFileTreeView();
    }
  };

  return (
    <>
      {/* ── Mobile backdrop overlay ── */}
      <div
        className={`sidebar-backdrop${isMobile && sidebarOpen ? ' visible' : ''}`}
        onClick={toggleSidebar}
        aria-hidden="true"
      />

      <aside
        ref={sidebarRef}
        className={`sidebar ${sidebarOpen ? 'open' : 'closed'}${isMobile ? ' sidebar-mobile' : ''}${isDragging ? ' dragging' : ''}`}
        style={sidebarOpen && !isMobile ? { width: sidebarWidth } : undefined}
        role="navigation"
        aria-label={t('sidebar.label') || 'Sidebar'}
      >
      {sidebarOpen ? (
        <>
          <div className="sidebar-header">
            <span className="sidebar-title">Markhere</span>
            <button
              className="sidebar-toggle"
              onClick={toggleSidebar}
              title={t('sidebar.closeSidebar')}
              aria-label={t('sidebar.closeSidebar')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
              </svg>
            </button>
          </div>

          <div className="sidebar-tabs" role="tablist" aria-label={t('sidebar.tabsLabel') || 'Sidebar tabs'}>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                id={`sidebar-tab-${tab.key}`}
                className={`sidebar-tab ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
                onKeyDown={handleTabKeyDown}
                role="tab"
                aria-selected={activeTab === tab.key}
                aria-label={tab.label}
                aria-controls={`sidebar-panel-${tab.key}`}
                title={tab.label}
                tabIndex={activeTab === tab.key ? 0 : -1}
              >
                <span className="sidebar-tab-icon" aria-hidden="true">{tab.icon}</span>
              </button>
            ))}
          </div>

          <div className="sidebar-content" role="tabpanel" id={`sidebar-panel-${activeTab}`} aria-labelledby={`sidebar-tab-${activeTab}`}>
            <div className="sidebar-panel-header">{tabs.find(t => t.key === activeTab)?.label}</div>
            {renderView()}
          </div>

           <div className="sidebar-footer">
             <button
               className="sidebar-footer-btn"
               onClick={toggleSidebar}
               aria-label={t('sidebar.closeSidebar')}
             >
               <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                 <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
               </svg>
               {t('sidebar.closeSidebar')}
             </button>
           </div>
         </>
       ) : (
         <button
           className="sidebar-expand-btn"
           onClick={toggleSidebar}
           title={t('sidebar.showSidebar')}
           aria-label={t('sidebar.showSidebar')}
         >
           <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
             <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
           </svg>
         </button>
       )}
       {sidebarOpen && !isMobile && (
         <div
           className="sidebar-resize-handle"
           onMouseDown={handleResizeStart}
           role="separator"
           aria-orientation="vertical"
           aria-label="Resize sidebar"
         />
       )}
     </aside>
    </>
  );
}
