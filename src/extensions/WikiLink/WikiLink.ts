import { Mark, mergeAttributes } from '@tiptap/core';

export interface WikiLinkOptions {
  HTMLAttributes: Record<string, any>;
  onLinkClick: (target: string) => void;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    wikiLink: {
      setWikiLink: (target: string, display?: string) => ReturnType;
    };
  }
}

export const WikiLink = Mark.create<WikiLinkOptions>({
  name: 'wikiLink',
  
  addOptions() {
    return {
      HTMLAttributes: {},
      onLinkClick: () => {},
    };
  },
  
  parseHTML() {
    return [
      {
        tag: 'a[data-type="wiki-link"]',
        getAttrs: (dom) => {
          const target = dom.getAttribute('data-target');
          const display = dom.getAttribute('data-display');
          return { target, display: display || target };
        },
      },
    ];
  },
  
  renderHTML({ HTMLAttributes }) {
    const target = HTMLAttributes.target || '';
    const display = HTMLAttributes.display || target;
    return [
      'a',
      mergeAttributes(this.options.HTMLAttributes, {
        'data-type': 'wiki-link',
        'data-target': target,
        'data-display': display,
        class: 'wiki-link',
      }),
      0,
    ];
  },
  
  addCommands() {
    return {
      setWikiLink:
        (target: string, display?: string) =>
        ({ commands }) => {
          return commands.setMark(this.name, {
            target,
            display: display || target,
          });
        },
    };
  },
  
  addInputRules() {
    return [];
  },
  
  addProseMirrorPlugins() {
    return [];
  },
});