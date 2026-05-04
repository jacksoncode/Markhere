import { useFileStore } from '../../store/fileStore';
import { useUIState } from '../../store/uiStore';
import { useTranslation } from '../../i18n';
import './Sidebar-New.css';

export function SidebarNew() {
  const { t } = useTranslation();
  const { sidebarOpen, toggleSidebar } = useUIState();
  const { currentPath } = useFileStore();

  return (
    <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
      {sidebarOpen ? (
        <>
          <div className="sidebar-header">
            <span className="sidebar-title">{t('sidebar.files')}</span>
            <button className="sidebar-toggle" onClick={toggleSidebar} title={t('sidebar.closeSidebar')}>
              ×
            </button>
          </div>

          <div className="sidebar-content">
            <div className="file-tree-section">
              <div className="file-tree-header">
                <span>{t('sidebar.recentFiles')}</span>
                <div className="file-tree-actions">
                  <button className="file-tree-action-btn">+</button>
                </div>
              </div>
              
              <ul className="file-tree-list">
                <li 
                  className={`file-tree-item ${currentPath ? 'active' : ''}`}
                >
                  <svg className="file-tree-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                  </svg>
                  <span className="file-tree-name">
                    {currentPath ? currentPath.split('/').pop() : 'Untitled.md'}
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="sidebar-footer">
            <button className="sidebar-footer-btn" onClick={toggleSidebar}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
              </svg>
              {t('sidebar.closeSidebar')}
            </button>
          </div>
        </>
      ) : (
        <button 
          className="sidebar-expand-btn" 
          onClick={toggleSidebar}
          title={t('sidebar.showSidebar')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
          </svg>
        </button>
      )}
    </aside>
  );
}