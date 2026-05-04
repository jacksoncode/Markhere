import { create } from 'zustand';

export interface GitStatus {
  branch: string;
  modified: number;
  staged: number;
  untracked: number;
}

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: string;
}

interface GitState {
  isEnabled: boolean;
  status: GitStatus | null;
  commits: GitCommit[];
  checkStatus: (path: string) => Promise<void>;
  commit: (path: string, message: string) => Promise<void>;
  push: (path: string) => Promise<void>;
  pull: (path: string) => Promise<void>;
}

export const useGitStore = create<GitState>((set) => ({
  isEnabled: false,
  status: null,
  commits: [],
  
  checkStatus: async (path: string) => {
    try {
      const invoke = (window as any).__TAURI__?.invoke;
      if (!invoke) {
        set({ isEnabled: false, status: null });
        return;
      }
      const status = await invoke('git_status', { path }) as GitStatus;
      set({ status, isEnabled: true });
    } catch (e) {
      set({ isEnabled: false, status: null });
    }
  },
  
  commit: async (path: string, message: string) => {
    const invoke = (window as any).__TAURI__?.invoke;
    if (invoke) {
      await invoke('git_commit', { path, message });
    }
  },
  
  push: async (path: string) => {
    const invoke = (window as any).__TAURI__?.invoke;
    if (invoke) {
      await invoke('git_push', { path });
    }
  },
  
  pull: async (path: string) => {
    const invoke = (window as any).__TAURI__?.invoke;
    if (invoke) {
      await invoke('git_pull', { path });
    }
  },
}));