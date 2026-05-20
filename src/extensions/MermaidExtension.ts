import { Node, mergeAttributes } from '@tiptap/core';
import mermaid from 'mermaid';

export interface MermaidOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mermaid: {
      insertMermaid: (content?: string) => ReturnType;
    };
  }
}

let mermaidInitialized = false;

function ensureMermaid() {
  if (!mermaidInitialized) {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
    });
    mermaidInitialized = true;
  }
}

export const MermaidExtension = Node.create<MermaidOptions>({
  name: 'mermaid',

  group: 'block',

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      content: {
        default: 'graph TD\n  A[Start] --> B[End]',
        parseHTML: (element) => element.getAttribute('data-content') || '',
        renderHTML: (attributes) => {
          return {
            'data-content': attributes.content,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="mermaid"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'mermaid',
        class: 'mermaid-block',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      insertMermaid:
        (content = 'graph TD\n  A[Start] --> B[End]') =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { content },
          });
        },
    };
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const dom = document.createElement('div');
      dom.className = 'mermaid-block';
      dom.setAttribute('data-type', 'mermaid');

      const previewDiv = document.createElement('div');
      previewDiv.className = 'mermaid-preview';

      const textarea = document.createElement('textarea');
      textarea.className = 'mermaid-input';
      textarea.value = node.attrs.content;
      textarea.placeholder = '输入 Mermaid 图表代码...';
      textarea.style.display = 'none';

      const renderMermaid = async () => {
        try {
          ensureMermaid();
          const id = `mermaid-${Date.now()}`;
          const { svg } = await mermaid.render(id, textarea.value);
          previewDiv.innerHTML = svg;
        } catch (e) {
          previewDiv.innerHTML = `<pre class="mermaid-error">${textarea.value}</pre>`;
        }
      };

      renderMermaid();

      dom.appendChild(previewDiv);
      dom.appendChild(textarea);

      dom.addEventListener('click', () => {
        textarea.style.display = 'block';
        textarea.style.height = '200px';
        textarea.focus();
        previewDiv.style.display = 'none';
      });

      textarea.addEventListener('blur', () => {
        textarea.style.display = 'none';
        previewDiv.style.display = 'block';
        
        const pos = getPos?.();
        if (pos !== undefined && editor.isEditable) {
          editor.commands.command(({ tr }) => {
            tr.setNodeMarkup(pos, undefined, {
              content: textarea.value,
            });
            return true;
          });
        }
        
        renderMermaid();
      });

      textarea.addEventListener('input', () => {
        renderMermaid();
      });

      return {
        dom,
        contentDOM: textarea,
      };
    };
  },
});