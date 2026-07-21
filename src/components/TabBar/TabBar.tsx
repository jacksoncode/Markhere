import { useCallback, useRef, useEffect } from 'react';
import { useTabsStore, TabInfo } from '../../store/tabsStore';
import { switchToTab } from '../../services/tabSwitch';
import './TabBar.css';

export function TabBar() {
  const { tabs, activeTabId, closeTab, reorderTabs } = useTabsStore();
  const tabRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  // Focus the newly active tab after switching
  useEffect(() => {
    if (activeTabId) {
      const el = tabRefs.current.get(activeTabId);
      if (el && document.activeElement !== el) {
        // Only move focus if a tab was already focused
        const isTabFocused = Array.from(tabRefs.current.values()).some(
          (ref) => ref === document.activeElement
        );
        if (isTabFocused) {
          el.focus();
        }
      }
    }
  }, [activeTabId]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('tabIndex', index.toString());
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    const fromIndex = parseInt(e.dataTransfer.getData('tabIndex'));
    if (fromIndex !== toIndex) {
      reorderTabs(fromIndex, toIndex);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>, tabId: string) => {
      const currentIndex = tabs.findIndex((t) => t.id === tabId);
      let nextIndex = currentIndex;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextIndex = (currentIndex + 1) % tabs.length;
        const nextTab = tabs[nextIndex];
        switchToTab(nextTab.id);
        tabRefs.current.get(nextTab.id)?.focus();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        const prevTab = tabs[nextIndex];
        switchToTab(prevTab.id);
        tabRefs.current.get(prevTab.id)?.focus();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        closeTab(tabId);
        // Focus will move to the newly active tab via the useEffect above
      }
    },
    [tabs, closeTab]
  );

  if (tabs.length === 0) return null;

  const getTabLabel = (tab: TabInfo): string => {
    return tab.isDirty ? `${tab.name} (unsaved changes)` : tab.name;
  };

  return (
    <div className="tab-bar" role="tablist" aria-label="Open documents">
      <div className="tabs-container">
        {tabs.map((tab: TabInfo, index: number) => (
          <div
            key={tab.id}
            ref={(el) => { tabRefs.current.set(tab.id, el); }}
            id={`tab-${tab.id}`}
            className={`tab ${tab.id === activeTabId ? 'active' : ''} ${tab.isDirty ? 'dirty' : ''}`}
            onClick={() => switchToTab(tab.id)}
            onKeyDown={(e) => handleTabKeyDown(e, tab.id)}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragOver={handleDragOver}
            role="tab"
            aria-selected={tab.id === activeTabId}
            aria-controls={`tabpanel-${tab.id}`}
            aria-label={getTabLabel(tab)}
            tabIndex={tab.id === activeTabId ? 0 : -1}
          >
            <span className="tab-name">
              {tab.isDirty && <span className="dirty-indicator" aria-hidden="true">●</span>}
              {tab.name}
            </span>
            <button
              className="close-tab-btn"
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              aria-label={`Close ${tab.name}`}
              tabIndex={-1}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <div className="tabs-count" aria-label={`${tabs.length} documents open`}>
        {tabs.length} 个文档
      </div>
    </div>
  );
}
