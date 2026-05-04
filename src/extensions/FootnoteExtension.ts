import { Node, mergeAttributes } from '@tiptap/core';

export interface FootnoteOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    footnote: {
      insertFootnote: (content: string) => ReturnType;
    };
  }
}

export const FootnoteExtension = Node.create<FootnoteOptions>({
  name: 'footnote',

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
        renderHTML: (attributes) => {
          return {
            'data-content': attributes.content,
          };
        },
      },
      number: {
        default: 1,
        parseHTML: (element) => parseInt(element.getAttribute('data-number') || '1', 10),
        renderHTML: (attributes) => {
          return {
            'data-number': attributes.number,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="footnote"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'footnote',
        class: 'footnote-ref',
      }),
      `[${HTMLAttributes['data-number']}]`,
    ];
  },

  addCommands() {
    return {
      insertFootnote:
        (content: string) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { content },
          });
        },
    };
  },
});