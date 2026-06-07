import { DataviewService, type QueryResult } from '../../services/DataviewService';
import { MetadataService } from '../../services/MetadataService';
import { useState } from 'react';
import './Dataview.css';

export function DataviewPanel() {
  const [dirPath, setDirPath] = useState('');
  const [query, setQuery] = useState('SELECT title, tags, created\nFROM ""\nSORT created DESC\nLIMIT 20');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [indexing, setIndexing] = useState(false);
  const stats = MetadataService.getStats();

  const handleRun = async () => {
    if (!dirPath.trim()) return;
    setIndexing(true);
    try {
      await DataviewService.buildIndex(dirPath.trim());
      const notes = MetadataService.getAll();
      setResult(DataviewService.execute(query, notes));
    } catch (e) {
      setResult({ columns: [], rows: [], total: 0, elapsed: 0, error: String(e) });
    } finally {
      setIndexing(false);
    }
  };

  return (
    <div className="dataview-panel">
      <div className="dv-config">
        <div className="dv-path-row">
          <label>Vault directory:</label>
          <input value={dirPath} onChange={e => setDirPath(e.target.value)} placeholder="/path/to/notes" />
          <button onClick={handleRun} disabled={indexing}>{indexing ? 'Indexing...' : 'Build Index'}</button>
        </div>
        {stats.totalNotes > 0 && <div className="dv-stats">{stats.totalNotes} notes indexed · {stats.scanDuration.toFixed(0)}ms</div>}
      </div>
      <div className="dv-query">
        <textarea value={query} onChange={e => setQuery(e.target.value)} rows={5} placeholder="SELECT title, tags FROM &quot;&quot; WHERE tags CONTAINS &quot;project&quot; SORT created DESC LIMIT 10" spellCheck={false} />
        <button onClick={handleRun} disabled={indexing}>Run Query</button>
      </div>
      {result?.error && <div className="dv-error">Error: {result.error}</div>}
      {result && !result.error && (
        <div className="dv-results">
          <div className="dv-results-info">{result.total} results · {result.elapsed.toFixed(0)}ms</div>
          {result.total === 0 ? <p className="dv-empty">No results. Try adjusting your query or indexing a directory first.</p> : (
            <table><thead><tr>{result.columns.map(c => <th key={c}>{c}</th>)}</tr></thead>
              <tbody>{result.rows.map((row, i) => <tr key={i}>{result.columns.map(c => <td key={c}>{String(row[c] ?? '')}</td>)}</tr>)}</tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
