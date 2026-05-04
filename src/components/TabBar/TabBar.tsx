import { useTabsStore, TabInfo } from '../../store/tabsStore';
import './TabBar.css';

export function TabBar() {
  const { tabs, activeTabId, switchTab, closeTab, reorderTabs } = useTabsStore();

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

  if (tabs.length === 0) return null;

  return (
    <div className="tab-bar">
      <div className="tabs-container">
        {tabs.map((tab: TabInfo, index: number) => (
          <div
            key={tab.id}
            className={`tab ${tab.id === activeTabId ? 'active' : ''} ${tab.isDirty ? 'dirty' : ''}`}
            onClick={() => switchTab(tab.id)}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragOver={handleDragOver}
          >
            <span className="tab-name">
              {tab.isDirty && <span className="dirty-indicator">●</span>}
              {tab.name}
            </span>
            <button
              className="close-tab-btn"
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <div className="tabs-count">
        {tabs.length} 个文档
      </div>
    </div>
  );
}