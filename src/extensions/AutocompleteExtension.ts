import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { EditorView } from '@tiptap/pm/view';
import { NodeType } from '@tiptap/pm/model';
import { useRecentFilesStore } from '../store/recentFilesStore';
import { useTabsStore } from '../store/tabsStore';
import './Autocomplete.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AutocompleteItem {
  /** Unique identifier for this item */
  id: string;
  /** Primary display label */
  label: string;
  /** Secondary description (shown in muted text) */
  description?: string;
  /** Icon or emoji displayed before the label */
  icon?: string;
}

interface PluginState {
  active: boolean;
  trigger: ':' | '[[' | '/' | null;
  query: string;
  from: number;
  to: number;
  items: AutocompleteItem[];
  selectedIndex: number;
}

type TriggerType = NonNullable<PluginState['trigger']>;

// ---------------------------------------------------------------------------
// Emoji map (60+ common emojis)
// ---------------------------------------------------------------------------

const EMOJI_MAP: Record<string, string> = {
  smile: '\u{1F60A}',
  laugh: '\u{1F602}',
  wink: '\u{1F609}',
  heart: '\u{2764}\u{FE0F}',
  star: '\u{2B50}',
  fire: '\u{1F525}',
  rocket: '\u{1F680}',
  check: '\u{2705}',
  x: '\u{274C}',
  plus: '\u{2795}',
  arrow: '\u{27A1}\u{FE0F}',
  book: '\u{1F4D6}',
  pen: '\u{1F58A}\u{FE0F}',
  bulb: '\u{1F4A1}',
  gear: '\u{2699}\u{FE0F}',
  warning: '\u{26A0}\u{FE0F}',
  question: '\u{2753}',
  info: '\u{2139}\u{FE0F}',
  idea: '\u{1F4AD}',
  code: '\u{1F4BB}',
  bug: '\u{1F41B}',
  music: '\u{1F3B5}',
  camera: '\u{1F4F7}',
  phone: '\u{1F4F1}',
  mail: '\u{1F4E7}',
  link: '\u{1F517}',
  lock: '\u{1F512}',
  key: '\u{1F511}',
  clock: '\u{1F550}',
  calendar: '\u{1F4C5}',
  chart: '\u{1F4CA}',
  thumbsup: '\u{1F44D}',
  thumbsdown: '\u{1F44E}',
  clap: '\u{1F44F}',
  raised_hands: '\u{1F64C}',
  pray: '\u{1F64F}',
  eyes: '\u{1F440}',
  brain: '\u{1F9E0}',
  trophy: '\u{1F3C6}',
  party: '\u{1F389}',
  gift: '\u{1F381}',
  crown: '\u{1F451}',
  diamond: '\u{1F48E}',
  money: '\u{1F4B0}',
  lightning: '\u{26A1}',
  cloud: '\u{2601}\u{FE0F}',
  sun: '\u{2600}\u{FE0F}',
  moon: '\u{1F319}',
  rainbow: '\u{1F308}',
  snowflake: '\u{2744}\u{FE0F}',
  flower: '\u{1F338}',
  tree: '\u{1F333}',
  earth: '\u{1F30D}',
  home: '\u{1F3E0}',
  car: '\u{1F697}',
  airplane: '\u{2708}\u{FE0F}',
  coffee: '\u{2615}',
  pizza: '\u{1F355}',
  cake: '\u{1F382}',
  cookie: '\u{1F36A}',
  beer: '\u{1F37A}',
  dog: '\u{1F415}',
  cat: '\u{1F408}',
  bird: '\u{1F426}',
  fish: '\u{1F41F}',
  hourglass: '\u{23F3}',
  battery: '\u{1F50B}',
  speaker: '\u{1F50A}',
  bell: '\u{1F514}',
  memo: '\u{1F4DD}',
  paperclip: '\u{1F4CE}',
  scissors: '\u{2702}\u{FE0F}',
  pushpin: '\u{1F4CC}',
};

// ---------------------------------------------------------------------------
// Slash commands
// ---------------------------------------------------------------------------

interface SlashCommand extends AutocompleteItem {
  /** ProseMirror node type name to apply, e.g. 'heading', 'bulletList' */
  nodeType?: string;
  attrs?: Record<string, unknown>;
}

const SLASH_COMMANDS: SlashCommand[] = [
  { id: 'h1', label: 'Heading 1', description: 'Large heading', icon: 'H1', nodeType: 'heading', attrs: { level: 1 } },
  { id: 'h2', label: 'Heading 2', description: 'Medium heading', icon: 'H2', nodeType: 'heading', attrs: { level: 2 } },
  { id: 'h3', label: 'Heading 3', description: 'Small heading', icon: 'H3', nodeType: 'heading', attrs: { level: 3 } },
  { id: 'h4', label: 'Heading 4', description: 'Subheading', icon: 'H4', nodeType: 'heading', attrs: { level: 4 } },
  { id: 'h5', label: 'Heading 5', description: 'Minor heading', icon: 'H5', nodeType: 'heading', attrs: { level: 5 } },
  { id: 'h6', label: 'Heading 6', description: 'Smallest heading', icon: 'H6', nodeType: 'heading', attrs: { level: 6 } },
  { id: 'bullet', label: 'Bullet List', description: 'Unordered list', icon: '•' },
  { id: 'numbered', label: 'Numbered List', description: 'Ordered list', icon: '1.' },
  { id: 'task', label: 'Task List', description: 'Checkbox list', icon: '☐' },
  { id: 'quote', label: 'Blockquote', description: 'Quoted text', icon: '“' },
  { id: 'code', label: 'Code Block', description: 'Code snippet', icon: '</>' },
  { id: 'table', label: 'Table', description: 'Insert a table', icon: '≡' },
  { id: 'image', label: 'Image', description: 'Insert an image', icon: '\u{1F5BC}' },
  { id: 'hr', label: 'Horizontal Rule', description: 'Divider line', icon: '—' },
];

// ---------------------------------------------------------------------------
// Suggestion generators
// ---------------------------------------------------------------------------

function getEmojiItems(query: string): AutocompleteItem[] {
  const lowerQuery = query.toLowerCase();
  return Object.entries(EMOJI_MAP)
    .filter(([key]) => key.includes(lowerQuery))
    .map(([key, emoji]) => ({
      id: key,
      label: key,
      icon: emoji,
      description: emoji,
    }))
    .slice(0, 20);
}

function getSlashItems(query: string): AutocompleteItem[] {
  const lowerQuery = query.toLowerCase();
  return SLASH_COMMANDS.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(lowerQuery) ||
      cmd.id.toLowerCase().includes(lowerQuery),
  ).slice(0, 20);
}

function getWikiLinkItems(query: string): AutocompleteItem[] {
  const lowerQuery = query.toLowerCase();
  const recentFiles = useRecentFilesStore.getState().files;
  const tabs = useTabsStore.getState().tabs;

  // Merge tabs and recent files, deduplicate by path
  const seen = new Set<string>();
  const files: { path: string; name: string }[] = [];

  for (const tab of tabs) {
    if (!seen.has(tab.path)) {
      seen.add(tab.path);
      files.push({ path: tab.path, name: tab.name });
    }
  }
  for (const rf of recentFiles) {
    if (!seen.has(rf.path)) {
      seen.add(rf.path);
      files.push({ path: rf.path, name: rf.name });
    }
  }

  return files
    .filter((f) => f.name.toLowerCase().includes(lowerQuery) || f.path.toLowerCase().includes(lowerQuery))
    .slice(0, 20)
    .map((f) => ({
      id: f.path,
      label: f.name,
      description: f.path,
      icon: '\u{1F4C4}',
    }));
}

function getItems(trigger: TriggerType, query: string): AutocompleteItem[] {
  switch (trigger) {
    case ':':
      return getEmojiItems(query);
    case '/':
      return getSlashItems(query);
    case '[[':
      return getWikiLinkItems(query);
  }
}

// ---------------------------------------------------------------------------
// Trigger detection
// ---------------------------------------------------------------------------

interface DetectedTrigger {
  active: true;
  trigger: TriggerType;
  query: string;
  from: number;
  to: number;
}

interface NoTrigger {
  active: false;
}

type DetectionResult = DetectedTrigger | NoTrigger;

/**
 * Walk back from the given position within the current text block to find
 * whether a trigger character precedes the cursor.
 */
function detectTrigger(docText: string, cursorOffset: number): DetectionResult {
  const textBefore = docText.slice(0, cursorOffset);

  // Prevent matching inside code blocks -- simple heuristic: if we find a
  // backtick fence before the trigger on the same line, skip.
  const lastNewline = textBefore.lastIndexOf('\n');
  const currentLine = lastNewline === -1 ? textBefore : textBefore.slice(lastNewline + 1);

  // ---- Slash command: only at the very start of a line ----
  const slashMatch = currentLine.match(/^\/(\w*)$/);
  if (slashMatch) {
    const slashPos = (lastNewline === -1 ? 0 : lastNewline + 1);
    return {
      active: true,
      trigger: '/',
      query: slashMatch[1] || '',
      from: slashPos,
      to: cursorOffset,
    };
  }

  // ---- Emoji: match :keyword pattern (preceded by space or start-of-line) ----
  const emojiMatch = currentLine.match(/(^|[\s(]):(\w*)$/);
  if (emojiMatch) {
    const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
    const colonIdx = lineStart + emojiMatch.index! + emojiMatch[1].length;
    return {
      active: true,
      trigger: ':',
      query: emojiMatch[2] || '',
      from: colonIdx,
      to: cursorOffset,
    };
  }

  // ---- Wiki link: match [[ ... pattern ----
  const wikiMatch = currentLine.match(/\[\[([^\]]*)$/);
  if (wikiMatch) {
    const bracketIdx = wikiMatch.index!;
    const from = (lastNewline === -1 ? 0 : lastNewline + 1) + bracketIdx;
    return {
      active: true,
      trigger: '[[',
      query: wikiMatch[1] || '',
      from,
      to: cursorOffset,
    };
  }

  return { active: false };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const POPUP_CLASS = 'autocomplete-popup';
const POPUP_ITEM_CLASS = 'autocomplete-popup-item';
const POPUP_SELECTED_CLASS = 'autocomplete-popup-item-selected';

// ---------------------------------------------------------------------------
// Plugin key
// ---------------------------------------------------------------------------

const autocompletePluginKey = new PluginKey<PluginState>('autocomplete');

// ---------------------------------------------------------------------------
// Popup DOM management
// ---------------------------------------------------------------------------

let popupEl: HTMLDivElement | null = null;
let currentState: PluginState = {
  active: false,
  trigger: null,
  query: '',
  from: 0,
  to: 0,
  items: [],
  selectedIndex: 0,
};

/** Resolve a ProseMirror NodeType by name from the schema. */
function resolveNodeType(view: EditorView, name: string): NodeType | undefined {
  return (view.state.schema.nodes as Record<string, NodeType | undefined>)[name] || undefined;
}

function getOrCreatePopup(): HTMLDivElement {
  if (!popupEl) {
    popupEl = document.createElement('div');
    popupEl.className = POPUP_CLASS;
    popupEl.setAttribute('role', 'listbox');
    popupEl.setAttribute('aria-label', 'Autocomplete suggestions');
    popupEl.style.display = 'none';
    document.body.appendChild(popupEl);
  }
  return popupEl;
}

function removePopup(): void {
  if (popupEl) {
    popupEl.remove();
    popupEl = null;
  }
}

function renderPopup(items: AutocompleteItem[], selectedIndex: number): void {
  const popup = getOrCreatePopup();
  popup.innerHTML = '';

  if (items.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'autocomplete-popup-empty';
    empty.textContent = 'No results';
    popup.appendChild(empty);
    return;
  }

  const list = document.createElement('ul');
  list.className = 'autocomplete-popup-list';

  items.forEach((item, index) => {
    const li = document.createElement('li');
    li.className = POPUP_ITEM_CLASS;
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', String(index === selectedIndex));
    if (index === selectedIndex) {
      li.classList.add(POPUP_SELECTED_CLASS);
    }

    if (item.icon) {
      const iconSpan = document.createElement('span');
      iconSpan.className = 'autocomplete-popup-item-icon';
      iconSpan.textContent = item.icon;
      li.appendChild(iconSpan);
    }

    const labelSpan = document.createElement('span');
    labelSpan.className = 'autocomplete-popup-item-label';
    labelSpan.textContent = item.label;
    li.appendChild(labelSpan);

    if (item.description) {
      const descSpan = document.createElement('span');
      descSpan.className = 'autocomplete-popup-item-desc';
      descSpan.textContent = item.description;
      li.appendChild(descSpan);
    }

    li.addEventListener('mousedown', (e) => {
      e.preventDefault(); // prevent focus loss before applying
      selectItem(index);
    });

    list.appendChild(li);
  });

  popup.appendChild(list);
}

function positionPopup(view: EditorView, from: number): void {
  const popup = getOrCreatePopup();
  const start = view.coordsAtPos(from);
  const editorRect = view.dom.getBoundingClientRect();

  // Position relative to the trigger character, clamped to editor width
  const top = start.bottom + 4;
  let left = Math.max(start.left, editorRect.left + 4);

  // Prevent overflow on the right
  if (left + 280 > editorRect.right) {
    left = editorRect.right - 284;
  }

  popup.style.top = `${top}px`;
  popup.style.left = `${left}px`;
}

function selectItem(index: number): void {
  const { active, trigger, from, to, items } = currentState;
  if (!active || !trigger || index < 0 || index >= items.length) return;

  const item = items[index];
  const view = (popupEl as any)?._view as EditorView | undefined;
  if (!view) return;

  const { tr } = view.state;

  if (trigger === ':') {
    // Emoji: replace :keyword with the emoji character
    const emoji = EMOJI_MAP[item.id];
    tr.delete(from, to);
    if (emoji) {
      tr.insertText(emoji, from);
    }
  } else if (trigger === '/') {
    // Slash command: delete trigger text, then apply formatting
    tr.delete(from, to);

    const slashItem = item as SlashCommand;
    const $pos = tr.doc.resolve(from);
    const blockStart = $pos.start($pos.depth);

    if (slashItem.nodeType) {
      // Look up the NodeType by name from the schema
      const nodeType = resolveNodeType(view, slashItem.nodeType);
      if (nodeType) {
        tr.setNodeMarkup(blockStart, nodeType, slashItem.attrs);
      }
    } else {
      // Special commands: map command id to node type name
      const nodeTypeNameMap: Record<string, string> = {
        bullet: 'bulletList',
        numbered: 'orderedList',
        task: 'taskList',
        quote: 'blockquote',
        code: 'codeBlock',
        hr: 'horizontalRule',
      };
      const typeName = nodeTypeNameMap[item.id];
      if (typeName) {
        const nodeType = resolveNodeType(view, typeName);
        if (nodeType) {
          tr.setNodeMarkup(blockStart, nodeType);
        }
      } else if (item.id === 'table') {
        // Insert a 3x3 table
        const tableNodeType = resolveNodeType(view, 'table');
        const tableRowNodeType = resolveNodeType(view, 'tableRow');
        const tableCellNodeType = resolveNodeType(view, 'tableCell');
        const paragraphNodeType = resolveNodeType(view, 'paragraph');

        if (tableNodeType && tableRowNodeType && tableCellNodeType && paragraphNodeType) {
          const tableNode = tableNodeType.create(
            {},
            [0, 1, 2].map(() =>
              tableRowNodeType.create(
                {},
                [0, 1, 2].map(() =>
                  tableCellNodeType.create({}, paragraphNodeType.create()),
                ),
              ),
            ),
          );
          tr.insert(from, tableNode);
        }
      } else if (item.id === 'image') {
        // Insert placeholder image syntax
        tr.insertText('![alt text](image-url)', from);
      }
    }
  } else if (trigger === '[[') {
    // Wiki link: replace [[keyword with [[filename]]
    tr.delete(from, to);
    tr.insertText(`[[${item.label}]]`, from);
  }

  view.dispatch(tr);
  view.focus();
  hidePopup();
}

function hidePopup(): void {
  currentState = { ...currentState, active: false, trigger: null, query: '', items: [], selectedIndex: 0 };
  if (popupEl) {
    popupEl.style.display = 'none';
  }
}

function showPopup(
  view: EditorView,
  trigger: TriggerType,
  query: string,
  from: number,
  to: number,
): void {
  const items = getItems(trigger, query);
  currentState = {
    active: true,
    trigger,
    query,
    from,
    to,
    items,
    selectedIndex: 0,
  };

  renderPopup(items, 0);
  positionPopup(view, from);

  const popup = getOrCreatePopup();
  popup.style.display = 'block';
  // Stash view ref for click handler
  (popup as any)._view = view;
}

// ---------------------------------------------------------------------------
// ProseMirror plugin
// ---------------------------------------------------------------------------

const autocompletePlugin = new Plugin<PluginState>({
  key: autocompletePluginKey,

  state: {
    init(): PluginState {
      return { active: false, trigger: null, query: '', from: 0, to: 0, items: [], selectedIndex: 0 };
    },
    apply(_tr, _prev): PluginState {
      // State is managed externally via currentState; keep it in sync
      return currentState;
    },
  },

  view(editorView) {
    // Reposition popup on scroll
    const onScroll = () => {
      if (currentState.active && popupEl) {
        const v = (popupEl as any)._view as EditorView | undefined;
        if (v) {
          positionPopup(v, currentState.from);
        }
      }
    };

    window.addEventListener('scroll', onScroll, true);

    return {
      update(view, prevState) {
        // Early exit if selection and doc are unchanged
        if (
          view.state.selection.eq(prevState.selection) &&
          view.state.doc.eq(prevState.doc)
        ) {
          return;
        }

        const { $from } = view.state.selection;
        // Only detect triggers when cursor is inside a text block
        if (!$from.parent.isTextblock) {
          if (currentState.active) {
            hidePopup();
          }
          return;
        }

        const blockStart = $from.start();
        const blockEnd = $from.end();
        const blockText = view.state.doc.textBetween(blockStart, blockEnd);
        const cursorOffset = $from.pos - blockStart;

        const result = detectTrigger(blockText, cursorOffset);

        if (result.active) {
          const globalFrom = blockStart + result.from;
          const globalTo = blockStart + result.to;

          // If already active for the same trigger and position, only refresh items
          if (
            currentState.active &&
            currentState.trigger === result.trigger &&
            currentState.from === globalFrom
          ) {
            // Query may have changed -- refresh items
            if (currentState.query !== result.query) {
              const items = getItems(result.trigger, result.query);
              currentState.query = result.query;
              currentState.to = globalTo;
              currentState.items = items;
              currentState.selectedIndex = 0;
              renderPopup(items, 0);
            }
          } else {
            showPopup(editorView, result.trigger, result.query, globalFrom, globalTo);
          }
        } else if (currentState.active) {
          hidePopup();
        }
      },
      destroy() {
        window.removeEventListener('scroll', onScroll, true);
        hidePopup();
        removePopup();
      },
    };
  },

  props: {
    handleKeyDown(_view, event) {
      if (!currentState.active) return false;

      switch (event.key) {
        case 'ArrowDown': {
          event.preventDefault();
          const next = Math.min(currentState.selectedIndex + 1, currentState.items.length - 1);
          currentState.selectedIndex = next;
          renderPopup(currentState.items, next);
          return true;
        }
        case 'ArrowUp': {
          event.preventDefault();
          const prev = Math.max(currentState.selectedIndex - 1, 0);
          currentState.selectedIndex = prev;
          renderPopup(currentState.items, prev);
          return true;
        }
        case 'Enter': {
          event.preventDefault();
          selectItem(currentState.selectedIndex);
          return true;
        }
        case 'Escape': {
          event.preventDefault();
          hidePopup();
          return true;
        }
        case 'Tab': {
          // Tab also accepts the current selection
          event.preventDefault();
          selectItem(currentState.selectedIndex);
          return true;
        }
        default:
          return false;
      }
    },

    handleClick(_view, _pos, event) {
      // Close popup when clicking outside
      if (currentState.active && popupEl && !popupEl.contains(event.target as Node)) {
        hidePopup();
      }
      return false;
    },
  },
});

// ---------------------------------------------------------------------------
// Tiptap Extension
// ---------------------------------------------------------------------------

export const AutocompleteExtension = Extension.create({
  name: 'autocomplete',

  addProseMirrorPlugins() {
    return [autocompletePlugin];
  },
});
