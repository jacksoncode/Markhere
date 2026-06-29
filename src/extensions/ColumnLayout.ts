import { Node, mergeAttributes } from '@tiptap/core';

/** ColumnLayout — multi-column container with resizable dividers (P1-6) */
export const ColumnLayout = Node.create({
  name: 'columnLayout',
  group: 'block',
  content: 'column{2}',

  parseHTML() {
    return [{ tag: 'div[data-type="columns"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'columns',
        style: 'display:flex;gap:0;position:relative;width:100%;',
      }),
      0,
    ];
  },

  addNodeView() {
    return ({ node }) => {
      // Outer wrapper
      const wrapper = document.createElement('div');
      wrapper.setAttribute('data-type', 'columns');
      wrapper.style.display = 'flex';
      wrapper.style.gap = '0';
      wrapper.style.position = 'relative';
      wrapper.style.width = '100%';

      // Inner content container — ProseMirror manages children here
      const inner = document.createElement('div');
      inner.style.display = 'flex';
      inner.style.gap = '0';
      inner.style.width = '100%';
      wrapper.appendChild(inner);

      const colCount = node.childCount;
      const widths: number[] = new Array(colCount).fill(100 / colCount);
      const handles: HTMLElement[] = [];

      function createHandles() {
        handles.forEach(h => h.remove());
        handles.length = 0;

        for (let i = 0; i < colCount - 1; i++) {
          const handle = document.createElement('div');
          handle.className = 'column-resize-handle';
          Object.assign(handle.style, {
            position: 'absolute',
            top: '0',
            width: '6px',
            cursor: 'col-resize',
            zIndex: '10',
            userSelect: 'none',
            background: 'transparent',
            transition: 'background 0.15s',
            height: '100%',
          });
          handle.style.left = (widths.slice(0, i + 1).reduce((a: number, b: number) => a + b, 0) - 0.3) + '%';

          handle.addEventListener('mouseenter', () => {
            handle.style.background = 'var(--color-primary, #4ecdc4)';
          });
          handle.addEventListener('mouseleave', () => {
            handle.style.background = 'transparent';
          });

          let dragging = false;
          let startX = 0;

          handle.addEventListener('pointerdown', (e: PointerEvent) => {
            e.preventDefault();
            e.stopPropagation();
            dragging = true;
            startX = e.clientX;
            handle.setPointerCapture(e.pointerId);
            handle.style.background = 'var(--color-primary, #4ecdc4)';
            document.body.style.userSelect = 'none';
          });

          handle.addEventListener('pointermove', (e: PointerEvent) => {
            if (!dragging) return;
            const dx = e.clientX - startX;
            const rect = wrapper.getBoundingClientRect();
            if (rect.width === 0) return;
            const pxPct = (dx / rect.width) * 100;
            const minEach = 15;
            const total = widths[i] + widths[i + 1];
            const newLeft = Math.max(minEach, Math.min(total - minEach, widths[i] + pxPct));
            const newRight = total - newLeft;
            widths[i] = newLeft;
            widths[i + 1] = newRight;

            const cols = inner.querySelectorAll('[data-type="column"]');
            cols.forEach((col, idx) => {
              (col as HTMLElement).style.flex = '0 0 ' + widths[idx] + '%';
              (col as HTMLElement).style.maxWidth = widths[idx] + '%';
            });
            updateHandles();
          });

          handle.addEventListener('pointerup', () => {
            if (dragging) {
              dragging = false;
              document.body.style.userSelect = '';
              handle.style.background = 'transparent';
            }
          });

          wrapper.appendChild(handle);
          handles.push(handle);
        }
      }

      function updateHandles() {
        handles.forEach((h, idx) => {
          const sum = widths.slice(0, idx + 1).reduce((a: number, b: number) => a + b, 0);
          h.style.left = (sum - 0.3) + '%';
        });
      }

      // Apply widths after DOM is built
      requestAnimationFrame(() => {
        const cols = inner.querySelectorAll('[data-type="column"]');
        cols.forEach((col, idx) => {
          (col as HTMLElement).style.flex = '0 0 ' + widths[idx] + '%';
          (col as HTMLElement).style.maxWidth = widths[idx] + '%';
        });
        createHandles();
      });

      // Observer to handle column count changes (e.g., undo adds/removes columns)
      const observer = new MutationObserver(() => {
        const currentCols = inner.querySelectorAll('[data-type="column"]');
        const newCount = currentCols.length;
        if (newCount >= 2) {
          const equal = 100 / newCount;
          for (let i = 0; i < newCount; i++) { widths[i] = equal; }
          widths.length = newCount;
          currentCols.forEach((col, idx) => {
            (col as HTMLElement).style.flex = '0 0 ' + widths[idx] + '%';
            (col as HTMLElement).style.maxWidth = widths[idx] + '%';
          });
          createHandles();
        }
      });
      observer.observe(inner, { childList: true });

      return {
        dom: wrapper,
        // ProseMirror manages children inside 'inner'
        contentDOM: inner,

        update(updatedNode) {
          if (updatedNode.type !== node.type) return false;
          // Re-apply widths after ProseMirror re-renders children
          requestAnimationFrame(() => {
            const cols = inner.querySelectorAll('[data-type="column"]');
            cols.forEach((col, idx) => {
              (col as HTMLElement).style.flex = '0 0 ' + widths[idx] + '%';
              (col as HTMLElement).style.maxWidth = widths[idx] + '%';
            });
            updateHandles();
          });
          return true;
        },

        destroy() {
          observer.disconnect();
          handles.forEach(h => h.remove());
          handles.length = 0;
        },

        ignoreMutation(mutation: any) {
          const target = mutation.target as HTMLElement;
          return target.closest('.column-resize-handle') !== null;
        },
      };
    };
  },
});

/** Column — single column inside a ColumnLayout */
export const Column = Node.create({
  name: 'column',
  group: 'block',
  content: 'block+',

  parseHTML() {
    return [{ tag: 'div[data-type="column"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'column',
        style: 'flex:1;min-width:0;padding:0 8px;',
      }),
      0,
    ];
  },
});
