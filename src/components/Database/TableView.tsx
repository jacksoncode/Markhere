import { useDatabaseStore, type Database, type Property, type DbRecord } from '../../store/databaseStore';
import { useState } from 'react';
import { getFormulaValue } from '../../services/DatabaseFormula';

interface Props { database: Database; onUpdate?: () => void }

function renderCell(prop: Property, record: DbRecord, onChange: (v: string) => void, database: Database) {
  const val = String(record.values[prop.id] ?? '');
  switch (prop.type) {
    case 'checkbox':
      return <input type="checkbox" checked={val === 'true'} onChange={e => onChange(String(e.target.checked))} />;
    case 'select':
    case 'multi-select':
      return <select value={val} onChange={e => onChange(e.target.value)}><option value="">--</option>{prop.options?.map(o => <option key={o} value={o}>{o}</option>)}</select>;
    case 'date':
      return <input type="date" value={val} onChange={e => onChange(e.target.value)} />;
    case 'number':
      return <input type="number" value={val} onChange={e => onChange(e.target.value)} />;
    case 'formula':
      return (
        <span className="db-formula-cell" title={prop.formula || 'Formula'}>
          {getFormulaValue(prop.id, prop.formula || '', database)}
        </span>
      );
    default:
      return <input type="text" value={val} onChange={e => onChange(e.target.value)} placeholder={prop.name} />;
  }
}

export function TableView({ database, onUpdate }: Props) {
  const { updateRecord, addRecord, deleteRecord } = useDatabaseStore();
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const visibleProps = database.properties;
  const records = [...database.records];

  if (sortKey) {
    records.sort((a, b) => {
      const va = String(a.values[sortKey] ?? ''), vb = String(b.values[sortKey] ?? '');
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    });
  }

  const toggleSort = (propId: string) => {
    setSortKey(prev => prev === propId ? (setSortDir(d => d === 'asc' ? 'desc' : 'asc'), propId) : (setSortDir('asc'), propId));
  };

  return (
    <div className="db-table-view">
      <table>
        <thead><tr>
          <th className="col-num">#</th>
          {visibleProps.map(p => <th key={p.id} onClick={() => toggleSort(p.id)} className="sortable">{p.name}{sortKey === p.id && (sortDir === 'asc' ? ' ↑' : ' ↓')}</th>)}
          <th className="col-action"></th>
        </tr></thead>
        <tbody>
          {records.map((rec, idx) => (
            <tr key={rec.id}>
              <td className="col-num">{idx + 1}</td>
              {visibleProps.map(p => <td key={p.id}>{renderCell(p, rec, v => handleCellEdit(rec.id, p.id, v), database)}</td>)}
              <td className="col-action"><button className="btn-icon" onClick={() => { deleteRecord(database.id, rec.id); onUpdate?.(); }}>🗑</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="btn-add-row" onClick={() => { const vals: Record<string, unknown> = {}; visibleProps.forEach(p => vals[p.id] = ''); addRecord(database.id, vals); onUpdate?.(); }}>+ New row</button>
    </div>
  );

  function handleCellEdit(recordId: string, propId: string, value: string) {
    updateRecord(database.id, recordId, { [propId]: value });
    onUpdate?.();
  }
}
