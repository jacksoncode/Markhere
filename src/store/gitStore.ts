import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

export interface GitCommit {
  hash: string;
  short_hash: string;
  author: string;
  date: string;
  message: string;
}

export interface GitDiff {
  old_content: string;
  new_content: string;
  additions: number;
  deletions: number;
}

interface GitState {
  isEnabled: boolean;
  loading: boolean;
  error: string | null;
  commits: GitCommit[];
  currentDiff: GitDiff | null;
  selectedHash: string | null;

  loadHistory: (path: string) => Promise<void>;
  loadDiff: (path: string, oldHash: string, newHash: string) => Promise<void>;
  selectCommit: (hash: string | null) => void;
  clearDiff: () => void;
}

export const useGitStore = create<GitState>((set) => ({
  isEnabled: false,
  loading: false,
  error: null,
  commits: [],
  currentDiff: null,
  selectedHash: null,

  loadHistory: async (path: string) => {
    if (!path) return;
    set({ loading: true, error: null });
    try {
      const commits = await invoke<GitCommit[]>('get_git_history', { filePath: path });
      set({ commits, isEnabled: true, loading: false });
    } catch {
      set({ commits: [], isEnabled: false, loading: false });
    }
  },

  loadDiff: async (path: string, oldHash: string, newHash: string) => {
    set({ loading: true, error: null, currentDiff: null });
    try {
      const diff = await invoke<GitDiff>('get_git_diff', {
        filePath: path,
        oldHash,
        newHash,
      });
      set({ currentDiff: diff, loading: false });
    } catch (e) {
      set({ currentDiff: null, loading: false, error: String(e) });
    }
  },

  selectCommit: (hash: string | null) => {
    set({ selectedHash: hash });
  },

  clearDiff: () => {
    set({ currentDiff: null, selectedHash: null });
  },
}));
