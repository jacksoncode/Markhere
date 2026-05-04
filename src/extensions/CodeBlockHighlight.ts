import { Extension } from '@tiptap/core';
import Prism from 'prismjs';

function highlightCodeBlocks() {
  const codeBlocks = document.querySelectorAll('pre code');
  
  codeBlocks.forEach((block) => {
    const language = block.parentElement?.getAttribute('data-language') || 'plaintext';
    if (Prism.languages[language]) {
      Prism.highlightElement(block as HTMLElement);
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
    setTimeout(highlightCodeBlocks, 100);
  },

  onUpdate() {
    highlightCodeBlocks();
  },
});