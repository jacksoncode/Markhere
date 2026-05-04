import { Outline } from '../Outline/Outline';
import { useUIState } from '../../store/uiStore';

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
}

export function Sidebar({ open, onToggle }: SidebarProps) {
  const { setActiveView } = useUIState();

  return (
    <aside className={`sidebar ${open ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <h1 className="sidebar-title">Markhere</h1>
        <button className="sidebar-toggle" onClick={onToggle}>
          {open ? '←' : '→'}
        </button>
      </div>

      {open && (
        <div className="sidebar-content">
          <nav className="sidebar-nav">
            <button className="nav-item active" onClick={() => setActiveView('documents')}>
              <span className="nav-icon">📄</span>
              Documents
            </button>
            <button className="nav-item" onClick={() => setActiveView('files')}>
              <span className="nav-icon">📁</span>
              Files
            </button>
            <button className="nav-item" onClick={() => setActiveView('settings')}>
              <span className="nav-icon">⚙️</span>
              Settings
            </button>
          </nav>

          <div className="sidebar-section">
            <Outline />
          </div>

          <div className="sidebar-section">
            <h3 className="section-title">Recent Files</h3>
            <ul className="file-list">
              <li className="file-item">example.md</li>
            </ul>
          </div>
        </div>
      )}
    </aside>
  );
}