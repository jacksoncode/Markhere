import { useEffect, useState, lazy, Suspense } from 'react';
import { EditorProvider } from './components/Editor/EditorProvider';
import { MainEditor } from './components/Editor/MainEditor';
import { SidebarNew } from './components/Sidebar/SidebarNew';
import { Toolbar } from './components/Toolbar/Toolbar';
import { TitleBar } from './components/TitleBar/TitleBar';
import { StatusBar } from './components/StatusBar/StatusBar';
import { AutoHideUI } from './components/AutoHideUI/AutoHideUI';
import { RecoveryDialog } from './components/RecoveryDialog/RecoveryDialog';
import { LinkValidator } from './components/LinkValidator';
import { TabBar } from './components/TabBar';
import { TypewriterMode } from './components/TypewriterMode/TypewriterMode';
import { UnsavedChangesDialog } from './components/UnsavedChangesDialog';
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary';
import { NotificationContainer } from './components/Notification/Notification';
import { useFileStore } from './store/fileStore';
import { useEditorState } from './store/editorStore';
import { useUIState } from './store/uiStore';
import { useAutoSaveStore } from './store/autoSaveStore';
import { initTheme } from './store/themeStore';
import { useCommands } from './components/CommandPalette';
import './styles/App.css';
import './styles/theme.css';

// Lazy-loaded non-critical components
const SearchPanel = lazy(() => import('./components/Search/SearchPanel').then(m => ({ default: m.SearchPanel })));
const CommandPalette = lazy(() => import('./components/CommandPalette/CommandPalette').then(m => ({ default: m.CommandPalette })));
const FocusMode = lazy(() => import('./components/FocusMode/FocusMode').then(m => ({ default: m.FocusMode })));
const AIAssistant = lazy(() => import('./components/AIAssistant/AIAssistant').then(m => ({ default: m.AIAssistant })));
const WordGoalProgress = lazy(() => import('./components/WordGoalProgress').then(m => ({ default: m.WordGoalProgress })));
const PomodoroTimer = lazy(() => import('./components/PomodoroTimer').then(m => ({ default: m.PomodoroTimer })));
const WordCountDialog = lazy(() => import('./components/WordCountDialog/WordCountDialog').then(m => ({ default: m.WordCountDialog })));
const QuickOpenPanel = lazy(() => import('./components/QuickOpen/QuickOpenPanel').then(m => ({ default: m.QuickOpenPanel })));
const TocPanel = lazy(() => import('./components/TocPanel/TocPanel').then(m => ({ default: m.TocPanel })));

function App() {
  const { focusMode, pomodoroEnabled, wordGoalEnabled, toggleSidebar, toggleFocusMode, toggleTypewriterMode, toggleSourceMode, togglePomodoro, toggleWordGoal } = useUIState();
  const { currentPath, setSavedContent, setCurrentPath } = useFileStore();
  const { editorInstance } = useEditorState();
  const { content, lastSaved, currentPath: savedPath } = useAutoSaveStore();
  const [showRecovery, setShowRecovery] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showWordCount, setShowWordCount] = useState(false);
  const [showQuickOpen, setShowQuickOpen] = useState(false);
  const [showTocPanel, setShowTocPanel] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingClose, setPendingClose] = useState(false);

  const checkUnsavedChanges = () => {
    const { hasUnsavedChanges } = useAutoSaveStore.getState();
    return hasUnsavedChanges;
  };

  const handleSaveBeforeClose = async () => {
    if (editorInstance) {
      const markdown = (editorInstance.storage as any)?.markdown?.getMarkdown?.() || '';
      if (currentPath) {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('save_file', { path: currentPath, content: markdown });
        setSavedContent(markdown);
        useAutoSaveStore.getState().markSaved();
      } else {
        const { save } = await import('@tauri-apps/plugin-dialog');
        const { invoke } = await import('@tauri-apps/api/core');
        const filePath = await save({
          filters: [{ name: 'Markdown', extensions: ['md'] }],
          defaultPath: 'Untitled.md'
        });
        if (filePath) {
          await invoke('save_file', { path: filePath, content: markdown });
          setCurrentPath(filePath);
          setSavedContent(markdown);
          useAutoSaveStore.getState().markSaved();
        } else {
          return;
        }
      }
    }
    setShowUnsavedDialog(false);
    if (pendingClose) {
      import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
        getCurrentWindow().close();
      });
    }
  };

  const handleDiscardChanges = () => {
    useAutoSaveStore.getState().clearBackup();
    setShowUnsavedDialog(false);
    if (pendingClose) {
      import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
        getCurrentWindow().close();
      });
    }
  };

  const handleCancelClose = () => {
    setShowUnsavedDialog(false);
    setPendingClose(false);
  };

  useEffect(() => {
    initTheme();
    if (content && lastSaved) {
      setShowRecovery(true);
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (checkUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
      getCurrentWindow().onCloseRequested((event) => {
        if (checkUnsavedChanges()) {
          event.preventDefault();
          setPendingClose(true);
          setShowUnsavedDialog(true);
        }
      }).then((fn) => { unlisten = fn; })
        .catch((e) => { console.error('[Markhere] onCloseRequested failed:', e); });
    }).catch((e) => { console.error('[Markhere] Failed to load window API:', e); });

    return () => { unlisten?.(); };
  }, []);

  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      if (isMod && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
      if (isMod && e.key === 'p') {
        e.preventDefault();
        setShowQuickOpen(true);
      }
      if (isMod && e.key === 's') {
        e.preventDefault();
        if (editorInstance && currentPath) {
          const markdown = (editorInstance.storage as any)?.markdown?.getMarkdown?.() || '';
          setSavedContent(markdown);
        }
      }
      if (isMod && e.shiftKey && e.key === 'v') {
        e.preventDefault();
        navigator.clipboard.readText().then(text => {
          editorInstance?.chain().focus().insertContent(text).run();
        });
      }
      if (isMod && e.key === 'w') {
        e.preventDefault();
        if (checkUnsavedChanges()) {
          setPendingClose(true);
          setShowUnsavedDialog(true);
        } else {
          import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
            getCurrentWindow().close();
          });
        }
      }
      if (isMod && e.shiftKey && e.key === 'ArrowUp') {
        e.preventDefault();
        let currentLevel = 0;
        for (let i = 1; i <= 6; i++) {
          if (editorInstance?.isActive('heading', { level: i })) {
            currentLevel = i;
            break;
          }
        }
        const newLevel = currentLevel === 0 ? 6 : currentLevel === 1 ? 1 : currentLevel - 1;
        editorInstance?.chain().focus().toggleHeading({ level: newLevel as 1|2|3|4|5|6 }).run();
      }
      if (isMod && e.shiftKey && e.key === 'ArrowDown') {
        e.preventDefault();
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
      }
      if (isMod && e.key === 'Home') {
        e.preventDefault();
        editorInstance?.chain().focus().setTextSelection({ from: 0, to: 0 }).run();
      }
      if (isMod && e.key === 'End') {
        e.preventDefault();
        const docSize = editorInstance?.state.doc.content.size || 0;
        editorInstance?.chain().focus().setTextSelection({ from: docSize, to: docSize }).run();
      }
      if (isMod && e.key === 'j') {
        e.preventDefault();
        const { from, to } = editorInstance?.state.selection || { from: 0, to: 0 };
        if (from !== to) {
          editorInstance?.commands.scrollIntoView();
        }
      }
      if (isMod && e.shiftKey && e.key === 'd') {
        e.preventDefault();
        const { from } = editorInstance?.state.selection || { from: 0 };
        const doc = editorInstance?.state.doc;
        if (doc) {
          const $pos = doc.resolve(from);
          const textNode = $pos.nodeBefore || $pos.nodeAfter;
          if (textNode && textNode.isText) {
            const start = from - (textNode.text?.length || 0);
            editorInstance?.chain().focus().deleteRange({ from: start, to: from }).run();
          }
        }
      }
      if (isMod && e.key === 'e') {
        e.preventDefault();
        const { from } = editorInstance?.state.selection || { from: 0 };
        const doc = editorInstance?.state.doc;
        if (doc) {
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
          }
        }
      }
      if (isMod && e.shiftKey && e.key === 'c') {
        e.preventDefault();
        setShowWordCount(true);
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [currentPath, editorInstance, setSavedContent, setShowWordCount, setShowQuickOpen, setShowTocPanel]);

  const handleRecover = () => {
    setShowRecovery(false);
    if (savedPath) {
      setCurrentPath(savedPath);
    }
    if (editorInstance && content) {
      editorInstance.commands.setContent(content);
      setSavedContent(content);
    }
  };

  const handleDiscard = () => {
    setShowRecovery(false);
  };

  const commands = useCommands(
    () => editorInstance?.commands.clearNodes(),
    () => {},
    () => {
      toggleSidebar();
      toggleFocusMode();
      toggleTypewriterMode();
      toggleSourceMode();
      togglePomodoro();
      toggleWordGoal();
    },
    () => {
      editorInstance?.chain().focus().toggleBold().run();
      editorInstance?.chain().focus().toggleItalic().run();
    }
  );

  return (
    <ErrorBoundary>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <div className={`app-container app-with-titlebar auto-hide-ui ${focusMode ? 'focus-mode-active' : ''}`}>
        {showRecovery && (
          <RecoveryDialog onRecover={handleRecover} onDiscard={handleDiscard} />
        )}
        <TitleBar />
        <AutoHideUI />
        <SidebarNew />
        <main id="main-content" className="main-content">
          <TabBar />
          <Toolbar />
          <EditorProvider>
            <MainEditor />
            <TypewriterMode />
          </EditorProvider>
        </main>
        <StatusBar />
        <Suspense fallback={null}>
          <SearchPanel />
        </Suspense>
        <Suspense fallback={null}>
          <CommandPalette
            isOpen={showCommandPalette}
            onClose={() => setShowCommandPalette(false)}
            commands={commands}
          />
        </Suspense>
        <Suspense fallback={null}>
          <FocusMode />
        </Suspense>
        <Suspense fallback={null}>
          <AIAssistant />
        </Suspense>
        {wordGoalEnabled && (
          <Suspense fallback={null}>
            <WordGoalProgress />
          </Suspense>
        )}
        {pomodoroEnabled && (
          <Suspense fallback={null}>
            <PomodoroTimer />
          </Suspense>
        )}
        <LinkValidator />
        <Suspense fallback={null}>
          <WordCountDialog
            isOpen={showWordCount}
            onClose={() => setShowWordCount(false)}
          />
        </Suspense>
        <Suspense fallback={null}>
          <QuickOpenPanel
            isOpen={showQuickOpen}
            onClose={() => setShowQuickOpen(false)}
          />
        </Suspense>
        <Suspense fallback={null}>
          <TocPanel
            isOpen={showTocPanel}
            onClose={() => setShowTocPanel(false)}
          />
        </Suspense>
        {showUnsavedDialog && (
          <UnsavedChangesDialog
            onSave={handleSaveBeforeClose}
            onDiscard={handleDiscardChanges}
            onCancel={handleCancelClose}
          />
        )}
        <NotificationContainer />
      </div>
    </ErrorBoundary>
  );
}

export default App;
