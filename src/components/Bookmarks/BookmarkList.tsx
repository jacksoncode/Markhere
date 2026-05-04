import { useBookmarkStore, Bookmark } from '../../store/bookmarkStore';
import './BookmarkList.css';

export function BookmarkList({ onNavigate }: { onNavigate: (position: number) => void }) {
  const { bookmarks, removeBookmark, clearBookmarks } = useBookmarkStore();

  if (bookmarks.length === 0) {
    return <div className="bookmark-empty">暂无书签</div>;
  }

  return (
    <div className="bookmark-list">
      <div className="bookmark-header">
        <span>书签 ({bookmarks.length})</span>
        <button onClick={clearBookmarks} className="clear-btn">清空</button>
      </div>

      <ul>
        {bookmarks.map((bookmark: Bookmark) => (
          <li key={bookmark.id} className="bookmark-item">
            <div className="bookmark-info" onClick={() => onNavigate(bookmark.position)}>
              <span className="bookmark-title">{bookmark.title}</span>
              <span className="bookmark-time">{new Date(bookmark.createdAt).toLocaleDateString()}</span>
            </div>
            <button onClick={() => removeBookmark(bookmark.id)} className="remove-btn">×</button>
          </li>
        ))}
      </ul>
    </div>
  );
}