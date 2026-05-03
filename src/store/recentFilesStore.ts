import { create } from 'zustand';

interface RecentFile {
  path: string;
  name: string;
  lastOpened: number;
}

interface RecentFilesState {
  files: RecentFile[];
  maxFiles: number;
  addFile: (path: string, name: string) => void;
  removeFile: (path: string) => void;
  clearFiles: () => void;
}

const STORAGE_KEY = 'recent_files';

function loadRecentFiles(): RecentFile[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveRecentFiles(files: RecentFile[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
}

export const useRecentFilesStore = create<RecentFilesState>((set, get) => ({
  files: loadRecentFiles(),
  maxFiles: 10,
  
  addFile: (path, name) => {
    set((state) => {
      const existing = state.files.filter(f => f.path !== path);
      const newFile = { path, name, lastOpened: Date.now() };
      const updated = [newFile, ...existing].slice(0, state.maxFiles);
      saveRecentFiles(updated);
      return { files: updated };
    });
  },
  
  removeFile: (path) => {
    set((state) => {
      const updated = state.files.filter(f => f.path !== path);
      saveRecentFiles(updated);
      return { files: updated };
    });
  },
  
  clearFiles: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ files: [] });
  },
}));