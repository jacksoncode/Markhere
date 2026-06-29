import { Node, mergeAttributes } from '@tiptap/core';
import { Fragment } from '@tiptap/pm/model';

/**
 * InlineSourceExtension — Typora-style ⌘/ per-block source toggle.
 *
 * When ⌘/ is pressed on a normal WYSIWYG block (paragraph, heading, etc.),
 * the block is replaced with an inlineSource node whose NodeView renders a
 * monospace <textarea> containing the raw text content. Pressing ⌘/ again
 * or blurring the textarea parses the edited text back into WYSIWYG nodes.
 *
 * This is a transient editing mode — inlineSource nodes never survive
 * a save/load cycle (they are serialized to plain text during markdown export).
 */

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    inlineSource: {
      toggleInlineSource: () => ReturnType;
    };
  }
}

export const InlineSourceExtension = Node.create({
  name: 'inlineSource',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      source: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-inline-source]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-inline-source': '',
        class: 'inline-source-block',
      }),
    ];
  },

  addCommands() {
    return {
      toggleInlineSource:
        () =>
        ({ editor }) => {
          const { state } = editor;
          const { selection, doc } = state;
          const { from } = selection;

          // Check if already inside an inlineSource node
          let isInlineSource = false;
          let sourceNode: any = null;
          let sourcePos = -1;
          doc.descendants((node: any, pos: number) => {
            if (node.type.name === 'inlineSource') {
              const end = pos + node.nodeSize;
              if (pos <= from && from <= end) {
                isInlineSource = true;
                sourceNode = node;
                sourcePos = pos;
                return false;
              }
            }
            return true;
          });

          if (isInlineSource && sourceNode && sourcePos >= 0) {
            // Convert back to WYSIWYG
            return convertBack(editor, sourcePos, sourceNode.nodeSize, sourceNode.attrs.source);
          }

          // Find the top-level block at cursor
          const $pos = doc.resolve(from);
          const depth = $pos.depth;
          if (depth < 1) return false;
          const topNode = $pos.node(1);
          const topStart = $pos.before(1);
          const topEnd = $pos.after(1);
          if (!topNode || topNode.type.name === 'doc' || topNode.type.name === 'inlineSource') return false;

          // Get raw text content as "source"
          const text = topNode.textContent;

          // Replace with inlineSource node
          const tr = state.tr.replaceWith(
            topStart,
            topEnd,
            state.schema.nodes.inlineSource.create({ source: text }),
          );
          editor.view.dispatch(tr);
          return true;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-/': () => this.editor.commands.toggleInlineSource(),
    };
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const dom = document.createElement('div');
      dom.className = 'inline-source-block';
      dom.setAttribute('data-inline-source', '');

      // Label to indicate source mode
      const label = document.createElement('div');
      label.className = 'inline-source-label';
      label.textContent = '⌘  Source';
      dom.appendChild(label);

      const textarea = document.createElement('textarea');
      textarea.className = 'inline-source-textarea';
      textarea.value = node.attrs.source;
      textarea.spellcheck = false;
      textarea.placeholder = 'Edit Markdown source...';
      dom.appendChild(textarea);

      // Auto-focus
      setTimeout(() => textarea.focus(), 0);

      // Convert back on blur
      textarea.addEventListener('blur', () => {
        if (!editor.isEditable) return;
        const pos = getPos();
        if (pos === undefined || pos === null) return;
        const inlineNode = editor.state.doc.nodeAt(pos);
        if (!inlineNode || inlineNode.type.name !== 'inlineSource') return;
        convertBack(editor, pos, inlineNode.nodeSize, textarea.value);
      });

      // ⌘/ inside textarea also converts back
      textarea.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === '/') {
          e.preventDefault();
          e.stopPropagation();
          textarea.blur();
        }
      });

      return {
        dom,
        ignoreMutation: () => true,
      };
    };
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any) {
          // Serialize to plain text so it round-trips as raw markdown.
          state.write(node.attrs.source);
          state.closeBlock(node);
        },
      },
    };
  },
});

// ─── Helper: parse markdown and replace inlineSource with WYSIWYG nodes ───

function convertBack(editor: any, pos: number, nodeSize: number, sourceText: string): boolean {
  const { state, view } = editor;

  // Try to parse as markdown using tiptap-markdown
  const mdStorage = (editor as any).storage?.markdown;
  let parsedContent: any;

  if (mdStorage?.parser?.parse) {
    try {
      const parsed = mdStorage.parser.parse(sourceText);
      // parser.parse may return a Fragment, an array of nodes, or HTML.
      if (typeof parsed === 'string') {
        // HTML string — use schema to parse
        parsedContent = state.schema.parseFromHTML(parsed);
      } else if (Array.isArray(parsed)) {
        // Array of nodes — wrap in a Fragment
        parsedContent = Fragment.fromArray(parsed);
      } else {
        // Already a Fragment or single Node
        parsedContent = parsed;
      }
    } catch {
      parsedContent = null;
    }
  }

  if (!parsedContent) {
    // Fallback: insert as a single paragraph with the raw text
    parsedContent = state.schema.nodes.paragraph.create(
      {},
      state.schema.text(sourceText || ''),
    );
  }

  const tr = state.tr.replaceWith(pos, pos + nodeSize, parsedContent);
  view.dispatch(tr);
  return true;
}
