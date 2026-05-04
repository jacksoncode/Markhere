import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TabInfo {
  id: string;
  path: string;
  name: string;
  content: string;
  isDirty: boolean;
  lastAccessed: number;
}

interface TabsState {
  tabs: TabInfo[];
  activeTabId: string | null;
  
  openTab: (path: string, name: string, content: string) => void;
  closeTab: (id: string) => void;
  switchTab: (id: string) => void;
  updateTabContent: (id: string, content: string, isDirty?: boolean) => void;
  markTabSaved: (id: string) => void;
  getActiveTab: () => TabInfo | null;
  getTabById: (id: string) => TabInfo | undefined;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
}

export const useTabsStore = create<TabsState>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: null,
      
      openTab: (path, name, content) => {
        const existingTab = get().tabs.find((t) => t.path === path);
        
        if (existingTab) {
          set({
            activeTabId: existingTab.id,
            tabs: get().tabs.map((t) =>
              t.id === existingTab.id ? { ...t, lastAccessed: Date.now() } : t
            ),
          });
          return;
        }
        
        const newTab: TabInfo = {
          id: `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          path,
          name,
          content,
          isDirty: false,
          lastAccessed: Date.now(),
        };
        
        set((state) => ({
          tabs: [...state.tabs, newTab],
          activeTabId: newTab.id,
        }));
      },
      
      closeTab: (id) => {
        const tabs = get().tabs.filter((t) => t.id !== id);
        const activeTabId = get().activeTabId;
        
        let newActiveId = activeTabId;
        if (activeTabId === id) {
          const remainingTabs = tabs;
          if (remainingTabs.length > 0) {
            const lastAccessed = remainingTabs.sort((a, b) => b.lastAccessed - a.lastAccessed)[0];
            newActiveId = lastAccessed.id;
          } else {
            newActiveId = null;
          }
        }
        
        set({ tabs, activeTabId: newActiveId });
      },
      
      switchTab: (id) => set({
        activeTabId: id,
        tabs: get().tabs.map((t) =>
          t.id === id ? { ...t, lastAccessed: Date.now() } : t
        ),
      }),
      
      updateTabContent: (id, content, isDirty = true) => set((state) => ({
        tabs: state.tabs.map((t) =>
          t.id === id ? { ...t, content, isDirty } : t
        ),
      })),
      
      markTabSaved: (id) => set((state) => ({
        tabs: state.tabs.map((t) =>
          t.id === id ? { ...t, isDirty: false } : t
        ),
      })),
      
      getActiveTab: () => {
        const { tabs, activeTabId } = get();
        return tabs.find((t) => t.id === activeTabId) || null;
      },
      
      getTabById: (id) => get().tabs.find((t) => t.id === id),
      
      reorderTabs: (fromIndex, toIndex) => {
        const tabs = [...get().tabs];
        const [moved] = tabs.splice(fromIndex, 1);
        tabs.splice(toIndex, 0, moved);
        set({ tabs });
      },
    }),
    {
      name: 'tabs-storage',
      partialize: (state) => ({
        tabs: state.tabs.map((t) => ({
          id: t.id,
          path: t.path,
          name: t.name,
          lastAccessed: t.lastAccessed,
        })),
        activeTabId: state.activeTabId,
      }),
    }
  )
);