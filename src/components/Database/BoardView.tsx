import { useDatabaseStore, type Database, type Property } from '../../store/databaseStore';
import { useState } from 'react';

interface Props { database: Database; onUpdate?: () => void }

function findBoardProp(props: Property[]): Property | null {
  return props.find(p => p.type === 'select' || p.type === 'multi-select') || null;
}

export function BoardView({ database, onUpdate }: Props) {
  const { updateRecord, deleteRecord, addRecord } = useDatabaseStore();
  const boardProp = findBoardProp(database.properties);
  const otherProps = database.properties.filter(p => p.id !== boardProp?.id);

  // Group records by board property value
  const columns = new Map<string, typeof database.records>();
  const statuses = boardProp?.options || [];

  for (const status of statuses) {
    columns.set(status, database.records.filter(r => String(r.values[boardProp?.id ?? ''] ?? '') === status));
  }
  // Uncategorized
  const uncat = database.records.filter(r => !statuses.includes(String(r.values[boardProp?.id ?? ''] ?? '')));
  if (uncat.length > 0) columns.set('Uncategorized', uncat);

  const [dragging, setDragging] = useState<string | null>(null);

  const moveToColumn = (recordId: string, col: string) => {
    if (boardProp) updateRecord(database.id, recordId, { [boardProp.id]: col });
    onUpdate?.();
  };

  if (!boardProp) {
    return <div className="db-board-empty"><p>Add a Select or Multi-select property to enable Board view.</p></div>;
  }

  return (
    <div className="db-board-view">
      {Array.from(columns.entries()).map(([col, recs]) => (
        <div key={col} className={`board-column${dragging === col ? ' drag-over' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(col); }}
          onDragLeave={() => setDragging(null)}
          onDrop={e => { e.preventDefault(); setDragging(null); const id = e.dataTransfer.getData('text'); if (id) moveToColumn(id, col); }}>
          <div className="board-col-header">
            <span className="board-col-title">{col}</span>
            <span className="board-col-count">{recs.length}</span>
          </div>
          {recs.map(rec => (
            <div key={rec.id} className="board-card" draggable onDragStart={e => e.dataTransfer.setData('text', rec.id)}>
              <div className="card-title">{String(rec.values[otherProps[0]?.id] || 'Untitled')}</div>
              {otherProps.slice(1).map(p => (
                <div key={p.id} className="card-field"><small>{p.name}: {String(rec.values[p.id] ?? '')}</small></div>
              ))}
              <button className="btn-icon-sm" onClick={() => { deleteRecord(database.id, rec.id); onUpdate?.(); }}>×</button>
            </div>
          ))}
        </div>
      ))}
      <div className="board-column board-add-col">
        <button onClick={() => { const vals: Record<string, unknown> = {}; database.properties.forEach(p => vals[p.id] = ''); addRecord(database.id, vals); onUpdate?.(); }}>+ Add card</button>
      </div>
    </div>
  );
}
