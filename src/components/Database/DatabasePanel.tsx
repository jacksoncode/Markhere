import { useDatabaseStore, type ViewType } from '../../store/databaseStore';
import { TableView } from './TableView';
import { BoardView } from './BoardView';
import { CalendarView } from './CalendarView';
import { TimelineView } from './TimelineView';
import { useState } from 'react';
import './Database.css';

const VIEW_LABELS: Record<ViewType, string> = {
  table: '📋 Table', board: '📌 Board', calendar: '📅 Calendar', timeline: '⏳ Timeline', list: '📃 List',
};

export function DatabasePanel() {
  const { databases, activeDbId, createDatabase, deleteDatabase, setActiveDatabase, addView, setActiveView: setDbView } = useDatabaseStore();
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const activeDb = databases.find(d => d.id === activeDbId);
  const activeView = activeDb?.views.find(v => v.id === activeDb?.activeViewId);

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    createDatabase(newTitle.trim());
    setNewTitle('');
    setShowNew(false);
  };

  const renderView = () => {
    if (!activeDb || !activeView) return <div className="db-empty">Select or create a database to get started.</div>;
    const props = { database: activeDb, onUpdate: () => {} };
    switch (activeView.type) {
      case 'board': return <BoardView {...props} />;
      case 'calendar': return <CalendarView {...props} />;
      case 'timeline': return <TimelineView {...props} />;
      default: return <TableView {...props} />;
    }
  };

  return (
    <div className="database-panel">
      <div className="db-sidebar">
        <div className="db-sidebar-header">
          <h3>Databases</h3>
          <button onClick={() => setShowNew(true)}>+ New</button>
        </div>
        {showNew && (
          <div className="db-new-form">
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Database name" autoFocus onKeyDown={e => e.key === 'Enter' && handleCreate()} />
            <button onClick={handleCreate}>Create</button>
          </div>
        )}
        <ul className="db-list">
          {databases.map(db => (
            <li key={db.id} className={db.id === activeDbId ? 'active' : ''}>
              <span onClick={() => setActiveDatabase(db.id)}>{db.title}</span>
              <button className="btn-icon-sm" onClick={() => deleteDatabase(db.id)}>×</button>
            </li>
          ))}
        </ul>
      </div>

      <div className="db-main">
        {activeDb && (
          <>
            <div className="db-toolbar">
              <h2>{activeDb.title}</h2>
              <div className="db-view-tabs">
                {activeDb.views.map(v => (
                  <button key={v.id} className={v.id === activeDb.activeViewId ? 'active' : ''} onClick={() => setDbView(activeDb.id, v.id)}>
                    {VIEW_LABELS[v.type]}
                  </button>
                ))}
                <select onChange={e => {
                  const type = e.target.value as ViewType;
                  if (type) addView(activeDb.id, { id: `v_${Date.now()}`, name: `${type} View`, type, config: {} });
                  e.target.value = '';
                }}>
                  <option value="">+ Add view</option>
                  <option value="table">Table</option>
                  <option value="board">Board</option>
                  <option value="calendar">Calendar</option>
                  <option value="timeline">Timeline</option>
                </select>
              </div>
            </div>
            {renderView()}
          </>
        )}
        {!activeDb && (
          <div className="db-empty-state">
            <h2>No database selected</h2>
            <p>Create a new database or select one from the sidebar.</p>
            <button onClick={() => setShowNew(true)}>Create Database</button>
          </div>
        )}
      </div>
    </div>
  );
}
