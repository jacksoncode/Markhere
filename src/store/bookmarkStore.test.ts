import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useBookmarkStore } from '../store/bookmarkStore';

describe('useBookmarkStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    useBookmarkStore.setState({ bookmarks: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('addBookmark', () => {
    it('creates a bookmark with correct properties', () => {
      const { addBookmark } = useBookmarkStore.getState();

      addBookmark('/test/file.md', 42, 'Chapter 1');

      const state = useBookmarkStore.getState();
      expect(state.bookmarks).toHaveLength(1);

      const bookmark = state.bookmarks[0];
      expect(bookmark.path).toBe('/test/file.md');
      expect(bookmark.position).toBe(42);
      expect(bookmark.title).toBe('Chapter 1');
      expect(bookmark.id).toBeTruthy();
      expect(typeof bookmark.id).toBe('string');
      expect(bookmark.createdAt).toBeGreaterThan(0);
    });

    it('persists bookmarks to localStorage', () => {
      const { addBookmark } = useBookmarkStore.getState();

      addBookmark('/test/file.md', 0, 'Title');

      const stored = localStorage.getItem('markhere-bookmarks');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].path).toBe('/test/file.md');
      expect(parsed[0].title).toBe('Title');
    });

    it('adds multiple bookmarks in order', () => {
      const { addBookmark } = useBookmarkStore.getState();

      addBookmark('/test/a.md', 10, 'A');
      vi.advanceTimersByTime(100);
      addBookmark('/test/b.md', 20, 'B');
      vi.advanceTimersByTime(100);
      addBookmark('/test/c.md', 30, 'C');

      const state = useBookmarkStore.getState();
      expect(state.bookmarks).toHaveLength(3);
      expect(state.bookmarks[0].title).toBe('A');
      expect(state.bookmarks[1].title).toBe('B');
      expect(state.bookmarks[2].title).toBe('C');
    });
  });

  describe('removeBookmark', () => {
    it('deletes a bookmark by id', () => {
      const { addBookmark, removeBookmark } = useBookmarkStore.getState();

      addBookmark('/test/a.md', 10, 'A');
      const idA = useBookmarkStore.getState().bookmarks[0].id;
      vi.advanceTimersByTime(100);
      addBookmark('/test/b.md', 20, 'B');

      removeBookmark(idA);

      const state = useBookmarkStore.getState();
      expect(state.bookmarks).toHaveLength(1);
      expect(state.bookmarks[0].title).toBe('B');
    });

    it('does nothing when removing a non-existent id', () => {
      const { addBookmark, removeBookmark } = useBookmarkStore.getState();

      addBookmark('/test/file.md', 0, 'Title');
      removeBookmark('non-existent-id');

      expect(useBookmarkStore.getState().bookmarks).toHaveLength(1);
    });

    it('updates localStorage after removing', () => {
      const { addBookmark, removeBookmark } = useBookmarkStore.getState();

      addBookmark('/test/a.md', 10, 'A');
      const idA = useBookmarkStore.getState().bookmarks[0].id;
      vi.advanceTimersByTime(100);
      addBookmark('/test/b.md', 20, 'B');

      removeBookmark(idA);

      const stored = localStorage.getItem('markhere-bookmarks');
      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].title).toBe('B');
    });
  });

  describe('clearBookmarks', () => {
    it('removes all bookmarks', () => {
      const { addBookmark, clearBookmarks } = useBookmarkStore.getState();

      addBookmark('/test/a.md', 10, 'A');
      vi.advanceTimersByTime(100);
      addBookmark('/test/b.md', 20, 'B');
      vi.advanceTimersByTime(100);
      addBookmark('/test/c.md', 30, 'C');

      clearBookmarks();

      const state = useBookmarkStore.getState();
      expect(state.bookmarks).toEqual([]);
    });

    it('removes bookmarks from localStorage', () => {
      const { addBookmark, clearBookmarks } = useBookmarkStore.getState();

      addBookmark('/test/file.md', 0, 'Title');
      clearBookmarks();

      const stored = localStorage.getItem('markhere-bookmarks');
      expect(stored).toBeNull();
    });

    it('is safe to call on empty bookmarks', () => {
      const { clearBookmarks } = useBookmarkStore.getState();

      expect(() => clearBookmarks()).not.toThrow();
      expect(useBookmarkStore.getState().bookmarks).toEqual([]);
    });
  });
});
