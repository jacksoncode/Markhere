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
import { FileService } from './services/FileService';
import { useEditorState } from './store/editorStore';
import { useUIState } from './store/uiStore';
import { useAutoSaveStore } from './store/autoSaveStore';
import { initTheme } from './store/themeStore';
import { useCommands } from './components/CommandPalette';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
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

// Hoisted dynamic imports (#12)
let winApi: typeof import('@tauri-apps/api/window') | null = null;
const getWindowApi = async () => {
  if (!winApi) winApi = await import('@tauri-apps/api/window');
  return winApi;
};

const WelcomeDialogLazy = lazy(() => import('./components/Welcome/WelcomeDialog').then(m => ({ default: m.WelcomeDialog })));

function App() {
  const { focusMode, pomodoroEnabled, wordGoalEnabled, toggleSidebar, toggleFocusMode, toggleTypewriterMode, toggleSourceMode, togglePomodoro, toggleWordGoal } = useUIState();
  const { currentPath, setSavedContent, setCurrentPath } = useFileStore();
  const { editorInstance } = useEditorState();
  const { content, lastSaved, currentPath: savedPath } = useAutoSaveStore();
  const [showWelcome, setShowWelcome] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showWordCount, setShowWordCount] = useState(false);
  const [showQuickOpen, setShowQuickOpen] = useState(false);
  const [showTocPanel, setShowTocPanel] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingClose, setPendingClose] = useState(false);

  const checkUnsavedChanges = () => {
    const { hasUnsavedChanges } = useAutoSaveStore.getState();
    // Only flag as dirty if there's actual content worth saving
    const text = editorInstance?.getText() || '';
    return hasUnsavedChanges && text.trim().length > 0;
  };

  const closeWindow = async () => {
    const api = await getWindowApi();
    await api.getCurrentWindow().close();
  };

  const handleSaveBeforeClose = async () => {
    if (editorInstance) {
      const markdown = (editorInstance.storage as any)?.markdown?.getMarkdown?.() || '';
      if (currentPath) {
        await FileService.saveFile(currentPath, markdown);
        setSavedContent(markdown);
        useAutoSaveStore.getState().markSaved();
      } else {
        const newPath = await FileService.newFile();
        if (!newPath) return;
        await FileService.saveFile(newPath, markdown);
        setCurrentPath(newPath);
        setSavedContent(markdown);
        useAutoSaveStore.getState().markSaved();
      }
    }
    setShowUnsavedDialog(false);
    if (pendingClose) closeWindow();
  };

  const handleDiscardChanges = () => {
    useAutoSaveStore.getState().clearBackup();
    setShowUnsavedDialog(false);
    if (pendingClose) closeWindow();
  };

  const handleCancelClose = () => { setShowUnsavedDialog(false); setPendingClose(false); };

  // ---- useKeyboardShortcuts (#6) ----
  useKeyboardShortcuts({
    setShowCommandPalette, setShowQuickOpen, setShowWordCount,
    setPendingClose, setShowUnsavedDialog, setSavedContent,
    checkUnsavedChanges, editorInstance, currentPath,
  });

  // ---- Init & recover ----
  useEffect(() => {
    initTheme();
    if (content && lastSaved) setShowRecovery(true);
    // Show welcome dialog on first launch
    if (!localStorage.getItem('markhere-welcomed')) { setShowWelcome(true); localStorage.setItem('markhere-welcomed', '1'); }

    const h = (e: BeforeUnloadEvent) => { if (checkUnsavedChanges()) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, []);

  // ---- Close guard (macOS traffic light + Cmd+W + custom close button) ----
  useEffect(() => {
    // Listen for custom close events from TitleBar
    const onCustomClose = () => {
      if (checkUnsavedChanges()) {
        setPendingClose(true);
        setShowUnsavedDialog(true);
      } else {
        closeWindow().catch((err) => console.error('onCustomClose closeWindow failed:', err));
      }
    };
    window.addEventListener('markhere:close-requested', onCustomClose);

    let unlisten: (() => void) | undefined;
    getWindowApi().then(api => {
      api.getCurrentWindow().onCloseRequested(async (event) => {
        event.preventDefault();
        try {
          if (checkUnsavedChanges()) {
            setPendingClose(true);
            setShowUnsavedDialog(true);
          } else {
            await closeWindow();
          }
        } catch (err) {
          console.error('onCloseRequested handler failed:', err);
          // Force close as last resort
          try { await closeWindow(); } catch { /* truly stuck */ }
        }
      }).then(fn => { unlisten = fn; })
      .catch((err) => console.error('onCloseRequested registration failed:', err));
    }).catch((err) => console.error('getWindowApi failed:', err));

    return () => {
      window.removeEventListener('markhere:close-requested', onCustomClose);
      unlisten?.();
    };
  }, []);

  const handleRecover = () => {
    setShowRecovery(false);
    if (savedPath) setCurrentPath(savedPath);
    if (editorInstance && content) { editorInstance.commands.setContent(content); setSavedContent(content); }
  };
  const handleDiscard = () => setShowRecovery(false);

  const commands = useCommands(
    () => editorInstance?.commands.clearNodes(),
    () => {},
    () => { toggleSidebar(); toggleFocusMode(); toggleTypewriterMode(); toggleSourceMode(); togglePomodoro(); toggleWordGoal(); },
    () => { editorInstance?.chain().focus().toggleBold().run(); editorInstance?.chain().focus().toggleItalic().run(); },
  );

  return (
    <ErrorBoundary>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <div className={`app-container app-with-titlebar auto-hide-ui ${focusMode ? 'focus-mode-active' : ''}`}>
        {showWelcome && <Suspense fallback={null}><WelcomeDialogLazy onClose={() => setShowWelcome(false)} /></Suspense>}
        {showRecovery && <RecoveryDialog onRecover={handleRecover} onDiscard={handleDiscard} />}
        <TitleBar /><AutoHideUI /><SidebarNew />
        <main id="main-content" className="main-content">
          <TabBar /><Toolbar />
          <EditorProvider><MainEditor /><TypewriterMode /></EditorProvider>
        </main>
        <StatusBar />
        <Suspense fallback={null}><SearchPanel /></Suspense>
        <Suspense fallback={null}><CommandPalette isOpen={showCommandPalette} onClose={() => setShowCommandPalette(false)} commands={commands} /></Suspense>
        <Suspense fallback={null}><FocusMode /></Suspense>
        <Suspense fallback={null}><AIAssistant /></Suspense>
        {wordGoalEnabled && <Suspense fallback={null}><WordGoalProgress /></Suspense>}
        {pomodoroEnabled && <Suspense fallback={null}><PomodoroTimer /></Suspense>}
        <LinkValidator />
        <Suspense fallback={null}><WordCountDialog isOpen={showWordCount} onClose={() => setShowWordCount(false)} /></Suspense>
        <Suspense fallback={null}><QuickOpenPanel isOpen={showQuickOpen} onClose={() => setShowQuickOpen(false)} /></Suspense>
        <Suspense fallback={null}><TocPanel isOpen={showTocPanel} onClose={() => setShowTocPanel(false)} /></Suspense>
        {showUnsavedDialog && <UnsavedChangesDialog onSave={handleSaveBeforeClose} onDiscard={handleDiscardChanges} onCancel={handleCancelClose} />}
        <NotificationContainer />
      </div>
    </ErrorBoundary>
  );
}

export default App;
