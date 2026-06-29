import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, Selection, TextSelection } from '@tiptap/pm/state';

/**
 * Auto-pairing of brackets and quotes — a baseline writing convenience that
 * every mainstream editor (Typora, VS Code, Notion, Obsidian) provides.
 *
 * Behaviour:
 *  - Typing an opening character inserts the matching closing character and
 *    keeps the cursor between the pair.
 *  - With a non-empty selection, typing an opening character wraps the
 *    selection in the pair instead of replacing it.
 *  - Typing a closing character when the cursor already sits directly before
 *    that same closing character "types over" it rather than inserting a
 *    duplicate.
 *  - Backspace at the caret between an empty pair deletes both characters.
 */

const PAIRS: Record<string, string> = {
  '(': ')',
  '[': ']',
  '{': '}',
  '"': '"',
  "'": "'",
  '`': '`',
};

const CLOSERS = new Set(Object.values(PAIRS));

// Characters after which an opening quote should NOT auto-pair, to avoid
// fighting apostrophes in contractions (e.g. "don't", "it's").
const QUOTE_CHARS = new Set(['"', "'", '`']);

export const autoPairPluginKey = new PluginKey('autoPair');

export const AutoPairExtension = Extension.create({
  name: 'autoPair',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: autoPairPluginKey,
        props: {
          handleTextInput(view, from, to, text) {
            const { state } = view;
            const open = text;
            const close = PAIRS[open];

            // ---- Type-over an existing closing character ----
            if (CLOSERS.has(text) && from === to) {
              const charAfter = state.doc.textBetween(from, from + 1);
              if (charAfter === text) {
                view.dispatch(
                  state.tr.setSelection(
                    Selection.near(state.doc.resolve(from + 1)),
                  ),
                );
                return true;
              }
            }

            if (!close) return false;

            // ---- Wrap a non-empty selection ----
            if (from !== to) {
              const selected = state.doc.textBetween(from, to);
              const tr = state.tr.insertText(open + selected + close, from, to);
              // Re-select the wrapped text (between the inserted pair)
              tr.setSelection(
                TextSelection.create(tr.doc, from + 1, from + 1 + selected.length),
              );
              view.dispatch(tr);
              return true;
            }

            // ---- Empty selection: avoid pairing quotes inside words ----
            if (QUOTE_CHARS.has(open)) {
              const charBefore = state.doc.textBetween(Math.max(0, from - 1), from);
              if (charBefore && /[\w一-龥]/.test(charBefore)) {
                return false;
              }
            }

            // Don't auto-pair when the next character is a word character —
            // inserting a closer there would be intrusive.
            const charAfter = state.doc.textBetween(from, from + 1);
            if (charAfter && /[\w一-龥]/.test(charAfter)) {
              return false;
            }

            const tr = state.tr.insertText(open + close, from, to);
            tr.setSelection(Selection.near(tr.doc.resolve(from + 1)));
            view.dispatch(tr);
            return true;
          },

          handleKeyDown(view, event) {
            if (event.key !== 'Backspace') return false;
            const { state } = view;
            const { from, to, empty } = state.selection;
            if (!empty) return false;

            const charBefore = state.doc.textBetween(Math.max(0, from - 1), from);
            const charAfter = state.doc.textBetween(to, to + 1);
            if (charBefore && PAIRS[charBefore] === charAfter) {
              // Delete both halves of the empty pair
              view.dispatch(state.tr.delete(from - 1, to + 1));
              return true;
            }
            return false;
          },
        },
      }),
    ];
  },
});
