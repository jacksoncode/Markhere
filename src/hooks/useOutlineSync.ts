import { useEffect } from 'react';
import type { Editor } from '@tiptap/react';

export function useOutlineSync(editor: Editor | null, onActiveIdChange: (id: string) => void) {
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    const scroller = editor.view.dom.parentElement;
    if (!scroller) return;

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (editor.isDestroyed) return;
        const rect = scroller.getBoundingClientRect();
        const midY = rect.top + rect.height * 0.3; // 30% from top

        let activeId = '';
        editor.state.doc.descendants((node, pos) => {
          if (node.type.name === 'heading') {
            try {
              const coords = editor.view.coordsAtPos(pos);
              if (coords.top <= midY) {
                const slug = node.textContent.toLowerCase().replace(/[^\w一-鿿]+/g, '-').replace(/^-+|-+$/g, '');
                activeId = slug;
              }
            } catch { /* out of viewport */ }
          }
        });
        if (activeId) onActiveIdChange(activeId);
      });
    };

    scroller.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // initial
    return () => { cancelAnimationFrame(raf); scroller.removeEventListener('scroll', onScroll); };
  }, [editor, onActiveIdChange]);
}
