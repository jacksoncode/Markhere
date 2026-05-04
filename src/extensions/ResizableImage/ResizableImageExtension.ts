import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ResizableImageView } from './ResizableImageView';

export interface ResizableImageOptions {
  HTMLAttributes: Record<string, string>;
  inline: boolean;
  allowBase64: boolean;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    resizableImage: {
      setImage: (options: { src: string; alt?: string; title?: string; width?: number; height?: number }) => ReturnType;
      updateImage: (options: { src?: string; alt?: string; title?: string; width?: number; height?: number }) => ReturnType;
    };
  }
}

export const ResizableImageExtension = Node.create<ResizableImageOptions>({
  name: 'resizableImage',

  group: 'block',

  atom: true,

  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      inline: false,
      allowBase64: true,
    };
  },

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (el) => el.getAttribute('src'),
        renderHTML: (attrs) => {
          if (!attrs.src) return {};
          return { src: attrs.src };
        },
      },
      alt: {
        default: null,
        parseHTML: (el) => el.getAttribute('alt'),
        renderHTML: (attrs) => {
          if (!attrs.alt) return {};
          return { alt: attrs.alt };
        },
      },
      title: {
        default: null,
        parseHTML: (el) => el.getAttribute('title'),
        renderHTML: (attrs) => {
          if (!attrs.title) return {};
          return { title: attrs.title };
        },
      },
      width: {
        default: null,
        parseHTML: (el) => {
          const width = el.getAttribute('width');
          return width ? parseInt(width) : null;
        },
        renderHTML: (attrs) => {
          if (!attrs.width) return {};
          return { width: attrs.width };
        },
      },
      height: {
        default: null,
        parseHTML: (el) => {
          const height = el.getAttribute('height');
          return height ? parseInt(height) : null;
        },
        renderHTML: (attrs) => {
          if (!attrs.height) return {};
          return { height: attrs.height };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'img[src]',
        getAttrs: (el) => ({
          src: (el as HTMLElement).getAttribute('src'),
          alt: (el as HTMLElement).getAttribute('alt'),
          title: (el as HTMLElement).getAttribute('title'),
          width: parseInt((el as HTMLElement).getAttribute('width') || '0') || null,
          height: parseInt((el as HTMLElement).getAttribute('height') || '0') || null,
        }),
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { width, height } = node.attrs;
    const style = width ? `width: ${width}px${height ? `; height: ${height}px` : ''}` : '';
    
    return [
      'img',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        style,
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },

  addCommands() {
    return {
      setImage:
        (options) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: options,
          }),

      updateImage:
        (options) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, options),
    };
  },
});