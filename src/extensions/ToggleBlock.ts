/**
 * ToggleBlock Extension — Notion-style collapsible toggle block (P2-10)
 *
 * An atom node that stores a `summary` and wraps its content.
 * On click toggles between collapsed/expanded states.
 * Content is managed inside the toggle as normal blocks.
 */
import { Node, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    toggleBlock: {
      setToggleBlock: () => ReturnType;
    };
  }
}

export const ToggleBlock = Node.create({
  name: 'toggleBlock',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      open: {
        default: true,
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-open') !== 'false',
        renderHTML: (attrs) => ({ 'data-open': attrs.open ? 'true' : 'false' }),
      },
      summary: {
        default: '',
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-summary') || '',
        renderHTML: (attrs) => ({ 'data-summary': attrs.summary || '' }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="toggle-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'toggle-block',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setToggleBlock: () => ({ commands }) => {
        return commands.wrapIn('toggleBlock');
      },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Alt-t': () => this.editor.commands.setToggleBlock(),
    };
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const wrapper = document.createElement('div');
      wrapper.setAttribute('data-type', 'toggle-block');
      wrapper.className = 'toggle-block-wrapper';
      const isOpen = node.attrs.open !== false;
      wrapper.setAttribute('data-open', String(isOpen));

      // Toggle arrow + summary header
      const header = document.createElement('div');
      header.className = 'toggle-block-header';
      header.setAttribute('contenteditable', 'false');

      const arrow = document.createElement('span');
      arrow.className = 'toggle-block-arrow';
      arrow.textContent = isOpen ? '▾' : '▸';
      arrow.setAttribute('aria-hidden', 'true');
      header.appendChild(arrow);

      const summary = document.createElement('span');
      summary.className = 'toggle-block-label';
      summary.textContent = node.attrs.summary || 'Click to toggle...';
      header.appendChild(summary);

      wrapper.appendChild(header);

      // Content area (collapsible)
      const content = document.createElement('div');
      content.className = 'toggle-block-content';
      content.style.display = isOpen ? 'block' : 'none';
      wrapper.appendChild(content);

      // Toggle on click
      const toggle = () => {
        const pos = getPos();
        if (pos === undefined || pos < 0 || editor.isDestroyed) return;
        const newOpen = !isOpen;
        editor
          .chain()
          .focus()
          .setNodeSelection(pos)
          .updateAttributes('toggleBlock', { open: newOpen })
          .run();
        content.style.display = newOpen ? 'block' : 'none';
        wrapper.setAttribute('data-open', String(newOpen));
        arrow.textContent = newOpen ? '▾' : '▸';
      };

      header.addEventListener('click', (e) => {
        e.stopPropagation();
        toggle();
      });

      // Update label from first child text content on changes
      const updateLabel = () => {
        const firstText = node.textContent.trim().split('\n')[0] || '';
        if (firstText && summary.textContent !== firstText.slice(0, 60)) {
          summary.textContent = firstText.slice(0, 60) + (firstText.length > 60 ? '...' : '');
        }
      };

      return {
        dom: wrapper,
        contentDOM: content,

        update(updatedNode) {
          if (updatedNode.type !== node.type) return false;
          const newOpen = updatedNode.attrs.open !== false;
          content.style.display = newOpen ? 'block' : 'none';
          wrapper.setAttribute('data-open', String(newOpen));
          arrow.textContent = newOpen ? '▾' : '▸';
          requestAnimationFrame(updateLabel);
          return true;
        },

        ignoreMutation(mutation: any) {
          return (
            mutation.target === header ||
            mutation.target === arrow ||
            mutation.target.closest('.toggle-block-header') !== null
          );
        },
      };
    };
  },
});
