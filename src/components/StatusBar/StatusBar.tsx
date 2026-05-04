import { useEditorState } from '../../store/editorStore';
import { useFileStore } from '../../store/fileStore';
import './StatusBar.css';

export function StatusBar() {
  const { editorInstance } = useEditorState();
  const { currentPath } = useFileStore();

  if (!editorInstance) return null;

  const getStats = () => {
    const text = editorInstance.getText();
    const characters = text.length;
    const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
    const lines = text.split('\n').length;
    
    return { characters, words, lines };
  };

  const stats = getStats();
  const fileName = currentPath ? currentPath.split('/').pop() : 'Untitled';

  return (
    <div className="status-bar">
      <div className="status-bar-left">
        <span className="status-bar-item">{fileName}</span>
        <span className="status-bar-separator" />
        <span className="status-bar-item">
          {stats.words} words
        </span>
        <span className="status-bar-separator" />
        <span className="status-bar-item">
          {stats.characters} chars
        </span>
      </div>

      <div className="status-bar-right">
        <span className="status-bar-item">
          Ln {editorInstance.state.selection?.from || 0}
        </span>
        <span className="status-bar-separator" />
        <span className="status-bar-item">
          UTF-8
        </span>
      </div>
    </div>
  );
}