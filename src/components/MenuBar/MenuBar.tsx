import { useFileStore } from '../../store/fileStore';
import { useEditorState } from '../../store/editorStore';
import { FileService } from '../../services/FileService';
import { saveWorker } from '../../workers/SaveWorker';
import { ExportMenu } from '../Export/ExportMenu';
import { ThemeToggle } from '../Theme/ThemeToggle';
import './MenuBar.css';

export function MenuBar() {
  const { currentPath, fileName, isNewFile, setCurrentPath, setSavedContent, savedContent } = useFileStore();
  const { editorInstance, content } = useEditorState();

  const handleNewFile = async () => {
    const path = await FileService.newFile();
    if (path) {
      setCurrentPath(path);
      editorInstance?.commands.clearContent();
      setSavedContent('');
    }
  };

  const handleOpenFile = async () => {
    const result = await FileService.openFile();
    if (result) {
      setCurrentPath(result.path);
      editorInstance?.commands.setContent(result.content);
      setSavedContent(result.content);
    }
  };

  const handleSaveFile = async () => {
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

  const handlePrint = () => {
    window.print();
  };

  const isDirty = content !== savedContent;

  return (
    <header className="menu-bar">
      <div className="file-info">
        <span className="file-name">{fileName || '未命名'}</span>
        {!isNewFile && isDirty && (
          <span className="dirty-indicator">*</span>
        )}
      </div>
      <div className="menu-actions">
        <button onClick={handleNewFile} title="新建文件 (Cmd+N)">新建</button>
        <button onClick={handleOpenFile} title="打开文件 (Cmd+O)">打开</button>
        <button onClick={handleSaveFile} title="保存文件 (Cmd+S)">保存</button>
        <ExportMenu />
        <button onClick={handlePrint} title="打印 (Cmd+P)">打印</button>
        <ThemeToggle />
      </div>
    </header>
  );
}