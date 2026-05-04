import { useEffect, useState } from 'react';
import { EditorProvider } from './components/Editor/EditorProvider';
import { MainEditor } from './components/Editor/MainEditor';
import { SidebarNew } from './components/Sidebar/SidebarNew';
import { Toolbar } from './components/Toolbar/Toolbar';
import { TitleBar } from './components/TitleBar/TitleBar';
import { StatusBar } from './components/StatusBar/StatusBar';
import { SearchPanel } from './components/Search/SearchPanel';
import { CommandPalette, useCommands } from './components/CommandPalette';
import { FocusMode } from './components/FocusMode/FocusMode';
import { TypewriterMode } from './components/TypewriterMode/TypewriterMode';
import { AutoHideUI } from './components/AutoHideUI/AutoHideUI';
import { RecoveryDialog } from './components/RecoveryDialog/RecoveryDialog';
import { AIAssistant } from './components/AIAssistant/AIAssistant';
import { WordGoalProgress } from './components/WordGoalProgress';
import { PomodoroTimer } from './components/PomodoroTimer';
import { LinkValidator } from './components/LinkValidator';
import { TabBar } from './components/TabBar';
import { useFileStore } from './store/fileStore';
import { useEditorState } from './store/editorStore';
import { useUIState } from './store/uiStore';
import { useAutoSaveStore } from './store/autoSaveStore';
import { initTheme } from './store/themeStore';
import './styles/App.css';
import './styles/theme.css';

function App() {
  const { focusMode, pomodoroEnabled, wordGoalEnabled, toggleSidebar, toggleFocusMode, toggleTypewriterMode, toggleSourceMode, togglePomodoro, toggleWordGoal } = useUIState();
  const { currentPath, setSavedContent, setCurrentPath } = useFileStore();
  const { editorInstance } = useEditorState();
  const { content, lastSaved, currentPath: savedPath } = useAutoSaveStore();
  const [showRecovery, setShowRecovery] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  useEffect(() => {
    initTheme();
    if (content && lastSaved) {
      setShowRecovery(true);
    }
  }, []);

  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (editorInstance && currentPath) {
          const markdown = (editorInstance.storage as any)?.markdown?.getMarkdown?.() || '';
          setSavedContent(markdown);
        }
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [currentPath, editorInstance, setSavedContent]);

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
    <div className={`app-container app-with-titlebar auto-hide-ui ${focusMode ? 'focus-mode-active' : ''}`}>
      {showRecovery && (
        <RecoveryDialog onRecover={handleRecover} onDiscard={handleDiscard} />
      )}
      <TitleBar />
      <AutoHideUI />
      <SidebarNew />
      <main className="main-content">
        <TabBar />
        <Toolbar />
        <EditorProvider>
          <MainEditor />
          <TypewriterMode />
        </EditorProvider>
      </main>
      <StatusBar />
      <SearchPanel />
      <CommandPalette 
        isOpen={showCommandPalette} 
        onClose={() => setShowCommandPalette(false)} 
        commands={commands}
      />
      <FocusMode />
      <AIAssistant />
      {wordGoalEnabled && <WordGoalProgress />}
      {pomodoroEnabled && <PomodoroTimer />}
      <LinkValidator />
    </div>
  );
}

export default App;