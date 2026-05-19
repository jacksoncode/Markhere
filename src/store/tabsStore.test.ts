import { describe, it, expect, beforeEach } from 'vitest';
import { useTabsStore } from '../store/tabsStore';

describe('useTabsStore', () => {
  beforeEach(() => {
    useTabsStore.setState({
      tabs: [],
      activeTabId: null,
      closedTabs: [],
    });
  });

  describe('openTab', () => {
    it('creates new tab with correct properties', () => {
      const { openTab } = useTabsStore.getState();

      openTab('/test/file.md', 'file.md', '# Content');

      const state = useTabsStore.getState();
      expect(state.tabs).toHaveLength(1);
      const tab = state.tabs[0];
      expect(tab.path).toBe('/test/file.md');
      expect(tab.name).toBe('file.md');
      expect(tab.content).toBe('# Content');
      expect(tab.isDirty).toBe(false);
      expect(tab.id).toBeTruthy();
      expect(typeof tab.id).toBe('string');
      expect(tab.lastAccessed).toBeGreaterThan(0);
      expect(state.activeTabId).toBe(tab.id);
    });

    it('reuses existing tab when same path is opened', () => {
      const { openTab } = useTabsStore.getState();

      openTab('/test/file.md', 'file.md', '# Content');
      const firstState = useTabsStore.getState();
      const firstId = firstState.tabs[0].id;

      openTab('/test/file.md', 'renamed.md', '# Other Content');

      const state = useTabsStore.getState();
      expect(state.tabs).toHaveLength(1);
      expect(state.tabs[0].id).toBe(firstId);
      expect(state.activeTabId).toBe(firstId);
    });

    it('creates new tab when different path is opened', () => {
      const { openTab } = useTabsStore.getState();

      openTab('/test/a.md', 'a.md', '# A');
      openTab('/test/b.md', 'b.md', '# B');

      const state = useTabsStore.getState();
      expect(state.tabs).toHaveLength(2);
      expect(state.tabs[0].path).toBe('/test/a.md');
      expect(state.tabs[1].path).toBe('/test/b.md');
    });

    it('sets activeTabId to the newly opened tab', () => {
      const { openTab } = useTabsStore.getState();

      openTab('/test/a.md', 'a.md', '# A');
      const idA = useTabsStore.getState().activeTabId;
      openTab('/test/b.md', 'b.md', '# B');
      const idB = useTabsStore.getState().activeTabId;

      expect(idA).not.toBe(idB);
      expect(useTabsStore.getState().activeTabId).toBe(idB);
    });
  });

  describe('closeTab', () => {
    it('removes tab and switches to the next most recently accessed tab', () => {
      const { openTab, switchTab, closeTab } = useTabsStore.getState();

      openTab('/test/a.md', 'a.md', '# A');
      const idA = useTabsStore.getState().tabs[0].id;
      openTab('/test/b.md', 'b.md', '# B');
      const idB = useTabsStore.getState().tabs[1].id;

      switchTab(idA);
      closeTab(idA);

      const state = useTabsStore.getState();
      expect(state.tabs).toHaveLength(1);
      expect(state.tabs[0].id).toBe(idB);
      expect(state.activeTabId).toBe(idB);
    });

    it('sets activeTabId to null when closing the last tab', () => {
      const { openTab, closeTab } = useTabsStore.getState();

      openTab('/test/file.md', 'file.md', '# Content');
      const id = useTabsStore.getState().tabs[0].id;

      closeTab(id);

      const state = useTabsStore.getState();
      expect(state.tabs).toHaveLength(0);
      expect(state.activeTabId).toBeNull();
    });

    it('creates a closedTabs entry with correct properties', () => {
      const { openTab, closeTab } = useTabsStore.getState();

      openTab('/test/file.md', 'file.md', '# Content');
      const id = useTabsStore.getState().tabs[0].id;

      closeTab(id);

      const state = useTabsStore.getState();
      expect(state.closedTabs).toHaveLength(1);
      expect(state.closedTabs[0].path).toBe('/test/file.md');
      expect(state.closedTabs[0].name).toBe('file.md');
      expect(state.closedTabs[0].content).toBe('# Content');
      expect(state.closedTabs[0].closedAt).toBeGreaterThan(0);
    });

    it('does not switch activeTabId when closing a non-active tab', () => {
      const { openTab, closeTab } = useTabsStore.getState();

      openTab('/test/a.md', 'a.md', '# A');
      const idA = useTabsStore.getState().tabs[0].id;
      openTab('/test/b.md', 'b.md', '# B');

      closeTab(idA);

      const state = useTabsStore.getState();
      expect(state.tabs).toHaveLength(1);
      expect(state.activeTabId).not.toBeNull();
      expect(state.activeTabId).not.toBe(idA);
    });
  });

  describe('switchTab', () => {
    it('updates activeTabId', () => {
      const { openTab, switchTab } = useTabsStore.getState();

      openTab('/test/a.md', 'a.md', '# A');
      const idA = useTabsStore.getState().tabs[0].id;
      openTab('/test/b.md', 'b.md', '# B');
      const idB = useTabsStore.getState().tabs[1].id;

      switchTab(idA);

      expect(useTabsStore.getState().activeTabId).toBe(idA);

      switchTab(idB);

      expect(useTabsStore.getState().activeTabId).toBe(idB);
    });

    it('updates lastAccessed on the switched-to tab', () => {
      const { openTab, switchTab } = useTabsStore.getState();

      openTab('/test/a.md', 'a.md', '# A');
      const idA = useTabsStore.getState().tabs[0].id;
      const firstAccess = useTabsStore.getState().tabs[0].lastAccessed;

      openTab('/test/b.md', 'b.md', '# B');

      switchTab(idA);

      const tabA = useTabsStore.getState().tabs.find((t) => t.id === idA);
      expect(tabA).toBeDefined();
      expect(tabA!.lastAccessed).toBeGreaterThanOrEqual(firstAccess);
    });
  });

  describe('reorderTabs', () => {
    it('correctly moves a tab from one index to another', () => {
      const { openTab, reorderTabs } = useTabsStore.getState();

      openTab('/test/a.md', 'a.md', '# A');
      openTab('/test/b.md', 'b.md', '# B');
      openTab('/test/c.md', 'c.md', '# C');

      const beforeReorder = useTabsStore.getState().tabs.map((t) => t.path);
      expect(beforeReorder).toEqual(['/test/a.md', '/test/b.md', '/test/c.md']);

      reorderTabs(0, 2);

      const afterReorder = useTabsStore.getState().tabs.map((t) => t.path);
      expect(afterReorder).toEqual(['/test/b.md', '/test/c.md', '/test/a.md']);
    });

    it('handles moving tab to same index', () => {
      const { openTab, reorderTabs } = useTabsStore.getState();

      openTab('/test/a.md', 'a.md', '# A');
      openTab('/test/b.md', 'b.md', '# B');

      reorderTabs(0, 1);

      const state = useTabsStore.getState();
      expect(state.tabs.map((t) => t.path)).toEqual(['/test/b.md', '/test/a.md']);
    });
  });

  describe('reopenClosedTab', () => {
    it('restores the last closed tab', () => {
      const { openTab, closeTab, reopenClosedTab } = useTabsStore.getState();

      openTab('/test/file.md', 'file.md', '# Content');
      const originalId = useTabsStore.getState().tabs[0].id;

      closeTab(originalId);

      expect(useTabsStore.getState().closedTabs).toHaveLength(1);

      reopenClosedTab();

      const state = useTabsStore.getState();
      expect(state.tabs).toHaveLength(1);
      expect(state.tabs[0].path).toBe('/test/file.md');
      expect(state.tabs[0].name).toBe('file.md');
      expect(state.tabs[0].content).toBe('# Content');
      expect(state.activeTabId).toBe(state.tabs[0].id);
      expect(state.closedTabs).toHaveLength(0);
    });

    it('does nothing when there are no closed tabs', () => {
      const { reopenClosedTab } = useTabsStore.getState();

      reopenClosedTab();

      const state = useTabsStore.getState();
      expect(state.tabs).toHaveLength(0);
      expect(state.closedTabs).toHaveLength(0);
    });

    it('restores most recently closed tab first (LIFO)', () => {
      const { openTab, closeTab, reopenClosedTab } = useTabsStore.getState();

      openTab('/test/a.md', 'a.md', '# A');
      const idA = useTabsStore.getState().tabs[0].id;
      openTab('/test/b.md', 'b.md', '# B');
      const idB = useTabsStore.getState().tabs[1].id;

      closeTab(idA);
      closeTab(idB);

      reopenClosedTab();

      const state = useTabsStore.getState();
      expect(state.tabs).toHaveLength(1);
      expect(state.tabs[0].path).toBe('/test/b.md');
      expect(state.closedTabs).toHaveLength(1);
      expect(state.closedTabs[0].path).toBe('/test/a.md');
    });
  });

  describe('updateTabContent', () => {
    it('updates content and sets dirty flag', () => {
      const { openTab, updateTabContent } = useTabsStore.getState();

      openTab('/test/file.md', 'file.md', '# Original');
      const id = useTabsStore.getState().tabs[0].id;

      updateTabContent(id, '# Updated Content');

      const tab = useTabsStore.getState().tabs.find((t) => t.id === id);
      expect(tab).toBeDefined();
      expect(tab!.content).toBe('# Updated Content');
      expect(tab!.isDirty).toBe(true);
    });

    it('allows explicit isDirty flag', () => {
      const { openTab, updateTabContent } = useTabsStore.getState();

      openTab('/test/file.md', 'file.md', '# Original');
      const id = useTabsStore.getState().tabs[0].id;

      updateTabContent(id, '# Updated', false);

      const tab = useTabsStore.getState().tabs.find((t) => t.id === id);
      expect(tab!.isDirty).toBe(false);
    });
  });

  describe('markTabSaved', () => {
    it('clears the dirty flag', () => {
      const { openTab, updateTabContent, markTabSaved } = useTabsStore.getState();

      openTab('/test/file.md', 'file.md', '# Original');
      const id = useTabsStore.getState().tabs[0].id;

      updateTabContent(id, '# Modified');
      expect(useTabsStore.getState().tabs[0].isDirty).toBe(true);

      markTabSaved(id);

      const tab = useTabsStore.getState().tabs.find((t) => t.id === id);
      expect(tab!.isDirty).toBe(false);
    });
  });

  describe('getActiveTab', () => {
    it('returns the active tab', () => {
      const { openTab } = useTabsStore.getState();

      openTab('/test/file.md', 'file.md', '# Content');

      const { getActiveTab } = useTabsStore.getState();
      const activeTab = getActiveTab();

      expect(activeTab).not.toBeNull();
      expect(activeTab!.path).toBe('/test/file.md');
      expect(activeTab!.name).toBe('file.md');
    });

    it('returns null when no tab is active', () => {
      const { getActiveTab } = useTabsStore.getState();

      expect(getActiveTab()).toBeNull();
    });
  });

  describe('hasClosedTabs', () => {
    it('returns true when there are closed tabs', () => {
      const { openTab, closeTab } = useTabsStore.getState();

      openTab('/test/file.md', 'file.md', '# Content');
      const id = useTabsStore.getState().tabs[0].id;
      closeTab(id);

      const { hasClosedTabs } = useTabsStore.getState();
      expect(hasClosedTabs()).toBe(true);
    });

    it('returns false when there are no closed tabs', () => {
      const { hasClosedTabs } = useTabsStore.getState();

      expect(hasClosedTabs()).toBe(false);
    });
  });
});
