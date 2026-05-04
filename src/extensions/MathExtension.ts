import { Node, mergeAttributes } from '@tiptap/core';
import katex from 'katex';

export interface MathOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    math: {
      insertMath: (content?: string) => ReturnType;
    };
  }
}

export const MathExtension = Node.create<MathOptions>({
  name: 'math',

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
        default: '',
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
        tag: 'div[data-type="math"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const content = HTMLAttributes['data-content'] || '';
    let rendered = '';
    
    try {
      rendered = katex.renderToString(content, {
        throwOnError: false,
        displayMode: true,
      });
    } catch (e) {
      rendered = `<span class="math-error">${content}</span>`;
    }

    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'math',
        class: 'math-block',
      }),
      [
        'div',
        { class: 'math-content' },
        rendered,
      ],
    ];
  },

  addCommands() {
    return {
      insertMath:
        (content = '') =>
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
      dom.className = 'math-block';
      dom.setAttribute('data-type', 'math');

      const contentDiv = document.createElement('div');
      contentDiv.className = 'math-content';
      
      const textarea = document.createElement('textarea');
      textarea.className = 'math-input';
      textarea.value = node.attrs.content;
      textarea.placeholder = '输入 LaTeX 公式...';
      textarea.style.display = 'none';

      const renderMath = () => {
        try {
          const html = katex.renderToString(textarea.value, {
            throwOnError: false,
            displayMode: true,
          });
          contentDiv.innerHTML = html;
        } catch (e) {
          contentDiv.innerHTML = `<span class="math-error">${textarea.value}</span>`;
        }
      };

      renderMath();

      dom.appendChild(contentDiv);
      dom.appendChild(textarea);

      dom.addEventListener('click', () => {
        textarea.style.display = 'block';
        textarea.focus();
        contentDiv.style.display = 'none';
      });

      textarea.addEventListener('blur', () => {
        textarea.style.display = 'none';
        contentDiv.style.display = 'block';
        
        const pos = getPos?.();
        if (pos !== undefined && editor.isEditable) {
          editor.commands.command(({ tr }) => {
            tr.setNodeMarkup(pos, undefined, {
              content: textarea.value,
            });
            return true;
          });
        }
        
        renderMath();
      });

      textarea.addEventListener('input', () => {
        renderMath();
      });

      return {
        dom,
        contentDOM: textarea,
      };
    };
  },
});