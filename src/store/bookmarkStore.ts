import { create } from 'zustand';

export interface Bookmark {
  id: string;
  path: string;
  position: number;
  title: string;
  createdAt: number;
}

interface BookmarkState {
  bookmarks: Bookmark[];
  addBookmark: (path: string, position: number, title: string) => void;
  removeBookmark: (id: string) => void;
  clearBookmarks: () => void;
}

export const useBookmarkStore = create<BookmarkState>((set) => ({
  bookmarks: JSON.parse(localStorage.getItem('markhere-bookmarks') || '[]'),

  addBookmark: (path: string, position: number, title: string) => {
    set((state: BookmarkState) => {
      const bookmark: Bookmark = {
        id: Date.now().toString(),
        path,
        position,
        title,
        createdAt: Date.now(),
      };
      const bookmarks = [...state.bookmarks, bookmark];
      localStorage.setItem('markhere-bookmarks', JSON.stringify(bookmarks));
      return { bookmarks };
    });
  },

  removeBookmark: (id: string) => {
    set((state: BookmarkState) => {
      const bookmarks = state.bookmarks.filter((b: Bookmark) => b.id !== id);
      localStorage.setItem('markhere-bookmarks', JSON.stringify(bookmarks));
      return { bookmarks };
    });
  },

  clearBookmarks: () => {
    set({ bookmarks: [] });
    localStorage.removeItem('markhere-bookmarks');
  },
}));