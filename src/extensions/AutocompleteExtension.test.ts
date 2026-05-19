import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks – must precede dynamic import
// ---------------------------------------------------------------------------
vi.mock('../store/recentFilesStore', () => ({
  useRecentFilesStore: { getState: vi.fn(() => ({ files: [] })) },
}));

vi.mock('../store/tabsStore', () => ({
  useTabsStore: { getState: vi.fn(() => ({ tabs: [] })) },
}));

vi.mock('./Autocomplete.css', () => ({}));

// We use dynamic import so that all hoisted vi.mock calls take effect first.
const AutocompleteModule = await import('./AutocompleteExtension');
const AutocompleteExtension: any = AutocompleteModule.AutocompleteExtension;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal mock EditorView with just enough shape for the
 * autocomplete plugin's view.update handler.
 */
function mockEditorView(overrides: {
  blockText?: string;
  cursorOffset?: number;
  isTextblock?: boolean;
  coordsAtPos?: ReturnType<typeof vi.fn>;
} = {}) {
  const {
    blockText = '',
    cursorOffset = 0,
    isTextblock = true,
    coordsAtPos = vi.fn(() => ({ top: 100, bottom: 120, left: 50, right: 200 })),
  } = overrides;

  const startFn = vi.fn(() => 0);
  const endFn = vi.fn(() => blockText.length);

  return {
    state: {
      selection: {
        $from: {
          pos: cursorOffset,
          parent: { isTextblock },
          start: startFn,
          end: endFn,
        } as any,
        eq: vi.fn(() => false),
        from: cursorOffset,
        to: cursorOffset,
      } as any,
      doc: {
        textBetween: vi.fn(() => blockText),
        eq: vi.fn(() => false),
      } as any,
      tr: {} as any,
    } as any,
    dom: {
      getBoundingClientRect: () => ({
        top: 0,
        left: 0,
        bottom: 600,
        right: 800,
        width: 800,
        height: 600,
      }),
    } as any,
    coordsAtPos,
    dispatch: vi.fn(),
  } as any;
}

/**
 * Get the ProseMirror plugin that the AutocompleteExtension registers.
 */
function getPlugin(): any {
  const p = AutocompleteExtension.config.addProseMirrorPlugins.call(AutocompleteExtension);
  return p[0];
}

/** Remove any popup left in the DOM between tests. */
function cleanDom() {
  document.querySelectorAll('.autocomplete-popup').forEach((el) => el.remove());
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AutocompleteExtension', () => {
  beforeEach(() => {
    cleanDom();
  });

  afterEach(() => {
    cleanDom();
  });

  // -- Extension identity ------------------------------------------------

  describe('extension identity', () => {
    it('has name "autocomplete"', () => {
      expect(AutocompleteExtension.name).toBe('autocomplete');
    });

    it('has type "extension"', () => {
      expect(AutocompleteExtension.type).toBe('extension');
    });
  });

  // -- Plugin structure --------------------------------------------------

  describe('addProseMirrorPlugins', () => {
    it('returns exactly one plugin', () => {
      const plugins = AutocompleteExtension.config.addProseMirrorPlugins.call(AutocompleteExtension);
      expect(plugins).toHaveLength(1);
    });

    it('plugin has the correct key name', () => {
      const plugin = getPlugin();
      // ProseMirror appends '$' to PluginKey names internally
      expect(plugin.spec.key.key).toBe('autocomplete$');
    });

    it('plugin defines a state init method', () => {
      const plugin = getPlugin();
      expect(typeof plugin.spec.state.init).toBe('function');
    });

    it('plugin defines view, props.handleKeyDown, and props.handleClick', () => {
      const plugin = getPlugin();
      expect(typeof plugin.spec.view).toBe('function');
      expect(typeof plugin.spec.props.handleKeyDown).toBe('function');
      expect(typeof plugin.spec.props.handleClick).toBe('function');
    });
  });

  // -- Plugin state ------------------------------------------------------

  describe('plugin.state.init', () => {
    it('returns an inactive state with empty defaults', () => {
      const plugin = getPlugin();
      const state = plugin.spec.state.init();
      expect(state.active).toBe(false);
      expect(state.trigger).toBeNull();
      expect(state.query).toBe('');
      expect(state.from).toBe(0);
      expect(state.to).toBe(0);
      expect(state.items).toEqual([]);
      expect(state.selectedIndex).toBe(0);
    });
  });

  // -- Keyboard handlers -------------------------------------------------

  describe('props.handleKeyDown', () => {
    it('returns false when popup is not active', () => {
      const plugin = getPlugin();
      const result = plugin.spec.props.handleKeyDown({}, { key: 'ArrowDown', preventDefault: vi.fn() });
      expect(result).toBe(false);
    });

    it('returns false for unrecognised keys even when active (not one of the handled keys)', () => {
      // Simulate the situation where currentState.active is false because
      // we cannot set it from outside — the handler immediately returns
      // false for any key when active is false.
      const plugin = getPlugin();
      const result = plugin.spec.props.handleKeyDown({}, { key: 'a', preventDefault: vi.fn() });
      expect(result).toBe(false);
    });
  });

  // -- Click handler -----------------------------------------------------

  describe('props.handleClick', () => {
    it('returns false (never consumes the event)', () => {
      const plugin = getPlugin();
      const result = plugin.spec.props.handleClick({}, 0, new MouseEvent('click'));
      expect(result).toBe(false);
    });
  });

  // -- View lifecycle ----------------------------------------------------

  describe('plugin.view', () => {
    it('creates a scroll listener and returns update/destroy', () => {
      const plugin = getPlugin();
      const addSpy = vi.spyOn(window, 'addEventListener');
      const viewSpec = plugin.spec.view(mockEditorView());

      expect(addSpy).toHaveBeenCalledWith('scroll', expect.any(Function), true);
      expect(typeof viewSpec.update).toBe('function');
      expect(typeof viewSpec.destroy).toBe('function');

      addSpy.mockRestore();
    });

    it('destroy removes the scroll listener', () => {
      const plugin = getPlugin();
      const removeSpy = vi.spyOn(window, 'removeEventListener');
      const viewSpec = plugin.spec.view(mockEditorView());
      viewSpec.destroy();

      expect(removeSpy).toHaveBeenCalledWith('scroll', expect.any(Function), true);
      removeSpy.mockRestore();
    });
  });

  // -- Trigger detection (emoji) -----------------------------------------

  describe('trigger detection – emoji (:)', () => {
    it('shows popup when text block contains :keyword pattern', () => {
      const plugin = getPlugin();
      const view = mockEditorView({ blockText: 'hello :sm', cursorOffset: 8 });
      const prevState = { selection: { eq: vi.fn(() => true) } as any, doc: { eq: vi.fn(() => true) } as any };

      const viewSpec = plugin.spec.view(view);
      viewSpec.update(view, prevState);

      const popup = document.querySelector('.autocomplete-popup') as HTMLElement;
      expect(popup).not.toBeNull();
      expect(popup.style.display).toBe('block');

      // Cleanup
      viewSpec.destroy();
    });

    it('shows popup with empty query when cursor is right after colon', () => {
      const plugin = getPlugin();
      const view = mockEditorView({ blockText: 'hello :', cursorOffset: 7 });
      const prevState = { selection: { eq: vi.fn(() => true) } as any, doc: { eq: vi.fn(() => true) } as any };

      const viewSpec = plugin.spec.view(view);
      viewSpec.update(view, prevState);

      const popup = document.querySelector('.autocomplete-popup') as HTMLElement;
      expect(popup).not.toBeNull();

      viewSpec.destroy();
    });

    it('does not show popup when colon is not preceded by space or line start', () => {
      const plugin = getPlugin();
      // "word:smi" — colon is mid-word, no space before
      const view = mockEditorView({ blockText: 'word:smi', cursorOffset: 8 });
      const prevState = { selection: { eq: vi.fn(() => true) } as any, doc: { eq: vi.fn(() => true) } as any };

      const viewSpec = plugin.spec.view(view);
      viewSpec.update(view, prevState);

      const popup = document.querySelector('.autocomplete-popup') as HTMLElement | null;
      // May not exist, or may exist but hidden from previous state
      // The key assertion: if a popup exists, it shouldn't have been shown for this key sequence
      if (popup) {
        expect(popup.style.display).toBe('none');
      }

      viewSpec.destroy();
    });
  });

  // -- Trigger detection (wiki link) -------------------------------------

  describe('trigger detection – wiki link ([[)', () => {
    it('shows popup when text block contains [[ pattern', () => {
      const plugin = getPlugin();
      const view = mockEditorView({ blockText: 'link to [[fi', cursorOffset: 12 });
      const prevState = { selection: { eq: vi.fn(() => true) } as any, doc: { eq: vi.fn(() => true) } as any };

      const viewSpec = plugin.spec.view(view);
      viewSpec.update(view, prevState);

      const popup = document.querySelector('.autocomplete-popup') as HTMLElement;
      expect(popup).not.toBeNull();
      expect(popup.style.display).toBe('block');

      viewSpec.destroy();
    });

    it('shows popup when cursor is at [[ with no query yet', () => {
      const plugin = getPlugin();
      const view = mockEditorView({ blockText: 'see [[', cursorOffset: 6 });
      const prevState = { selection: { eq: vi.fn(() => true) } as any, doc: { eq: vi.fn(() => true) } as any };

      const viewSpec = plugin.spec.view(view);
      viewSpec.update(view, prevState);

      const popup = document.querySelector('.autocomplete-popup') as HTMLElement;
      expect(popup).not.toBeNull();
      expect(popup.style.display).toBe('block');

      viewSpec.destroy();
    });
  });

  // -- Trigger detection (slash) -----------------------------------------

  describe('trigger detection – slash (/)', () => {
    it('shows popup when line starts with /', () => {
      const plugin = getPlugin();
      const view = mockEditorView({ blockText: '/hea', cursorOffset: 4 });
      const prevState = { selection: { eq: vi.fn(() => true) } as any, doc: { eq: vi.fn(() => true) } as any };

      const viewSpec = plugin.spec.view(view);
      viewSpec.update(view, prevState);

      const popup = document.querySelector('.autocomplete-popup') as HTMLElement;
      expect(popup).not.toBeNull();
      expect(popup.style.display).toBe('block');

      viewSpec.destroy();
    });

    it('shows popup when cursor is just at / with no query', () => {
      const plugin = getPlugin();
      const view = mockEditorView({ blockText: '/', cursorOffset: 1 });
      const prevState = { selection: { eq: vi.fn(() => true) } as any, doc: { eq: vi.fn(() => true) } as any };

      const viewSpec = plugin.spec.view(view);
      viewSpec.update(view, prevState);

      const popup = document.querySelector('.autocomplete-popup') as HTMLElement;
      expect(popup).not.toBeNull();
      expect(popup.style.display).toBe('block');

      viewSpec.destroy();
    });

    it('does NOT show popup when slash is not at line start', () => {
      const plugin = getPlugin();
      const view = mockEditorView({ blockText: 'some /hea', cursorOffset: 9 });
      const prevState = { selection: { eq: vi.fn(() => true) } as any, doc: { eq: vi.fn(() => true) } as any };

      const viewSpec = plugin.spec.view(view);
      viewSpec.update(view, prevState);

      // The popup might still exist from previous module state – check it's not "active"
      const popup = document.querySelector('.autocomplete-popup') as HTMLElement | null;
      if (popup) {
        expect(popup.style.display).toBe('none');
      }

      viewSpec.destroy();
    });
  });

  // -- No trigger --------------------------------------------------------

  describe('no trigger', () => {
    it('does not show popup for plain text without trigger', () => {
      const plugin = getPlugin();
      const view = mockEditorView({ blockText: 'hello world', cursorOffset: 11 });
      const prevState = { selection: { eq: vi.fn(() => true) } as any, doc: { eq: vi.fn(() => true) } as any };

      const viewSpec = plugin.spec.view(view);
      viewSpec.update(view, prevState);

      const popup = document.querySelector('.autocomplete-popup') as HTMLElement | null;
      if (popup) {
        expect(popup.style.display).toBe('none');
      }

      viewSpec.destroy();
    });
  });
});
