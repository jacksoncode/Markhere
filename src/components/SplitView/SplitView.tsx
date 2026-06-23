import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Editor } from '@tiptap/react';
import DOMPurify from 'dompurify';
import { MainEditor } from '../Editor/MainEditor';
import { useEditorState } from '../../store/editorStore';
import { useTabsStore } from '../../store/tabsStore';
import { useUIState } from '../../store/uiStore';
import './SplitView.css';

type SplitMode = 'preview' | 'source' | 'editor';
type SplitDirection = 'horizontal' | 'vertical';

// ─── Resize constants ───
const MIN_LEFT_PCT = 25;
const MIN_RIGHT_PCT = 25;
const DEFAULT_SPLIT = 55;

// ─── Secondary editor state management ───
interface SecondaryEditorState {
  path: string | null;
  content: string;
  name: string;
}

// Simple store for secondary editor
let secondaryEditorState: SecondaryEditorState = { path: null, content: '', name: '' };
const secondaryEditorListeners: Set<() => void> = new Set();

function setSecondaryEditor(state: Partial<SecondaryEditorState>) {
  secondaryEditorState = { ...secondaryEditorState, ...state };
  secondaryEditorListeners.forEach(l => l());
}

function getSecondaryEditor(): SecondaryEditorState {
  return secondaryEditorState;
}

function subscribeSecondaryEditor(listener: () => void) {
  secondaryEditorListeners.add(listener);
  return () => secondaryEditorListeners.delete(listener);
}

export function SplitView() {
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [splitMode, setSplitMode] = useState<SplitMode>('preview');
  const [splitDirection, setSplitDirection] = useState<SplitDirection>('horizontal');
  const [previewHtml, setPreviewHtml] = useState('');
  const [sourceMarkdown, setSourceMarkdown] = useState('');
  const [splitPos, setSplitPos] = useState(DEFAULT_SPLIT);
  const [secondaryState, setSecondaryState] = useState<SecondaryEditorState>(getSecondaryEditor());

  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const editorRef = useRef<Editor | null>(null);

  const { toggleSplitView, splitViewEnabled, splitViewDirection } = useUIState();

  const editorInstance: Editor | null = useEditorState(
    useCallback((state) => state.editorInstance, []),
  );

  const { tabs, activeTabId } = useTabsStore();

  editorRef.current = editorInstance;

  // Subscribe to secondary editor changes
  useEffect(() => {
    const unsubscribe = subscribeSecondaryEditor(() => {
      setSecondaryState(getSecondaryEditor());
    });
    return () => { unsubscribe(); };
  }, []);

  // Sync with uiStore
  useEffect(() => {
    if (splitViewEnabled !== undefined) {
      setSplitEnabled(splitViewEnabled);
    }
    if (splitViewDirection !== undefined) {
      setSplitDirection(splitViewDirection);
    }
  }, [splitViewEnabled, splitViewDirection]);

  // Listen to editor updates to sync the right pane content
  useEffect(() => {
    if (!splitEnabled || !editorInstance) return;

    // Guard: ensure editor is fully mounted
    if (!editorInstance.isEditable) return;

    const handleUpdate = ({ editor }: { editor: Editor }) => {
      const html = editor.getHTML();
      setPreviewHtml(html);

      try {
        const md = (editor.storage as unknown as Record<string, unknown>)?.markdown as
          | { getMarkdown?: () => string }
          | undefined;
        setSourceMarkdown(md?.getMarkdown?.() ?? '');
      } catch {
        setSourceMarkdown('');
      }
    };

    handleUpdate({ editor: editorInstance });
    editorInstance.on('update', handleUpdate);

    return () => {
      editorInstance.off('update', handleUpdate);
    };
  }, [splitEnabled, editorInstance]);

  // ─── Resize handle logic ───
  const handleResizeStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handleResizeMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const isHorizontal = splitDirection === 'horizontal';
    const pos = isHorizontal
      ? (e.clientX - rect.left)
      : (e.clientY - rect.top);
    const size = isHorizontal ? rect.width : rect.height;
    const pct = (pos / size) * 100;
    setSplitPos(Math.max(MIN_LEFT_PCT, Math.min(100 - MIN_RIGHT_PCT, pct)));
  }, [splitDirection]);

  const handleResizeEnd = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  // ─── Scroll sync for preview ───
  const previewRef = useRef<HTMLDivElement>(null);
  const [scrollRatio, setScrollRatio] = useState(0);

  useEffect(() => {
    if (!splitEnabled || !editorInstance || splitMode === 'editor') return;

    // Guard: ensure editor is fully mounted before accessing view.dom
    if (!editorInstance.isEditable || !editorInstance.view?.dom) return;

    const editorDom = editorInstance.view.dom;
    const onScroll = () => {
      if (!editorDom.parentElement) return;
      const { scrollTop, scrollHeight, clientHeight } = editorDom.parentElement;
      const ratio = scrollHeight > clientHeight ? scrollTop / (scrollHeight - clientHeight) : 0;
      setScrollRatio(ratio);
    };
    editorDom.parentElement?.addEventListener('scroll', onScroll, { passive: true });
    return () => editorDom.parentElement?.removeEventListener('scroll', onScroll);
  }, [splitEnabled, editorInstance, splitMode]);

  useEffect(() => {
    if (!previewRef.current || splitMode !== 'preview') return;
    const el = previewRef.current;
    const { scrollHeight, clientHeight } = el;
    if (scrollHeight > clientHeight) {
      el.scrollTop = scrollRatio * (scrollHeight - clientHeight);
    }
  }, [scrollRatio, splitMode, previewHtml]);

  // ─── Keyboard shortcut: Cmd+\ toggles split ───
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        const newEnabled = !splitEnabled;
        setSplitEnabled(newEnabled);
        toggleSplitView?.(newEnabled);
      }
      // Cmd+Shift+\ toggles direction
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === '|') {
        e.preventDefault();
        const newDirection = splitDirection === 'horizontal' ? 'vertical' : 'horizontal';
        setSplitDirection(newDirection);
        // uiStore may not have this setter, skip if undefined
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [splitEnabled, splitDirection, toggleSplitView]);

  // ─── Available tabs for secondary editor ───
  const availableTabs = useMemo(() => {
    return tabs.filter(t => t.id !== activeTabId);
  }, [tabs, activeTabId]);

  const handleOpenInSecondary = useCallback((tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      setSecondaryEditor({
        path: tab.path,
        content: tab.content,
        name: tab.name,
      });
      setSplitMode('editor');
    }
  }, [tabs]);

  const handleToggleSplit = () => {
    const newEnabled = !splitEnabled;
    setSplitEnabled(newEnabled);
    toggleSplitView?.(newEnabled);
  };

  const handleToggleDirection = () => {
    const newDirection = splitDirection === 'horizontal' ? 'vertical' : 'horizontal';
    setSplitDirection(newDirection);
  };

  const handleToggleMode = () => {
    const modes: SplitMode[] = ['preview', 'source', 'editor'];
    const currentIndex = modes.indexOf(splitMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setSplitMode(modes[nextIndex]);
  };

  const sanitizedHtml = DOMPurify.sanitize(previewHtml, {
    ADD_ATTR: ['target', 'rel'],
    ADD_TAGS: ['iframe', 'video', 'audio'],
  });

  const containerClass = splitEnabled
    ? splitDirection === 'horizontal'
      ? 'split-active split-horizontal'
      : 'split-active split-vertical'
    : 'split-single';

  return (
    <div className="split-view-container" ref={containerRef}>
      <div className="split-toolbar">
        <button onClick={handleToggleSplit} className="split-toggle">
          {splitEnabled ? '关闭分屏' : '开启分屏'}
        </button>
        <span className="split-shortcut-hint">⌘\</span>

        {splitEnabled && (
          <>
            <button onClick={handleToggleDirection} className="split-direction-toggle">
              {splitDirection === 'horizontal' ? '⬇️ 垂直' : '⬆️ 水平'}
            </button>
            <button onClick={handleToggleMode} className="split-mode-toggle">
              {splitMode === 'preview' ? '📝 源码' : splitMode === 'source' ? '✏️ 编辑器' : '👁️ 预览'}
            </button>
            {splitMode === 'editor' && availableTabs.length > 0 && (
              <select
                className="split-tab-selector"
                value={secondaryState.path || ''}
                onChange={(e) => {
                  const selectedTab = tabs.find(t => t.path === e.target.value);
                  if (selectedTab) {
                    handleOpenInSecondary(selectedTab.id);
                  }
                }}
              >
                <option value="">选择文件...</option>
                {availableTabs.map(t => (
                  <option key={t.id} value={t.path}>{t.name}</option>
                ))}
              </select>
            )}
          </>
        )}
      </div>

      <div className={containerClass}>
        <div
          className="editor-pane"
          style={splitEnabled ? {
            [splitDirection === 'horizontal' ? 'width' : 'height']: `${splitPos}%`
          } as React.CSSProperties : undefined}
        >
          <MainEditor />
        </div>

        {splitEnabled && (
          <>
            <div
              className={`split-resize-handle split-resize-${splitDirection}`}
              onPointerDown={handleResizeStart}
              onPointerMove={handleResizeMove}
              onPointerUp={handleResizeEnd}
            >
              <div className="split-resize-indicator" />
            </div>

            <div
              className="editor-pane editor-pane-right"
              style={{
                [splitDirection === 'horizontal' ? 'width' : 'height']: `${100 - splitPos}%`
              } as React.CSSProperties}
            >
              {splitMode === 'preview' ? (
                <div
                  ref={previewRef}
                  className="split-preview-content"
                  dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
                />
              ) : splitMode === 'source' ? (
                <pre className="split-source-content">{sourceMarkdown}</pre>
              ) : (
                <div className="split-secondary-editor">
                  {secondaryState.path ? (
                    <div className="secondary-editor-wrapper">
                      <div className="secondary-editor-header">
                        <span className="secondary-editor-title">{secondaryState.name}</span>
                      </div>
                      <div className="secondary-editor-content">
                        {secondaryState.content.split('\n').map((line, i) => (
                          <div key={i} className="secondary-editor-line">{line || ' '}</div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="split-editor-placeholder">
                      <p>选择另一个文件在右侧编辑器中显示</p>
                      {availableTabs.length === 0 ? (
                        <p className="split-editor-hint">打开更多文件以启用双编辑器分屏</p>
                      ) : (
                        <select
                          className="split-tab-selector-large"
                          onChange={(e) => {
                            const selectedTab = tabs.find(t => t.path === e.target.value);
                            if (selectedTab) {
                              handleOpenInSecondary(selectedTab.id);
                            }
                          }}
                        >
                          <option value="">选择文件...</option>
                          {availableTabs.map(t => (
                            <option key={t.id} value={t.path}>{t.name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}