import { Extension } from '@tiptap/core';

/**
 * VimKeymapExtension - Vim-like editing mode for Tiptap
 * 
 * Supported bindings:
 * - Escape: Enter normal mode (cursor becomes block)
 * - i: Enter insert mode
 * - a: Append (insert after cursor)
 * - o: Open line below
 * - O: Open line above
 * - x: Delete character
 * 
 * Visual indicators via CSS classes: .vim-normal, .vim-insert
 */
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    vimKeymap: {
      enterNormalMode: () => ReturnType;
      enterInsertMode: () => ReturnType;
      toggleVisualMode: () => ReturnType;
      deleteLine: () => ReturnType;
      deleteWord: () => ReturnType;
      changeWord: () => ReturnType;
      changeLine: () => ReturnType;
      yankLine: () => ReturnType;
    };
  }
}

export type VimMode = 'normal' | 'insert' | 'visual';

export interface VimKeymapOptions {
  enabled?: boolean;
  initialMode?: VimMode;
  onModeChange?: (mode: VimMode) => void;
}

export const VimKeymapExtension = Extension.create<VimKeymapOptions>({
  name: 'vimKeymap',
  
  addOptions() {
    return {
      enabled: true,
      initialMode: 'insert',
      onModeChange: undefined,
    };
  },
  
  addCommands() {
    return {
      enterNormalMode: () => ({ editor }) => {
        editor.view.dom.classList.remove('vim-insert', 'vim-visual');
        editor.view.dom.classList.add('vim-normal');
        this.options.onModeChange?.('normal');
        return true;
      },
      enterInsertMode: () => ({ editor }) => {
        editor.view.dom.classList.remove('vim-normal', 'vim-visual');
        editor.view.dom.classList.add('vim-insert');
        this.options.onModeChange?.('insert');
        return true;
      },
      toggleVisualMode: () => ({ editor }) => {
        const dom = editor.view.dom;
        if (dom.classList.contains('vim-visual')) {
          dom.classList.remove('vim-visual');
          dom.classList.add('vim-normal');
          this.options.onModeChange?.('normal');
        } else {
          dom.classList.remove('vim-normal', 'vim-insert');
          dom.classList.add('vim-visual');
          this.options.onModeChange?.('visual');
        }
        return true;
      },
      deleteLine: () => ({ chain }) => {
        return chain()
          .clearNodes()
          .run();
      },
      deleteWord: () => ({ chain }) => {
        return chain()
          .deleteWord()
          .run();
      },
      changeWord: () => ({ chain }) => {
        return chain()
          .deleteWord()
          .run();
      },
      changeLine: () => ({ chain }) => {
        return chain()
          .clearNodes()
          .run();
      },
      yankLine: () => ({ editor }) => {
        const content = editor.getHTML();
        navigator.clipboard.writeText(content);
        return true;
      },
    };
  },
  
  addKeyboardShortcuts() {
    if (!this.options.enabled) return {} as Record<string, () => boolean>;
    
    return {
      'Escape': () => this.editor.commands.enterNormalMode(),
      'i': () => this.editor.commands.enterInsertMode(),
      'a': () => {
        this.editor.commands.enterInsertMode();
        return this.editor.chain().focus().run();
      },
      'o': () => {
        this.editor.commands.enterInsertMode();
        return this.editor.chain().focus().insertContent('\n').run();
      },
      'Shift-o': () => {
        this.editor.commands.enterInsertMode();
        return this.editor.chain().focus().insertContentAt(0, '\n').run();
      },
      'x': () => this.editor.chain().focus().deleteSelection().run(),
    };
  },
  
  onCreate() {
    const dom = this.editor.view.dom;
    dom.classList.add(`vim-${this.options.initialMode}`);
    dom.classList.add('vim-enabled');
    console.log('[VimKeymap] Vim mode enabled. Press Escape to enter normal mode.');
  },
  
  onDestroy() {
    const dom = this.editor.view.dom;
    dom.classList.remove('vim-enabled', 'vim-normal', 'vim-insert', 'vim-visual');
  },
});

export default VimKeymapExtension;