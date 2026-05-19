import { Extension } from '@tiptap/core';
import Prism from 'prismjs';

/**
 * Highlight all code blocks scoped to the editor's own DOM element.
 * This avoids touching anything outside the Tiptap editor, preventing
 * conflicts with React's virtual DOM reconciliation.
 */
function highlightCodeBlocks(scope: HTMLElement) {
  const codeBlocks = scope.querySelectorAll<HTMLElement>('pre code');

  codeBlocks.forEach((block) => {
    const language = block.parentElement?.getAttribute('data-language') || 'plaintext';
    if (Prism.languages[language]) {
      Prism.highlightElement(block);
    }
  });
}

export const CodeBlockHighlight = Extension.create({
  name: 'codeBlockHighlight',

  addGlobalAttributes() {
    return [
      {
        types: ['codeBlock'],
        attributes: {
          language: {
            default: 'plaintext',
            parseHTML: (element) => element.getAttribute('data-language') || 'plaintext',
            renderHTML: (attributes) => {
              return {
                'data-language': attributes.language,
              };
            },
          },
        },
      },
    ];
  },

  onCreate() {
    // Defer initial highlighting so Prosemirror has rendered the content.
    const dom = this.editor.view.dom;
    requestAnimationFrame(() => highlightCodeBlocks(dom));
  },

  onUpdate() {
    highlightCodeBlocks(this.editor.view.dom);
  },
});