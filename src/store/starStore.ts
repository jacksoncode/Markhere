import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface StarState {
  starred: string[]; // file paths
  toggle: (path: string) => void;
  isStarred: (path: string) => boolean;
  getAll: () => string[];
}

export const useStarStore = create<StarState>()(
  persist(
    (set, get) => ({
      starred: [],
      toggle: (path) => set(s => ({
        starred: s.starred.includes(path) ? s.starred.filter(p => p !== path) : [...s.starred, path],
      })),
      isStarred: (path) => get().starred.includes(path),
      getAll: () => get().starred,
    }),
    { name: 'markhere-stars' }
  )
);
