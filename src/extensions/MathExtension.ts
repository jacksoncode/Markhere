import { Node, mergeAttributes, InputRule } from '@tiptap/core';

// ---- Dynamic KaTeX loading ----

let katexModule: typeof import('katex').default | null = null;
let katexLoadPromise: Promise<void> | null = null;

function preloadKatex(): Promise<void> {
  if (!katexLoadPromise) {
    katexLoadPromise = Promise.all([
      import('katex'),
      import('katex/dist/katex.min.css'),
    ]).then(([m]) => {
      katexModule = m.default;
    });
  }
  return katexLoadPromise;
}

// Start preloading in background
preloadKatex();

// Exported for tests to await katex readiness
export { preloadKatex as _loadKatex };

// ---- Utility ----

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function safeKatexRender(content: string, displayMode: boolean): string {
  if (!content || content.trim().length === 0) {
    return '';
  }

  try {
    if (typeof katexModule?.renderToString !== 'function') {
      return `<span class="math-error math-fallback" data-latex="${escapeHtml(content)}">${escapeHtml(content)}</span>`;
    }

    const rendered = katexModule.renderToString(content, {
      throwOnError: false,
      displayMode,
      strict: false,
      trust: false,
    });
    return rendered;
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    return `<span class="math-error" title="KaTeX error: ${escapeHtml(errMsg)}" data-latex="${escapeHtml(content)}">${escapeHtml(content)}</span>`;
  }
}

// ---- Shared options type ----

export interface MathOptions {
  HTMLAttributes: Record<string, any>;
}

// ---- Tiptap command declarations ----

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    math: {
      insertMath: (content?: string) => ReturnType;
    };
    inlineMath: {
      insertInlineMath: (content?: string) => ReturnType;
    };
  }
}

// ====================================================================
// Block Math Extension  ($$ ... $$)
// ====================================================================

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
        renderHTML: (attributes) => ({
          'data-content': attributes.content,
        }),
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
    const content = (HTMLAttributes['data-content'] as string) || '';
    const rendered = safeKatexRender(content, true);

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

  addInputRules() {
    return [
      new InputRule({
        find: /\$\$([^\$]+)\$\$\s*$/,
        handler: ({ range, match, chain }) => {
          const content = match[1].trim();
          chain()
            .deleteRange({ from: range.from, to: range.to })
            .insertContentAt(range.from, {
              type: 'math',
              attrs: { content },
            })
            .run();
        },
      }),
    ];
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
      textarea.placeholder = 'Enter LaTeX formula...';
      textarea.style.display = 'none';

      const renderMath = async () => {
        const val = textarea.value;
        if (!val || val.trim().length === 0) {
          contentDiv.innerHTML = '';
          return;
        }
        await preloadKatex();
        contentDiv.innerHTML = safeKatexRender(val, true);
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

// ====================================================================
// Inline Math Extension  ($ ... $)
// ====================================================================

export const InlineMathExtension = Node.create<MathOptions>({
  name: 'inlineMath',

  group: 'inline',

  inline: true,

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
        renderHTML: (attributes) => ({
          'data-content': attributes.content,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="inlineMath"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const content = (HTMLAttributes['data-content'] as string) || '';
    const rendered = safeKatexRender(content, false);

    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'inlineMath',
        class: 'math-inline',
      }),
      rendered,
    ];
  },

  addCommands() {
    return {
      insertInlineMath:
        (content = '') =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { content },
          });
        },
    };
  },

  addInputRules() {
    return [
      new InputRule({
        find: /(?<!\$)\$([^\$\s](?:[^\$]*[^\$\s])?)\$$/,
        handler: ({ range, match, chain }) => {
          const content = match[1].trim();
          chain()
            .deleteRange({ from: range.from, to: range.to })
            .insertContentAt(range.from, {
              type: 'inlineMath',
              attrs: { content },
            })
            .run();
        },
      }),
    ];
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const dom = document.createElement('span');
      dom.className = 'math-inline math-inline-editable';
      dom.setAttribute('data-type', 'inlineMath');

      const contentSpan = document.createElement('span');
      contentSpan.className = 'math-content math-inline-content';

      const textarea = document.createElement('textarea');
      textarea.className = 'math-input math-inline-input';
      textarea.value = node.attrs.content;
      textarea.placeholder = 'Enter LaTeX...';
      textarea.style.display = 'none';
      textarea.rows = 1;
      textarea.style.width = '200px';

      const renderMath = async () => {
        const val = textarea.value;
        if (!val || val.trim().length === 0) {
          contentSpan.innerHTML = '';
          return;
        }
        await preloadKatex();
        contentSpan.innerHTML = safeKatexRender(val, false);
      };

      renderMath();

      dom.appendChild(contentSpan);
      dom.appendChild(textarea);

      dom.addEventListener('click', (e) => {
        e.stopPropagation();
        textarea.style.display = 'inline-block';
        textarea.focus();
        contentSpan.style.display = 'none';
      });

      textarea.addEventListener('blur', () => {
        textarea.style.display = 'none';
        contentSpan.style.display = 'inline';

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
