import { describe, it, expect, beforeEach } from 'vitest';
import { useTabsStore } from '../../store/tabsStore';
import { useFileStore } from '../../store/fileStore';

describe('Editor Module', () => {
  beforeEach(() => {
    localStorage.clear();
    useTabsStore.setState({ tabs: [], activeTabId: null, closedTabs: [] });
    useFileStore.setState({
      currentPath: null,
      fileName: null,
      savedContent: '',
      isNewFile: true,
    });
  });

  it('tabsStore.openTab creates a tab and state reflects it', () => {
    const { openTab } = useTabsStore.getState();
    openTab('/test/doc.md', 'doc.md', '# Hello');

    const state = useTabsStore.getState();
    expect(state.tabs).toHaveLength(1);
    expect(state.activeTabId).toBe(state.tabs[0].id);
    expect(state.tabs[0].path).toBe('/test/doc.md');
    expect(state.tabs[0].name).toBe('doc.md');
    expect(state.tabs[0].content).toBe('# Hello');
    expect(state.tabs[0].isDirty).toBe(false);
    expect(state.tabs[0].lastAccessed).toBeGreaterThan(0);
  });

  it('fileStore.setCurrentPath pairs with tabsStore to locate matching tab', () => {
    // Open a tab first
    useTabsStore.getState().openTab('/test/doc.md', 'doc.md', '# Content');

    // Set file path in fileStore
    useFileStore.getState().setCurrentPath('/test/doc.md');

    // Verify fileStore reflects the path
    const fileState = useFileStore.getState();
    expect(fileState.currentPath).toBe('/test/doc.md');
    expect(fileState.fileName).toBe('doc');
    expect(fileState.isNewFile).toBe(false);

    // Verify tabsStore can find the corresponding tab by path
    const tab = useTabsStore.getState().tabs.find(
      (t) => t.path === fileState.currentPath,
    );
    expect(tab).toBeDefined();
    expect(tab?.name).toBe('doc.md');
    expect(tab?.content).toBe('# Content');
  });

  it('openTab with same path reuses existing tab (dedup)', () => {
    const { openTab } = useTabsStore.getState();

    // Open first time
    openTab('/test/doc.md', 'doc.md', '# Original');
    const firstTabId = useTabsStore.getState().tabs[0].id;

    // Open same path again with different content
    openTab('/test/doc.md', 'doc.md', '# Modified');

    const state = useTabsStore.getState();
    // Should still have only 1 tab — no duplicate
    expect(state.tabs).toHaveLength(1);
    // Should preserve original tab id (reused)
    expect(state.tabs[0].id).toBe(firstTabId);
    // Content is NOT overwritten (reuses existing tab as-is, only updates lastAccessed)
    expect(state.tabs[0].content).toBe('# Original');
    // activeTabId points to existing tab
    expect(state.activeTabId).toBe(firstTabId);
  });

  it('switchTab between tabs changes activeTabId and updates lastAccessed', () => {
    const { openTab, switchTab } = useTabsStore.getState();

    openTab('/test/a.md', 'a.md', '# A');
    openTab('/test/b.md', 'b.md', '# B');

    const tabA = useTabsStore
      .getState()
      .tabs.find((t) => t.path === '/test/a.md')!;

    // Switch to tab A
    switchTab(tabA.id);

    const state = useTabsStore.getState();
    expect(state.activeTabId).toBe(tabA.id);

    // lastAccessed should be updated
    const updatedTabA = state.tabs.find((t) => t.id === tabA.id)!;
    expect(updatedTabA.lastAccessed).toBeGreaterThanOrEqual(tabA.lastAccessed);
  });

  it('closeTab removes tab and reassigns activeTabId to MRU tab', () => {
    const { openTab, closeTab } = useTabsStore.getState();

    openTab('/test/a.md', 'a.md', '# A');
    openTab('/test/b.md', 'b.md', '# B');
    openTab('/test/c.md', 'c.md', '# C');

    // Set explicit lastAccessed values to ensure deterministic MRU ordering:
    // Tab B is most-recently-used (3), C is second (2), A is oldest (1)
    const tabs = useTabsStore.getState().tabs;
    useTabsStore.setState({
      tabs: tabs.map((t) => {
        if (t.path === '/test/a.md') return { ...t, lastAccessed: 1 };
        if (t.path === '/test/b.md') return { ...t, lastAccessed: 3 };
        if (t.path === '/test/c.md') return { ...t, lastAccessed: 2 };
        return t;
      }),
      activeTabId: tabs.find((t) => t.path === '/test/c.md')!.id,
    });

    const tabB = useTabsStore
      .getState()
      .tabs.find((t) => t.path === '/test/b.md')!;
    const tabC = useTabsStore
      .getState()
      .tabs.find((t) => t.path === '/test/c.md')!;

    // Close active tab C
    closeTab(tabC.id);

    const state = useTabsStore.getState();
    expect(state.tabs).toHaveLength(2);
    // MRU among remaining (B has lastAccessed=3, A has 1) should become active
    expect(state.activeTabId).toBe(tabB.id);
    // Closed tab is saved in closedTabs
    expect(state.closedTabs).toHaveLength(1);
    expect(state.closedTabs[0].path).toBe('/test/c.md');
    expect(state.closedTabs[0].content).toBe('# C');
  });

  it('close last tab sets activeTabId to null', () => {
    const { openTab, closeTab } = useTabsStore.getState();

    openTab('/test/only.md', 'only.md', '# Only');
    const tabId = useTabsStore.getState().tabs[0].id;

    closeTab(tabId);

    const state = useTabsStore.getState();
    expect(state.tabs).toHaveLength(0);
    expect(state.activeTabId).toBeNull();
    expect(state.closedTabs).toHaveLength(1);
  });

  it('updateTabContent sets isDirty flag', () => {
    const { openTab, updateTabContent } = useTabsStore.getState();

    openTab('/test/doc.md', 'doc.md', '# Original');
    const tabId = useTabsStore.getState().tabs[0].id;

    updateTabContent(tabId, '# Modified');

    const tab = useTabsStore.getState().tabs.find((t) => t.id === tabId)!;
    expect(tab.content).toBe('# Modified');
    expect(tab.isDirty).toBe(true);
  });

  it('markTabSaved clears isDirty flag', () => {
    const { openTab, updateTabContent, markTabSaved } = useTabsStore.getState();

    openTab('/test/doc.md', 'doc.md', '# Original');
    const tabId = useTabsStore.getState().tabs[0].id;

    updateTabContent(tabId, '# Modified');
    expect(
      useTabsStore.getState().tabs.find((t) => t.id === tabId)!.isDirty,
    ).toBe(true);

    markTabSaved(tabId);

    const tab = useTabsStore.getState().tabs.find((t) => t.id === tabId)!;
    expect(tab.isDirty).toBe(false);
  });

  it('reopenClosedTab restores last closed tab (LIFO)', () => {
    const { openTab, closeTab, reopenClosedTab } = useTabsStore.getState();

    openTab('/test/a.md', 'a.md', '# A');
    openTab('/test/b.md', 'b.md', '# B');

    // Close B first (pushed onto closedTabs stack)
    const tabB = useTabsStore
      .getState()
      .tabs.find((t) => t.path === '/test/b.md')!;
    closeTab(tabB.id);

    // Close A next (pushed onto closedTabs stack, A is now on top)
    const tabA = useTabsStore
      .getState()
      .tabs.find((t) => t.path === '/test/a.md')!;
    closeTab(tabA.id);

    expect(useTabsStore.getState().closedTabs).toHaveLength(2);

    // Reopen — LIFO: should restore A (closed last)
    reopenClosedTab();

    const state = useTabsStore.getState();
    expect(state.tabs).toHaveLength(1);
    expect(state.tabs[0].path).toBe('/test/a.md');
    expect(state.tabs[0].content).toBe('# A');
    expect(state.closedTabs).toHaveLength(1);
  });

  it('reorderTabs with multiple tabs changes order correctly', () => {
    const { openTab, reorderTabs } = useTabsStore.getState();

    openTab('/test/a.md', 'a.md', '# A');
    openTab('/test/b.md', 'b.md', '# B');
    openTab('/test/c.md', 'c.md', '# C');

    // Move first tab (index 0) to index 2
    reorderTabs(0, 2);

    const paths = useTabsStore.getState().tabs.map((t) => t.path);
    expect(paths).toEqual(['/test/b.md', '/test/c.md', '/test/a.md']);
  });

  it('completes full tab lifecycle: open, switch, modify, close, reopen, verify content', () => {
    const {
      openTab,
      switchTab,
      updateTabContent,
      closeTab,
      reopenClosedTab,
    } = useTabsStore.getState();

    // Open
    openTab('/test/doc.md', 'doc.md', '# Original');
    const tabId = useTabsStore.getState().tabs[0].id;

    // Switch (open a second, then switch back)
    openTab('/test/other.md', 'other.md', '# Other');
    switchTab(tabId);

    // Modify
    updateTabContent(tabId, '# Modified Content', true);
    expect(
      useTabsStore.getState().tabs.find((t) => t.id === tabId)!.isDirty,
    ).toBe(true);

    // Close
    closeTab(tabId);
    expect(
      useTabsStore.getState().tabs.find((t) => t.id === tabId),
    ).toBeUndefined();

    // Reopen (must be on top of closedTabs stack since we closed only the second tab first)
    // First close the other tab so our target is on top of the stack
    const otherTabId = useTabsStore.getState().tabs[0].id;
    closeTab(otherTabId);
    // Now the closed stack has [otherTab, targetTab] — reopen should bring back otherTab
    // But we want to verify targetTab content. Let's reopen second-to-last closed.
    // Actually LIFO means reopenClosedTab brings back the last closed (otherTab).
    // We need to close in a way that our target is last closed.
    // Reopen target first by accessing it via closedTabs...

    // The simplest approach: just verify closedTabs contains the right data
    const closedPaths = useTabsStore
      .getState()
      .closedTabs.map((c) => c.path);
    expect(closedPaths).toContain('/test/doc.md');

    // Reopen both
    reopenClosedTab();
    expect(useTabsStore.getState().tabs).toHaveLength(1);
    expect(useTabsStore.getState().tabs[0].path).toBe('/test/other.md');

    reopenClosedTab();
    expect(useTabsStore.getState().tabs).toHaveLength(2);

    // Verify the doc.md tab content was restored
    const restored = useTabsStore
      .getState()
      .tabs.find((t) => t.path === '/test/doc.md')!;
    expect(restored).toBeDefined();
    expect(restored.content).toBe('# Modified Content');
    expect(restored.name).toBe('doc.md');
  });
});
