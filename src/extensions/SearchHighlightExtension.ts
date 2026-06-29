import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

/**
 * Inline highlighting of search matches inside the editor, matching the query
 * used by the search panel. Uses ProseMirror decorations so the document itself
 * is untouched and highlighting survives edits until the next search pass.
 */

export interface SearchState {
  query: string;
  useRegex: boolean;
  caseSensitive: boolean;
  activeIndex: number;
}

export const searchHighlightPluginKey = new PluginKey('searchHighlight');

function buildDecorations(
  doc: any,
  { query, useRegex, caseSensitive, activeIndex }: SearchState,
): { decorations: DecorationSet; activePos: number | null } {
  if (!query.trim()) return { decorations: DecorationSet.empty, activePos: null };

  const flags = caseSensitive ? 'g' : 'gi';
  const pattern = useRegex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let regex: RegExp;
  try {
    regex = new RegExp(pattern, flags);
  } catch {
    return { decorations: DecorationSet.empty, activePos: null };
  }

  const decorations: Decoration[] = [];
  let matchCount = 0;
  let activePos: number | null = null;

  doc.descendants((node: any, pos: number) => {
    if (!node.isText) return;
    const text = node.text || '';
    let m: RegExpExecArray | null;
    regex.lastIndex = 0;
    while ((m = regex.exec(text)) !== null) {
      const matchFrom = pos + m.index;
      const matchTo = matchFrom + m[0].length;

      const isActive = matchCount === activeIndex;
      const classes = isActive
        ? 'search-highlight search-highlight-active'
        : 'search-highlight';

      decorations.push(Decoration.inline(matchFrom, matchTo, { class: classes }));

      if (isActive) activePos = matchFrom;
      matchCount++;

      if (m.index === m[0].length) {
        regex.lastIndex++; // avoid zero-length infinite loop
      }
    }
  });

  return { decorations: DecorationSet.create(doc, decorations), activePos };
}

export const SearchHighlightExtension = Extension.create({
  name: 'searchHighlight',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: searchHighlightPluginKey,
        state: {
          init() {
            return {
              query: '',
              useRegex: false,
              caseSensitive: false,
              activeIndex: 0,
            };
          },
          apply(tr, value) {
            const newValue = tr.getMeta(searchHighlightPluginKey);
            if (newValue) return { ...value, ...newValue };
            return value;
          },
        },
        props: {
          decorations(state) {
            const value = (this.getState(state) as SearchState | undefined) ?? {
              query: '', useRegex: false, caseSensitive: false, activeIndex: 0,
            };
            return buildDecorations(state.doc, value).decorations;
          },
        },
      }),
    ];
  },
});

/**
 * Update the search query and options in the highlight plugin, and return the
 * document position of the active match so the search panel can scroll to it.
 */
export function setSearchHighlight(
  editor: any,
  state: Partial<SearchState>,
): { activePos: number | null } {
  if (!editor || editor.isDestroyed) return { activePos: null };
  const current = (searchHighlightPluginKey.getState(editor.state) as SearchState | undefined) ?? {
    query: '', useRegex: false, caseSensitive: false, activeIndex: 0,
  };
  const next = { ...current, ...state };
  const { activePos } = buildDecorations(editor.state.doc, next);
  const tr = editor.state.tr.setMeta(searchHighlightPluginKey, next);
  editor.view.dispatch(tr);
  return { activePos };
}

export function clearSearchHighlight(editor: any): void {
  setSearchHighlight(editor, { query: '', activeIndex: 0 });
}
