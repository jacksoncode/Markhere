import { create } from 'zustand';
import { fileNameOf } from '../utils/pathUtils';

interface FileState {
  currentPath: string | null;
  fileName: string | null;
  savedContent: string;
  isNewFile: boolean;
}

interface FileActions {
  setCurrentPath: (path: string | null) => void;
  setFileName: (name: string | null) => void;
  setSavedContent: (content: string) => void;
  setIsNewFile: (isNew: boolean) => void;
  reset: () => void;
}

const initialState: FileState = {
  currentPath: null,
  fileName: null,
  savedContent: '',
  isNewFile: true,
};

export const useFileStore = create<FileState & FileActions>((set) => ({
  ...initialState,

  setCurrentPath: (path) => {
    const fileName = path ? fileNameOf(path) || null : null;
    set({ currentPath: path, fileName, isNewFile: false });
  },

  setFileName: (name) => set({ fileName: name }),

  setSavedContent: (content) => set({ savedContent: content }),

  setIsNewFile: (isNew) => set({ isNewFile: isNew }),

  reset: () => set(initialState),
}));