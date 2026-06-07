import { PluginRegistry, type PluginManifest } from '../../services/PluginRegistry';
import { useState, useMemo } from 'react';
import './PluginMarketplace.css';

const CATEGORIES: { key: PluginManifest['category']; label: string }[] = [
  { key: 'editor', label: 'Editor' }, { key: 'theme', label: 'Theme' }, { key: 'collaboration', label: 'Collaboration' },
  { key: 'ai', label: 'AI' }, { key: 'export', label: 'Export' }, { key: 'utility', label: 'Utility' },
];

export function PluginMarketplace() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<PluginManifest['category'] | 'all'>('all');
  const [selected, setSelected] = useState<PluginManifest | null>(null);
  const [, forceUpdate] = useState(0);

  const plugins = useMemo(() => {
    let list = category === 'all' ? PluginRegistry.getAll() : PluginRegistry.byCategory(category as PluginManifest['category']);
    if (query) list = list.filter(p =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.description.toLowerCase().includes(query.toLowerCase())
    );
    return list;
  }, [query, category, forceUpdate]);

  const handleInstall = (id: string) => { PluginRegistry.install(id); forceUpdate(n => n + 1); };
  const handleUninstall = (id: string) => { PluginRegistry.uninstall(id); forceUpdate(n => n + 1); };

  if (selected) {
    const installed = PluginRegistry.isInstalled(selected.id);
    return (
      <div className="pm-detail">
        <button className="pm-back" onClick={() => setSelected(null)}>← Back</button>
        <h2>{selected.icon || '📦'} {selected.name}</h2>
        <p className="pm-author">by {selected.author} · v{selected.version}</p>
        <p className="pm-desc">{selected.description}</p>
        <div className="pm-tags">{selected.tags.map(t => <span key={t} className="pm-tag">{t}</span>)}</div>
        <div className="pm-meta">
          {selected.rating && <span>⭐ {selected.rating}</span>}
          {selected.downloads && <span>📥 {selected.downloads.toLocaleString()} downloads</span>}
        </div>
        {selected.repo && <p className="pm-repo"><a href={selected.repo} target="_blank" rel="noopener">🔗 Repository</a></p>}
        <div className="pm-perms">
          <strong>Permissions:</strong>
          {selected.permissions.length > 0 ? <ul>{selected.permissions.map(p => <li key={p}>{p}</li>)}</ul> : <span> None</span>}
        </div>
        {installed
          ? <button className="pm-btn danger" onClick={() => handleUninstall(selected.id)}>Uninstall</button>
          : <button className="pm-btn primary" onClick={() => handleInstall(selected.id)}>Install</button>
        }
      </div>
    );
  }

  return (
    <div className="plugin-marketplace">
      <h2>Plugin Marketplace</h2>
      <div className="pm-controls">
        <input placeholder="Search plugins..." value={query} onChange={e => setQuery(e.target.value)} />
      </div>
      <div className="pm-categories">
        <button className={category === 'all' ? 'active' : ''} onClick={() => setCategory('all')}>All</button>
        {CATEGORIES.map(c => <button key={c.key} className={category === c.key ? 'active' : ''} onClick={() => setCategory(c.key)}>{c.label}</button>)}
      </div>
      <div className="pm-grid">
        {plugins.map(p => {
          const installed = PluginRegistry.isInstalled(p.id);
          return (
            <div key={p.id} className="pm-card" onClick={() => setSelected(p)}>
              <div className="pm-card-header">
                <span className="pm-icon">{p.icon || '📦'}</span>
                <span className="pm-name">{p.name}</span>
                {installed && <span className="pm-badge">Installed</span>}
              </div>
              <p className="pm-card-desc">{p.description}</p>
              <div className="pm-card-footer">
                <span>⭐ {p.rating || '—'}</span>
                <span>{p.author}</span>
              </div>
            </div>
          );
        })}
        {plugins.length === 0 && <p className="pm-empty">No plugins found. Try a different search or category.</p>}
      </div>
    </div>
  );
}
