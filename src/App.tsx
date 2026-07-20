import { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { EditorProvider } from './components/Editor/EditorProvider';
import { SplitView } from './components/SplitView/SplitView';
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
import { useCommands, CommandPalette } from './components/CommandPalette/CommandPalette';
import { CommentService } from './services/CommentService';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useCustomShortcuts } from './hooks/useCustomShortcuts';
import { UpdateDialog } from './components/UpdateDialog/UpdateDialog';
import { useExternalFileChange } from './hooks/useExternalFileChange';
import { FileChangedDialog } from './components/FileChangedDialog/FileChangedDialog';
import './styles/App.css';
import './styles/theme.css';

// Lazy-loaded non-critical components
const SearchPanel = lazy(() => import('./components/Search/SearchPanel').then(m => ({ default: m.SearchPanel })));

const FocusMode = lazy(() => import('./components/FocusMode/FocusMode').then(m => ({ default: m.FocusMode })));
const AIAssistant = lazy(() => import('./components/AIAssistant/AIAssistant').then(m => ({ default: m.AIAssistant })));
const WordGoalProgress = lazy(() => import('./components/WordGoalProgress').then(m => ({ default: m.WordGoalProgress })));
const PomodoroTimer = lazy(() => import('./components/PomodoroTimer').then(m => ({ default: m.PomodoroTimer })));
const WordCountDialog = lazy(() => import('./components/WordCountDialog/WordCountDialog').then(m => ({ default: m.WordCountDialog })));
const QuickOpenPanel = lazy(() => import('./components/QuickOpen/QuickOpenPanel').then(m => ({ default: m.QuickOpenPanel })));
const TocPanel = lazy(() => import('./components/TocPanel/TocPanel').then(m => ({ default: m.TocPanel })));
const ShortcutSettingsLazy = lazy(() => import('./components/ShortcutSettings/ShortcutSettings').then(m => ({ default: m.ShortcutSettings })));

// Hoisted dynamic imports (#12)
let winApi: typeof import('@tauri-apps/api/window') | null = null;
const getWindowApi = async () => {
  if (!winApi) winApi = await import('@tauri-apps/api/window');
  return winApi;
};

const WelcomeDialogLazy = lazy(() => import('./components/Welcome/WelcomeDialog').then(m => ({ default: m.WelcomeDialog })));
const CoverEditor = lazy(() => import('./components/Cover/CoverEditor').then(m => ({ default: m.CoverEditor })));
const SlideshowView = lazy(() => import('./components/Slideshow/SlideshowView').then(m => ({ default: m.SlideshowView })));
const PublishDialog = lazy(() => import('./components/Publish/PublishDialog').then(m => ({ default: m.PublishDialog })));
const MergeDialog = lazy(() => import('./components/Merge/MergeDialog').then(m => ({ default: m.MergeDialog })));
const CommentPanel = lazy(() => import('./components/Comment/CommentPanel').then(m => ({ default: m.CommentPanel })));
const EncryptionDialog = lazy(() => import('./components/Encryption/EncryptionDialog').then(m => ({ default: m.EncryptionDialog })));
import './styles/pos-highlight.css';

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
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
const [showShortcutSettings, setShowShortcutSettings] = useState(false);
  const [showCoverEditor, setShowCoverEditor] = useState(false);
  const [showSlideshow, setShowSlideshow] = useState(false);
  const [posHighlightEnabled, setPosHighlightEnabled] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [showMerge, setShowMerge] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showEncryption, setShowEncryption] = useState(false);
  const [, setPendingClose] = useState(false);
  
  const commentService = new CommentService(currentPath || 'default');
  
  const getContent = () => {
    const ei = useEditorState.getState().editorInstance;
    return ei?.getText?.() || '';
  };
  
  const handleAddComment = (text: string) => {
    commentService.addThread(0, 0, text, 'User');
  };
  
  const handleResolveComment = (threadId: string) => {
    commentService.resolveThread(threadId);
  };
  
  const handleDeleteComment = (threadId: string) => {
    commentService.deleteThread(threadId);
  };
  
  const handleMerge = (mergedContent: string) => {
    editorInstance?.commands.setContent(mergedContent);
  }; // only the setter is used; read via pendingCloseRef

  // Stable refs so the close-guard useEffect ([],[]) closure always has fresh values
  const closeWindowRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const checkUnsavedRef = useRef<() => boolean>(() => false);
  const pendingCloseRef = useRef(false);

  // External file-change detection (reload / keep prompt)
  const externalChange = useExternalFileChange();

  const checkUnsavedChanges = () => {
    const { hasUnsavedChanges } = useAutoSaveStore.getState();
    const ei = useEditorState.getState().editorInstance;
    const text = ei?.getText() || '';
    return hasUnsavedChanges && text.trim().length > 0;
  };
  checkUnsavedRef.current = checkUnsavedChanges;

  const closeWindow = async () => {
    const api = await getWindowApi();
    await api.getCurrentWindow().destroy();
  };
  closeWindowRef.current = closeWindow;

  const handleSaveBeforeClose = async () => {
    const ei = useEditorState.getState().editorInstance;
    if (ei) {
      const markdown = (ei.storage as any)?.markdown?.getMarkdown?.() || '';
      const cp = useFileStore.getState().currentPath;
      if (cp) {
        await FileService.saveFile(cp, markdown);
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
    if (pendingCloseRef.current) closeWindowRef.current().catch(console.error);
    pendingCloseRef.current = false;
  };

  const handleDiscardChanges = () => {
    useAutoSaveStore.getState().clearBackup();
    setShowUnsavedDialog(false);
    if (pendingCloseRef.current) closeWindowRef.current().catch(console.error);
    pendingCloseRef.current = false;
  };

  const handleCancelClose = () => { setShowUnsavedDialog(false); setPendingClose(false); pendingCloseRef.current = false; };

  // ---- useKeyboardShortcuts (#6) ----
  useKeyboardShortcuts({
    setShowCommandPalette, setShowQuickOpen, setShowWordCount,
    setPendingClose, setShowUnsavedDialog, setSavedContent,
    checkUnsavedChanges, editorInstance, currentPath,
  });

  // ---- Custom shortcuts (P2-5) ----
  useCustomShortcuts({
    setShowCommandPalette,
    setShowQuickOpen,
    setShowWordCount,
    setShowShortcutSettings,
    toggleSidebar,
    toggleFocusMode,
    toggleTypewriterMode,
    toggleSourceMode,
    editorInstance,
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

  // ---- Close guard (OS-native close button  + Cmd+W + custom close button) ----
  useEffect(() => {
    const onCustomClose = () => {
      if (checkUnsavedRef.current()) {
        pendingCloseRef.current = true;
        setPendingClose(true);
        setShowUnsavedDialog(true);
      } else {
        closeWindowRef.current().catch(err => console.error('[App] closeWindow failed:', err));
      }
    };
    window.addEventListener('markhere:close-requested', onCustomClose);

    let unlisten: (() => void) | undefined;
    getWindowApi().then(api => {
      const currentWindow = api.getCurrentWindow();
      currentWindow.onCloseRequested(async (event) => {
        event.preventDefault();
        if (checkUnsavedRef.current()) {
          pendingCloseRef.current = true;
          setPendingClose(true);
          setShowUnsavedDialog(true);
        } else {
          await closeWindowRef.current();
        }
      }).then(fn => { unlisten = fn; })
      .catch((err) => console.error('[App] onCloseRequested registration failed:', err));
    }).catch((err) => console.error('[App] getWindowApi failed:', err));

    return () => {
      window.removeEventListener('markhere:close-requested', onCustomClose);
      unlisten?.();
    };
  }, []);

  const handleRecover = () => {
    setShowRecovery(false);
    if (!savedPath) return;
    setCurrentPath(savedPath);
    if (editorInstance && content && typeof content === 'string') {
      editorInstance.commands.setContent(content);
      setSavedContent(content);
    }
  };
  const handleDiscard = () => setShowRecovery(false);

  const commands = useCommands(
    () => editorInstance?.commands.clearNodes(),
    () => {},
    () => { toggleSidebar(); toggleFocusMode(); toggleTypewriterMode(); toggleSourceMode(); togglePomodoro(); toggleWordGoal(); setShowShortcutSettings(true); },
    () => { editorInstance?.chain().focus().toggleBold().run(); editorInstance?.chain().focus().toggleItalic().run(); },
    () => setShowCoverEditor(true),
    () => setShowSlideshow(true),
    () => setPosHighlightEnabled(!posHighlightEnabled),
    () => setShowPublish(true),
    () => setShowMerge(true),
    () => setShowComments(true),
    () => {},
    () => setShowEncryption(true),
  );

  return (
    <ErrorBoundary>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <div className={`app-container app-with-titlebar auto-hide-ui ${focusMode ? 'focus-mode-active' : ''}`}>
        {showWelcome && <Suspense fallback={null}><WelcomeDialogLazy onClose={() => setShowWelcome(false)} /></Suspense>}
        {showRecovery && <RecoveryDialog onRecover={handleRecover} onDiscard={handleDiscard} />}
        <TitleBar onCheckUpdates={() => setShowUpdateDialog(true)} /><AutoHideUI /><SidebarNew />
        <main id="main-content" className="main-content">
          <TabBar /><Toolbar />
          <EditorProvider><SplitView /><TypewriterMode /></EditorProvider>
        </main>
        <StatusBar />
        <Suspense fallback={null}><SearchPanel /></Suspense>
        <CommandPalette isOpen={showCommandPalette} onClose={() => setShowCommandPalette(false)} commands={commands} />
        <Suspense fallback={null}><FocusMode /></Suspense>
        <Suspense fallback={null}><AIAssistant /></Suspense>
        {wordGoalEnabled && <Suspense fallback={null}><WordGoalProgress /></Suspense>}
        {pomodoroEnabled && <Suspense fallback={null}><PomodoroTimer /></Suspense>}
        <LinkValidator />
        <Suspense fallback={null}><WordCountDialog isOpen={showWordCount} onClose={() => setShowWordCount(false)} /></Suspense>
        <Suspense fallback={null}><QuickOpenPanel isOpen={showQuickOpen} onClose={() => setShowQuickOpen(false)} /></Suspense>
        <Suspense fallback={null}><TocPanel isOpen={showTocPanel} onClose={() => setShowTocPanel(false)} /></Suspense>
        <Suspense fallback={null}><CoverEditor isOpen={showCoverEditor} onClose={() => setShowCoverEditor(false)} onApply={() => setShowCoverEditor(false)} /></Suspense>
        <Suspense fallback={null}><SlideshowView isOpen={showSlideshow} onClose={() => setShowSlideshow(false)} /></Suspense>
        <Suspense fallback={null}><PublishDialog isOpen={showPublish} onClose={() => setShowPublish(false)} content={getContent()} /></Suspense>
        <Suspense fallback={null}><MergeDialog isOpen={showMerge} onClose={() => setShowMerge(false)} documents={['Document 1', 'Document 2']} onMerge={handleMerge} /></Suspense>
        <Suspense fallback={null}><CommentPanel isOpen={showComments} onClose={() => setShowComments(false)} commentService={commentService} onAddComment={handleAddComment} onResolveComment={handleResolveComment} onDeleteComment={handleDeleteComment} /></Suspense>
        <Suspense fallback={null}><EncryptionDialog isOpen={showEncryption} onClose={() => setShowEncryption(false)} /></Suspense>
        {showUnsavedDialog && <UnsavedChangesDialog onSave={handleSaveBeforeClose} onDiscard={handleDiscardChanges} onCancel={handleCancelClose} />}
        {externalChange.prompting && <FileChangedDialog onReload={externalChange.reload} onKeep={externalChange.dismiss} />}
        {showUpdateDialog && <UpdateDialog onClose={() => setShowUpdateDialog(false)} />}
        <Suspense fallback={null}><ShortcutSettingsLazy isOpen={showShortcutSettings} onClose={() => setShowShortcutSettings(false)} /></Suspense>
        <NotificationContainer />
      </div>
    </ErrorBoundary>
  );
}

export default App;
