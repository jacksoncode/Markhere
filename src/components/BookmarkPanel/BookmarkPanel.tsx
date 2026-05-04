import { useState } from 'react';
import { useBookmarkStore } from '../../store/bookmarkStore';
import { useEditorState } from '../../store/editorStore';
import { useFileStore } from '../../store/fileStore';
import './BookmarkPanel.css';

interface BookmarkPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BookmarkPanel({ isOpen, onClose }: BookmarkPanelProps) {
  const { bookmarks, addBookmark, removeBookmark, clearBookmarks } = useBookmarkStore();
  const { editorInstance } = useEditorState();
  const { currentPath } = useFileStore();
  const [title, setTitle] = useState('');

  const handleAddBookmark = () => {
    if (!editorInstance || !currentPath || !title.trim()) return;

    const position = editorInstance.state.selection.from;

    addBookmark(currentPath, position, title.trim());
    setTitle('');
  };

  const handleGoToBookmark = (bookmark: { position: number }) => {
    if (!editorInstance) return;
    editorInstance.commands.setTextSelection(bookmark.position);
    editorInstance.commands.focus();
    onClose();
  };

  if (!isOpen) return null;

  const currentFileBookmarks = bookmarks.filter((b) => b.path === currentPath);

  return (
    <div className="bookmark-panel-overlay" onClick={onClose}>
      <div className="bookmark-panel" onClick={(e) => e.stopPropagation()}>
        <div className="bookmark-panel-header">
          <h3>书签</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="bookmark-add-section">
          <input
            type="text"
            className="bookmark-title-input"
            placeholder="书签标题..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <button
            className="add-bookmark-btn"
            onClick={handleAddBookmark}
            disabled={!title.trim() || !currentPath}
          >
            添加
          </button>
        </div>

        <div className="bookmark-list">
          {currentFileBookmarks.length === 0 ? (
            <p className="no-bookmarks">当前文档暂无书签</p>
          ) : (
            currentFileBookmarks.map((bookmark) => (
              <div key={bookmark.id} className="bookmark-item">
                <div
                  className="bookmark-info"
                  onClick={() => handleGoToBookmark(bookmark)}
                >
                  <span className="bookmark-title">{bookmark.title}</span>
                  <span className="bookmark-time">
                    {new Date(bookmark.createdAt).toLocaleString('zh-CN')}
                  </span>
                </div>
                <button
                  className="delete-btn"
                  onClick={() => removeBookmark(bookmark.id)}
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>

        {bookmarks.length > 0 && (
          <div className="bookmark-footer">
            <button className="clear-all-btn" onClick={clearBookmarks}>
              清除所有书签
            </button>
          </div>
        )}
      </div>
    </div>
  );
}