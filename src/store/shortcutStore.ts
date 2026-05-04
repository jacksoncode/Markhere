import { create } from 'zustand';

export interface ShortcutConfig {
  action: string;
  key: string;
  modifiers: string[];
}

interface ShortcutState {
  shortcuts: ShortcutConfig[];
  updateShortcut: (action: string, config: ShortcutConfig) => void;
  resetShortcuts: () => void;
}

const defaultShortcuts: ShortcutConfig[] = [
  { action: 'save', key: 's', modifiers: ['Meta'] },
  { action: 'new', key: 'n', modifiers: ['Meta'] },
  { action: 'open', key: 'o', modifiers: ['Meta'] },
  { action: 'search', key: 'f', modifiers: ['Meta'] },
  { action: 'command-palette', key: 'k', modifiers: ['Meta'] },
  { action: 'bold', key: 'b', modifiers: ['Meta'] },
  { action: 'italic', key: 'i', modifiers: ['Meta'] },
  { action: 'underline', key: 'u', modifiers: ['Meta'] },
  { action: 'heading', key: 'h', modifiers: ['Meta'] },
];

export const useShortcutStore = create<ShortcutState>((set) => ({
  shortcuts: JSON.parse(localStorage.getItem('markhere-shortcuts') || JSON.stringify(defaultShortcuts)),
  
  updateShortcut: (action: string, config: ShortcutConfig) => {
    set((state: ShortcutState) => {
      const shortcuts = state.shortcuts.map((s: ShortcutConfig) =>
        s.action === action ? config : s
      );
      localStorage.setItem('markhere-shortcuts', JSON.stringify(shortcuts));
      return { shortcuts };
    });
  },
  
  resetShortcuts: () => {
    localStorage.setItem('markhere-shortcuts', JSON.stringify(defaultShortcuts));
    set({ shortcuts: defaultShortcuts });
  },
}));