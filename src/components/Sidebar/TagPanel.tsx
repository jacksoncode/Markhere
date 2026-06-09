import { MetadataService } from '../../services/MetadataService';
import { useMemo, useState, useEffect } from 'react';

export function TagPanel({ onTagClick }: { onTagClick?: (tag: string) => void }) {
  const [, force] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => force(n => n + 1), 2000);
    return () => clearInterval(interval);
  }, []);

  const tags = useMemo(() => {
    const all = MetadataService.getAll();
    const tagCount = new Map<string, number>();
    for (const note of all) {
      for (const tag of note.tags) {
        tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
      }
    }
    return Array.from(tagCount.entries())
      .sort((a, b) => b[1] - a[1]);
  }, [force]);

  const nested = new Map<string, { count: number; children: string[] }>();
  for (const [tag, count] of tags) {
    const parts = tag.split('/');
    const parent = parts.length > 1 ? parts.slice(0, -1).join('/') : null;
    if (!nested.has(tag)) nested.set(tag, { count, children: [] });
    if (parent) {
      if (!nested.has(parent)) nested.set(parent, { count: 0, children: [] });
      nested.get(parent)!.children.push(tag);
      nested.get(parent)!.count += count;
    }
  }

  const rootTags = tags.filter(([t]) => !t.includes('/'));

  return (
    <div className="tag-panel" style={{ padding: 12 }}>
      <h3 style={{ fontSize: 14, margin: '0 0 8px' }}>Tags</h3>
      <div className="tag-list">
        {rootTags.map(([tag, count]) => (
          <TagRow key={tag} tag={tag} count={count} depth={0} onTagClick={onTagClick} nested={nested} />
        ))}
      </div>
      {tags.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>No tags yet. Add YAML frontmatter with tags to your notes.</p>}
    </div>
  );
}

function TagRow({ tag, count, depth, onTagClick, nested }: { tag: string; count: number; depth: number; onTagClick?: (tag: string) => void; nested: Map<string, { count: number; children: string[] }> }) {
  const [expanded, setExpanded] = useState(true);
  const children = nested.get(tag)?.children || [];
  const shortName = tag.split('/').pop() || tag;

  return (
    <div>
      <div className="tag-row" style={{ display: 'flex', alignItems: 'center', padding: '2px 0', paddingLeft: depth * 16, cursor: 'pointer', fontSize: 13 }}
        onClick={() => onTagClick?.(tag)}>
        {children.length > 0 && (
          <span style={{ marginRight: 4, cursor: 'pointer' }} onClick={e => { e.stopPropagation(); setExpanded(!expanded); }}>
            {expanded ? '▾' : '▸'}
          </span>
        )}
        <span style={{ color: 'var(--text-secondary)', marginRight: 4 }}>#</span>
        <span style={{ flex: 1 }}>{shortName}</span>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{count}</span>
      </div>
      {expanded && children.map(c => (
        <TagRow key={c} tag={c} count={nested.get(c)?.count || 0} depth={depth + 1} onTagClick={onTagClick} nested={nested} />
      ))}
    </div>
  );
}
