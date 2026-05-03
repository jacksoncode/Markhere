import { useState, useEffect } from 'react';
import { EditorProvider } from './components/Editor/EditorProvider';
import { MainEditor } from './components/Editor/MainEditor';
import { Sidebar } from './components/Sidebar/Sidebar';
import { Toolbar } from './components/Toolbar/Toolbar';
import { MenuBar } from './components/MenuBar/MenuBar';
import { useFileStore } from './store/fileStore';
import { useEditorState } from './store/editorStore';
import { FileService } from './services/FileService';
import { saveWorker } from './workers/SaveWorker';
import './styles/App.css';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { currentPath, setCurrentPath, setSavedContent } = useFileStore();
  const { editorInstance } = useEditorState();

  const handleSave = async () => {
    if (!currentPath) {
      const path = await FileService.newFile();
      if (!path) return;
      setCurrentPath(path);
    }

    const markdown = (editorInstance?.storage as any)?.markdown?.getMarkdown?.() || '';
    await saveWorker.immediateSave(async () => {
      await FileService.saveFile(currentPath!, markdown);
      setSavedContent(markdown);
    });
  };

  const handleNew = async () => {
    const path = await FileService.newFile();
    if (path) {
      setCurrentPath(path);
      editorInstance?.commands.clearContent();
      setSavedContent('');
    }
  };

  const handleOpen = async () => {
    const result = await FileService.openFile();
    if (result) {
      setCurrentPath(result.path);
      editorInstance?.commands.setContent(result.content);
      setSavedContent(result.content);
    }
  };

  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === 's') {
          e.preventDefault();
          handleSave();
        } else if (e.key === 'n') {
          e.preventDefault();
          handleNew();
        } else if (e.key === 'o') {
          e.preventDefault();
          handleOpen();
        }
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [currentPath, editorInstance]);

  return (
    <div className="app-container">
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <main className="main-content">
        <MenuBar />
        <Toolbar />
        <EditorProvider>
          <MainEditor />
        </EditorProvider>
      </main>
    </div>
  );
}

export default App;