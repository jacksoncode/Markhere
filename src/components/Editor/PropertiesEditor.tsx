import { useState, useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import { MetadataService } from '../../services/MetadataService';

export function PropertiesEditor({ editor, filePath }: { editor: Editor | null; filePath: string | null }) {
  const [visible, setVisible] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editor || !filePath) return;
    const all = MetadataService.getAll();
    const meta = all.find(m => m.path === filePath);
    if (meta) setFields(meta.fields as Record<string, string>);
  }, [editor, filePath]);

  if (!filePath) return null;

  const keys = Object.keys(fields).filter(k => k !== 'title' && k !== 'tags' && k !== 'path');

  const handleApply = () => {
    if (!editor) return;
    const yaml = Object.entries(fields)
      .filter(([k]) => k !== 'path')
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');
    const full = `---\n${yaml}\n---\n`;
    // Replace or insert frontmatter
    const text = editor.getText();
    if (text.startsWith('---')) {
      const endIdx = text.indexOf('\n---\n', 4);
      if (endIdx >= 0) {
        const after = text.slice(endIdx + 5);
        editor.commands.setContent(full + after);
      }
    } else {
      editor.commands.setContent(full + text);
    }
    setEditing(false);
  };

  return (
    <div className="properties-editor" style={{ position: 'fixed', bottom: 24, left: 0, right: 0, background: 'var(--color-bg)', borderTop: '1px solid var(--color-border)', padding: '6px 16px', fontSize: 13, zIndex: 500, maxHeight: visible ? '40vh' : 'auto', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: visible ? 6 : 0 }}>
        <button onClick={() => setVisible(!visible)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 12 }}>
          {visible ? '▾ Properties' : '▸ Properties'} ({keys.length + 2})
        </button>
        {visible && <button onClick={() => setEditing(!editing)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontSize: 12 }}>{editing ? 'Cancel' : 'Edit'}</button>}
      </div>
      {visible && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
          {editing ? (
            <>
              {Object.entries(fields).filter(([k]) => k !== 'path').map(([k, v]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: 11, minWidth: 60 }}>{k}</span>
                  <input value={String(v)} onChange={e => setFields(f => ({ ...f, [k]: e.target.value }))}
                    style={{ flex: 1, padding: '2px 4px', border: '1px solid var(--border-primary)', borderRadius: 3, fontSize: 12 }} />
                </div>
              ))}
              <button onClick={handleApply} style={{ gridColumn: '1/-1', padding: '4px 12px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', marginTop: 4 }}>Apply</button>
            </>
          ) : (
            Object.entries(fields).filter(([k]) => k !== 'path').map(([k, v]) => (
              <div key={k} style={{ display: 'flex', gap: 6, padding: '2px 0' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{k}</span>
                <span style={{ fontSize: 12 }}>{String(v)}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
