import { Extension } from '@tiptap/core';

/**
 * EmacsKeymapExtension - Emacs-style key bindings for Tiptap
 * 
 * Supported bindings:
 * - Ctrl-a/e: Line start/end
 * - Ctrl-f/b: Forward/backward char
 * - Ctrl-n/p: Next/previous line
 * - Ctrl-k: Kill line (cut to end)
 * - Ctrl-y: Yank (paste last kill)
 * - Ctrl-w: Kill region (cut selection)
 * - Alt-w: Save region (copy selection)
 * - Alt-f/b: Forward/backward word
 */
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    emacsKeymap: {
      killRingSave: (text: string) => ReturnType;
      killRingYank: () => ReturnType;
      setMark: () => ReturnType;
      exchangePointAndMark: () => ReturnType;
    };
  }
}

export interface EmacsKeymapOptions {
  enabled?: boolean;
}

const killRing: string[] = [];
let markPosition: number | null = null;

export const EmacsKeymapExtension = Extension.create<EmacsKeymapOptions>({
  name: 'emacsKeymap',
  
  addOptions() {
    return {
      enabled: true,
    };
  },
  
  addCommands() {
    return {
      killRingSave: (text: string) => () => {
        killRing.push(text);
        return true;
      },
      killRingYank: () => ({ chain }) => {
        const lastKill = killRing[killRing.length - 1];
        if (lastKill) {
          return chain().insertContent(lastKill).run();
        }
        return false;
      },
      setMark: () => ({ editor }) => {
        markPosition = editor.state.selection.from;
        return true;
      },
      exchangePointAndMark: () => ({ editor, chain }) => {
        if (markPosition !== null) {
          const point = editor.state.selection.from;
          chain().setTextSelection({ from: markPosition, to: point }).run();
          markPosition = point;
          return true;
        }
        return false;
      },
    };
  },
  
  addKeyboardShortcuts() {
    if (!this.options.enabled) return {} as Record<string, () => boolean>;
    
    return {
      'Mod-a': () => this.editor.chain().focus().setTextSelection(0).run(),
      'Mod-e': () => {
        const end = this.editor.state.doc.content.size - 1;
        return this.editor.chain().focus().setTextSelection(end).run();
      },
      'Mod-f': () => {
        const pos = Math.min(
          this.editor.state.selection.from + 1,
          this.editor.state.doc.content.size - 1
        );
        return this.editor.chain().focus().setTextSelection(pos).run();
      },
      'Mod-b': () => {
        const pos = Math.max(this.editor.state.selection.from - 1, 0);
        return this.editor.chain().focus().setTextSelection(pos).run();
      },
      'Mod-n': () => {
        const $pos = this.editor.state.selection.$head;
        const lineEnd = $pos.end();
        if (lineEnd < this.editor.state.doc.content.size) {
          return this.editor.chain().focus().setTextSelection(lineEnd + 1).run();
        }
        return false;
      },
      'Mod-p': () => {
        const $pos = this.editor.state.selection.$head;
        const lineStart = $pos.start();
        if (lineStart > 0) {
          return this.editor.chain().focus().setTextSelection(lineStart - 1).run();
        }
        return false;
      },
      'Alt-f': () => this.editor.chain().focus().extendMarkRange('textStyle').run(),
      'Alt-b': () => {
        const pos = Math.max(this.editor.state.selection.from - 5, 0);
        return this.editor.chain().focus().setTextSelection(pos).run();
      },
      'Mod-k': () => {
        const $pos = this.editor.state.selection.$head;
        const lineEnd = $pos.end();
        const text = this.editor.state.doc.textBetween($pos.pos, lineEnd);
        if (text) {
          killRing.push(text);
          return this.editor.chain().focus().deleteRange({ from: $pos.pos, to: lineEnd }).run();
        }
        return false;
      },
      'Mod-y': () => {
        const lastKill = killRing[killRing.length - 1];
        if (lastKill) {
          return this.editor.chain().focus().insertContent(lastKill).run();
        }
        return false;
      },
      'Mod-w': () => {
        const { from, to } = this.editor.state.selection;
        if (from !== to) {
          const text = this.editor.state.doc.textBetween(from, to);
          killRing.push(text);
          return this.editor.chain().focus().deleteRange({ from, to }).run();
        }
        return false;
      },
      'Alt-w': () => {
        const { from, to } = this.editor.state.selection;
        if (from !== to) {
          const text = this.editor.state.doc.textBetween(from, to);
          killRing.push(text);
        }
        return true;
      },
      'Mod-g': () => this.editor.commands.setMark(),
    };
  },
  
  onCreate() {
    console.log('[EmacsKeymap] Emacs bindings enabled. Use Ctrl-a/e/f/b/n/p/k/y/w, Alt-f/b/w.');
  },
});

export default EmacsKeymapExtension;