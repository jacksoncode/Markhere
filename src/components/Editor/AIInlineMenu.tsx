import { useState, useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import { AIEnhanced } from '../../services/AIEnhanced';

export function AIInlineMenu({ editor }: { editor: Editor }) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState('');

  useEffect(() => {
    if (!editor) return;
    const handler = () => {
      const { from, to, empty } = editor.state.selection;
      if (empty) { setVisible(false); return; }
      const text = editor.state.doc.textBetween(from, to);
      if (text.trim().length === 0) { setVisible(false); return; }
      const coords = editor.view.coordsAtPos(to);
      setPos({ x: coords.left + 4, y: coords.bottom + 4 });
      setSelectedText(text);
      setVisible(true);
    };
    editor.on('selectionUpdate', handler);
    return () => { editor.off('selectionUpdate', handler); };
  }, [editor]);

  if (!visible) return null;

  const actions = [
    { label: 'Polish', action: () => handle('polish') },
    { label: 'Translate', action: () => handle('translate') },
    { label: 'Summarize', action: () => handle('summarize') },
    { label: 'Expand', action: () => handle('expand') },
    { label: 'Fix Grammar', action: () => handle('fix') },
  ];

  const handle = async (type: string) => {
    setVisible(false);
    if (!editor) return;
    const { from, to } = editor.state.selection;
    let result;
    switch (type) {
      case 'polish': result = await AIEnhanced.polish(selectedText, 'professional'); break;
      case 'translate': result = await AIEnhanced.translate(selectedText, 'zh'); break;
      case 'summarize': result = await AIEnhanced.summarize(selectedText); break;
      case 'expand': result = await AIEnhanced.polish(selectedText, 'professional'); break;
      default: return;
    }
    if (editor.isDestroyed) return;
    if (result?.success && result.text) {
      editor.chain().focus().insertContentAt({ from, to }, result.text).run();
    }
  };

  return (
    <div className="ai-inline-menu" style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 2000 }}>
      {actions.map(a => (
        <button key={a.label} className="ai-inline-btn" onClick={a.action}>{a.label}</button>
      ))}
    </div>
  );
}
