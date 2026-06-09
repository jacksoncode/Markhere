import { useEffect, useState, useRef, useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import { SLASH_ITEMS, type SlashItem } from '../../extensions/SlashCommand';

export function SlashMenu({ editor }: { editor: Editor }) {
  const [items, setItems] = useState<SlashItem[]>([]);
  const [visible, setVisible] = useState(false);
  const [selected, setSelected] = useState(0);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editor) return;
    const handler = () => {
      const { from } = editor.state.selection;
      const $pos = editor.state.doc.resolve(from);
      const nodeBefore = $pos.nodeBefore;
      const text = nodeBefore?.text || '';
      const slashIdx = text.lastIndexOf('/');
      
      if (slashIdx >= 0 && (slashIdx === 0 || text[slashIdx-1] === ' ' || text[slashIdx-1] === '\n')) {
        const query = text.slice(slashIdx + 1).toLowerCase();
        const filtered = SLASH_ITEMS.filter(i => 
          !query || i.label.toLowerCase().includes(query) || i.id.toLowerCase().includes(query)
        );
        setItems(filtered);
        if (filtered.length > 0) {
          const coords = editor.view.coordsAtPos(from);
          setPos({ x: coords.left, y: coords.bottom + 4 });
          setVisible(true);
          setSelected(0);
        } else {
          setVisible(false);
        }
      } else {
        setVisible(false);
      }
    };
    editor.on('update', handler);
    editor.on('selectionUpdate', handler);
    return () => { editor.off('update', handler); editor.off('selectionUpdate', handler); };
  }, [editor]);

  const execute = useCallback((item: SlashItem) => {
    if (!editor) return;
    const { from } = editor.state.selection;
    const $pos = editor.state.doc.resolve(from);
    const nodeBefore = $pos.nodeBefore;
    const text = nodeBefore?.text || '';
    const slashIdx = text.lastIndexOf('/');
    const start = from - (text.length - slashIdx);
    editor.chain().focus().deleteRange({ from: start, to: from }).run();
    item.action(editor);
    setVisible(false);
  }, [editor]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => (s + 1) % items.length); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => (s - 1 + items.length) % items.length); }
      if (e.key === 'Enter') { e.preventDefault(); if (items[selected]) execute(items[selected]); }
      if (e.key === 'Escape') setVisible(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [visible, items, selected, execute]);

  if (!visible || items.length === 0) return null;

  const groups = [...new Set(items.map(i => i.group))];

  return (
    <div ref={ref} className="slash-menu" style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 2000 }}>
      {groups.map(group => (
        <div key={group} className="slash-group">
          <div className="slash-group-label">{group}</div>
          {items.filter(i => i.group === group).map((item) => {
            const globalIdx = items.indexOf(item);
            return (
              <div key={item.id} className={`slash-item${globalIdx === selected ? ' selected' : ''}`}
                onClick={() => execute(item)} onMouseEnter={() => setSelected(globalIdx)}>
                <span className="slash-icon">{item.icon}</span>
                <span>{item.label}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
