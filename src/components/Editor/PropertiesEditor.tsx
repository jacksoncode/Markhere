import { useState, useEffect, useCallback } from 'react';
import type { Editor } from '@tiptap/react';

function parseFrontmatterNv(md: string): { fields: Record<string, string>; body: string } {
  const match = md.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { fields: {}, body: md };
  const yaml = match[1];
  const body = md.slice(match[0].length);
  const fields: Record<string, string> = {};
  for (const line of yaml.split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    value = value.replace(/^["']|["']$/g, '');
    fields[key] = value;
  }
  return { fields, body };
}

export function PropertiesEditor({ editor, filePath }: { editor: Editor | null; filePath: string | null }) {
  const [visible, setVisible] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editor || !filePath) { setFields({}); return; }
    try {
      const markdown = (editor.storage as any)?.markdown?.getMarkdown?.() || '';
      const { fields: fm } = parseFrontmatterNv(markdown);
      setFields(fm);
    } catch { setFields({}); }
  }, [editor, filePath]);

  const handleApply = useCallback(() => {
    if (!editor) return;
    const yaml = Object.entries(fields)
      .filter(([k]) => k !== 'path')
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');
    if (!yaml) return;
    const fullFm = `---\n${yaml}\n---\n`;
    try {
      const markdown = (editor.storage as any)?.markdown?.getMarkdown?.() || '';
      const { body } = parseFrontmatterNv(markdown);
      try { editor.commands.setContent(fullFm + body); }
      catch (nvErr) { console.warn('setContent NodeView (non-fatal):', nvErr); }
    } catch {
      const text = editor.getText();
      try { editor.commands.setContent(fullFm + text); }
      catch (nvErr) { console.warn('setContent fallback (non-fatal):', nvErr); }
    }
    setEditing(false);
  }, [editor, fields]);

  if (!filePath) return null;

  const entries = Object.entries(fields).filter(([k]) => k !== 'path');

  return (
    <div className="properties-editor" style={{ position: 'fixed', bottom: 0, left: 260, right: 0, background: 'var(--color-bg)', borderTop: '1px solid var(--color-border)', padding: '8px 20px', fontSize: 13, zIndex: 500, maxHeight: visible ? '36vh' : '32px', overflowY: 'auto', transition: 'max-height 0.2s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: visible ? 8 : 0 }}>
        <button onClick={() => setVisible(!visible)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', fontSize: 13, fontWeight: 500 }}>
          {visible ? '▾' : '▸'} Properties {entries.length > 0 ? `(${entries.length})` : ''}
        </button>
        {visible && <button onClick={() => setEditing(!editing)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-accent)', fontSize: 13 }}>{editing ? 'Cancel' : 'Edit'}</button>}
      </div>
      {visible && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {editing ? (
            <>
              {entries.length === 0 && <div style={{ gridColumn: '1/-1', color: 'var(--color-text-secondary)', fontSize: 13, padding: 8 }}>No frontmatter fields. Add below:</div>}
              {entries.map(([k, v]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: 13, minWidth: 70, fontWeight: 500 }}>{k}</span>
                  <input value={String(v)} onChange={e => setFields(f => ({ ...f, [k]: e.target.value }))}
                    style={{ flex: 1, padding: '4px 8px', border: '1px solid var(--color-border)', borderRadius: 4, fontSize: 13, background: 'var(--color-bg-secondary)', color: 'var(--color-text)' }} />
                </div>
              ))}
              <div style={{ gridColumn: '1/-1', display: 'flex', gap: 6, marginTop: 4 }}>
                <input placeholder="new field" id="prop-new-key" style={{ flex: 1, padding: '4px 8px', border: '1px solid var(--color-border)', borderRadius: 4, fontSize: 13, background: 'var(--color-bg-secondary)', color: 'var(--color-text)' }}
                  onKeyDown={e => { if (e.key !== 'Enter') return; const ve = document.getElementById('prop-new-val') as HTMLInputElement; const key = (e.target as HTMLInputElement).value.trim(); if (key) { setFields(f => ({ ...f, [key]: ve?.value || '' })); (e.target as HTMLInputElement).value = ''; if (ve) ve.value = ''; } }} />
                <input placeholder="value" id="prop-new-val" style={{ flex: 1, padding: '4px 8px', border: '1px solid var(--color-border)', borderRadius: 4, fontSize: 13, background: 'var(--color-bg-secondary)', color: 'var(--color-text)' }} />
              </div>
              <button onClick={handleApply} style={{ gridColumn: '1/-1', padding: '6px 16px', background: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', marginTop: 6, fontSize: 13 }}>Apply Changes</button>
            </>
          ) : entries.length === 0 ? (
            <div style={{ gridColumn: '1/-1', color: 'var(--color-text-secondary)', fontSize: 13, padding: 8 }}>No YAML frontmatter. Click Edit to add title, tags, date, etc.</div>
          ) : (
            entries.map(([k, v]) => (
              <div key={k} style={{ display: 'flex', gap: 6, padding: '3px 0', fontSize: 13 }}>
                <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500, minWidth: 70 }}>{k}</span>
                <span style={{ color: 'var(--color-text)' }}>{String(v)}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
