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

export interface ClosedTabInfo {
  path: string;
  name: string;
  content: string;
  closedAt: number;
}

interface TabsState {
  tabs: TabInfo[];
  activeTabId: string | null;
  closedTabs: ClosedTabInfo[];
  
  openTab: (path: string, name: string, content: string) => void;
  closeTab: (id: string) => void;
  switchTab: (id: string) => void;
  updateTabContent: (id: string, content: string, isDirty?: boolean) => void;
  markTabSaved: (id: string) => void;
  getActiveTab: () => TabInfo | null;
  getTabById: (id: string) => TabInfo | undefined;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  reopenClosedTab: () => void;
  hasClosedTabs: () => boolean;
}

const MAX_CLOSED_TABS = 20;

export const useTabsStore = create<TabsState>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: null,
      closedTabs: [],
      
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
        const tab = get().tabs.find((t) => t.id === id);
        const tabs = get().tabs.filter((t) => t.id !== id);
        const activeTabId = get().activeTabId;
        
        if (tab) {
          const closedTab: ClosedTabInfo = {
            path: tab.path,
            name: tab.name,
            content: tab.content,
            closedAt: Date.now(),
          };
          set((state) => ({
            closedTabs: [closedTab, ...state.closedTabs].slice(0, MAX_CLOSED_TABS),
          }));
        }
        
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
      
      reopenClosedTab: () => {
        const closedTabs = get().closedTabs;
        if (closedTabs.length === 0) return;
        
        const [lastClosed, ...remaining] = closedTabs;
        get().openTab(lastClosed.path, lastClosed.name, lastClosed.content);
        set({ closedTabs: remaining });
      },
      
      hasClosedTabs: () => get().closedTabs.length > 0,
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
        closedTabs: state.closedTabs.slice(0, 10),
      }),
    }
  )
);