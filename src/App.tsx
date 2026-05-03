import { useState } from 'react';
import { EditorProvider } from './components/Editor/EditorProvider';
import { MainEditor } from './components/Editor/MainEditor';
import { Sidebar } from './components/Sidebar/Sidebar';
import { Toolbar } from './components/Toolbar/Toolbar';
import './styles/App.css';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="app-container">
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <main className="main-content">
        <Toolbar />
        <EditorProvider>
          <MainEditor />
        </EditorProvider>
      </main>
    </div>
  );
}

export default App;