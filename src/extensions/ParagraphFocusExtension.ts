import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { useUIState } from '../store/uiStore';

/**
 * Paragraph-level focus (iA Writer style): when focus mode is enabled, every
 * top-level block except the one containing the caret is dimmed. The actual
 * dimming is done in CSS via the `.pf-dim` class so themes can tune opacity.
 *
 * The plugin reads `focusMode` from the UI store. Because toggling the store
 * does not emit an editor transaction, MainEditor dispatches a meta-tagged
 * empty transaction (`{ focusModeToggled: true }`) to force a redraw.
 */

export const paragraphFocusPluginKey = new PluginKey('paragraphFocus');

function buildDecorations(doc: any, selectionHead: number): DecorationSet {
  const decorations: Decoration[] = [];
  doc.forEach((node: any, offset: number) => {
    const start = offset;
    const end = offset + node.nodeSize;
    // The active block is the top-level node whose range covers the caret.
    const isActive = selectionHead >= start && selectionHead <= end;
    if (!isActive) {
      decorations.push(
        Decoration.node(start, end, { class: 'pf-dim' }),
      );
    }
  });
  return DecorationSet.create(doc, decorations);
}

export const ParagraphFocusExtension = Extension.create({
  name: 'paragraphFocus',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: paragraphFocusPluginKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, old, _oldState, newState) {
            const enabled = useUIState.getState().focusMode;
            if (!enabled) return DecorationSet.empty;
            // Recompute when the document or selection changed, or when the
            // focus-mode toggle was signalled via transaction meta.
            if (tr.docChanged || tr.selectionSet || tr.getMeta(paragraphFocusPluginKey)) {
              return buildDecorations(newState.doc, newState.selection.head);
            }
            // Was previously empty (e.g. just enabled) — build initial set.
            if (old === DecorationSet.empty) {
              return buildDecorations(newState.doc, newState.selection.head);
            }
            return old.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});
