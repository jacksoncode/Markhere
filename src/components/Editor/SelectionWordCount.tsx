import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';

interface WordCount {
  words: number;
  chars: number;
  sentences: number;
}

function countStats(text: string): WordCount {
  const cjk = (text.match(/[一-鿿]/g) || []).length;
  const latin = text.replace(/[一-鿿]/g, ' ').split(/\s+/).filter(Boolean).length;
  return {
    words: cjk + latin,
    chars: text.length,
    sentences: text.split(/[.!?。！？]+/).filter(s => s.trim()).length,
  };
}

export function SelectionWordCount({ editor }: { editor: Editor | null }) {
  const [count, setCount] = useState<WordCount | null>(null);

  useEffect(() => {
    if (!editor) return;
    const h = () => {
      const { from, to, empty } = editor.state.selection;
      if (empty) { setCount(null); return; }
      const text = editor.state.doc.textBetween(from, to);
      if (text.trim().length === 0) { setCount(null); return; }
      setCount(countStats(text));
    };
    editor.on('selectionUpdate', h);
    return () => { editor.off('selectionUpdate', h); };
  }, [editor]);

  if (!count) return null;

  return (
    <span className="selection-word-count" style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '0 8px' }}>
      {count.words} words selected
    </span>
  );
}
