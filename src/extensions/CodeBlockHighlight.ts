import { Extension } from '@tiptap/core';

// Preload PrismJS in background
let PrismModule: any = null;
let prismLoadPromise: Promise<void> | null = null;

function preloadPrism(): Promise<void> {
  if (!prismLoadPromise) {
    prismLoadPromise = import('prismjs').then((m) => {
      PrismModule = m.default;
    });
  }
  return prismLoadPromise;
}

// Start preloading immediately
preloadPrism();

function highlightCodeBlocks(scope: HTMLElement) {
  if (!PrismModule) return;

  const codeBlocks = scope.querySelectorAll<HTMLElement>('pre code');

  codeBlocks.forEach((block) => {
    const language = block.parentElement?.getAttribute('data-language') || 'plaintext';
    if (PrismModule!.languages[language]) {
      PrismModule!.highlightElement(block);
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
    const dom = this.editor.view.dom;
    requestAnimationFrame(async () => {
      await preloadPrism();
      highlightCodeBlocks(dom);
    });
  },

  onUpdate() {
    highlightCodeBlocks(this.editor.view.dom);
  },
});
