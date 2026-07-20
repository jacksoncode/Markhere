import { create } from 'zustand';
import { basenameOf } from '../utils/pathUtils';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Draft {
  id: string;
  content: string;
  path?: string;
  timestamp: number;
  title?: string;
}

interface AutoSaveState {
  content: string;
  lastSaved: number | null;
  currentPath: string | null;
  hasUnsavedChanges: boolean;
  drafts: Draft[];
  autoSaveEnabled: boolean;
  autoSaveInterval: number;
  
  saveBackup: (content: string, path: string | null) => void;
  clearBackup: () => void;
  markDirty: () => void;
  markSaved: () => void;
  saveDraft: (content: string, path?: string, title?: string) => string;
  deleteDraft: (id: string) => void;
  getRecentDrafts: (limit?: number) => Draft[];
  setAutoSaveEnabled: (enabled: boolean) => void;
  setAutoSaveInterval: (interval: number) => void;
}

const MAX_DRAFTS = 20;
const DRAFT_EXPIRY_DAYS = 7;

export const useAutoSaveStore = create<AutoSaveState>()(
  persist(
    (set, get) => ({
      content: '',
      lastSaved: null,
      currentPath: null,
      hasUnsavedChanges: false,
      drafts: [],
      autoSaveEnabled: true,
      autoSaveInterval: 30000,

      saveBackup: (content, path) => set({
        content,
        lastSaved: Date.now(),
        currentPath: path,
        hasUnsavedChanges: false,
      }),

      clearBackup: () => set({
        content: '',
        lastSaved: null,
        currentPath: null,
        hasUnsavedChanges: false,
      }),

      markDirty: () => set({ hasUnsavedChanges: true }),
      markSaved: () => set({ hasUnsavedChanges: false, lastSaved: Date.now() }),
      
      saveDraft: (content: string, path?: string, title?: string) => {
        const id = `draft_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const draft: Draft = {
          id,
          content,
          path,
          timestamp: Date.now(),
          title: title || (path ? basenameOf(path) : 'Untitled'),
        };
        
        set((state) => {
          const drafts = [draft, ...state.drafts].slice(0, MAX_DRAFTS);
          return { drafts, lastSaved: Date.now() };
        });
        
        return id;
      },
      
      deleteDraft: (id: string) => {
        set((state) => ({
          drafts: state.drafts.filter((d) => d.id !== id),
        }));
      },
      
      getRecentDrafts: (limit?: number) => {
        const { drafts } = get();
        const expiryTime = Date.now() - DRAFT_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
        const validDrafts = drafts.filter((d) => d.timestamp > expiryTime);
        return validDrafts.slice(0, limit || 10);
      },
      
      setAutoSaveEnabled: (enabled: boolean) => {
        set({ autoSaveEnabled: enabled });
      },
      
      setAutoSaveInterval: (interval: number) => {
        set({ autoSaveInterval: interval });
      },
    }),
    {
      name: 'markhere-autosave-backup',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export function formatTimeAgo(timestamp: number | null): string {
  if (!timestamp) return '';
  
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function shouldRecover(state: AutoSaveState): boolean {
  return state.content.length > 0 && state.hasUnsavedChanges;
}