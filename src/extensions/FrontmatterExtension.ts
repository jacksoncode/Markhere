import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { FrontmatterView } from './FrontmatterView';

export interface FrontmatterOptions {
  HTMLAttributes: Record<string, string>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    frontmatter: {
      setFrontmatter: (content: string) => ReturnType;
      updateFrontmatter: (content: string) => ReturnType;
      removeFrontmatter: () => ReturnType;
    };
  }
}

export const FrontmatterExtension = Node.create<FrontmatterOptions>({
  name: 'frontmatter',

  group: 'block',

  content: 'text',

  defining: true,

  isolating: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="frontmatter"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'frontmatter',
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FrontmatterView);
  },

  addCommands() {
    return {
      setFrontmatter:
        (content: string) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            content: [{ type: 'text', text: content }],
          }),

      updateFrontmatter:
        (content: string) =>
        ({ editor }) => {
          const { state, view } = editor;
          const { tr } = state;

          state.doc.descendants((node, pos) => {
            if (node.type.name === this.name) {
              tr.setNodeMarkup(pos, undefined, { content });
              return false;
            }
          });

          view.dispatch(tr);
          return true;
        },

      removeFrontmatter:
        () =>
        ({ editor }) => {
          const { state, view } = editor;
          const { tr } = state;

          state.doc.descendants((node, pos) => {
            if (node.type.name === this.name) {
              tr.delete(pos, pos + node.nodeSize);
              return false;
            }
          });

          view.dispatch(tr);
          return true;
        },
    };
  },
});