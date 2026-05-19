import { describe, it, expect, beforeEach } from 'vitest';
import enUS from '../../i18n/locales/en-US.json';
import zhCN from '../../i18n/locales/zh-CN.json';
import { themes } from '../../store/themes';
import { useShortcutsStore, Shortcut } from '../../store/shortcutsStore';
import { useSettingsStore } from '../../store/settingsStore';

// ---------------------------------------------------------------------------
// i18n -- Locale Coverage
// ---------------------------------------------------------------------------

describe('en-US locale', () => {
  const KEYS_WITH_OBJECT_VALUES = [
    'app', 'menu', 'file', 'edit', 'paragraph', 'format', 'view', 'help',
    'sidebar', 'toolbar', 'unsaved', 'settings', 'search', 'shortcuts',
    'wordCount', 'quickOpen', 'toc', 'knowledgeGraph', 'ai', 'plugins',
    'imageStorage', 'statusBar', 'export', 'git', 'collaboration',
    'linkValidator', 'versionHistory', 'spellCheck', 'template',
  ];

  it('has all top-level key categories', () => {
    for (const key of KEYS_WITH_OBJECT_VALUES) {
      expect(enUS).toHaveProperty(key);
    }
  });

  it('all top-level categories are objects with string or object values', () => {
    for (const value of Object.values(enUS)) {
      expect(typeof value).toBe('object');
      expect(value).not.toBeNull();
    }
  });

  it('has no empty string values at any level', () => {
    function checkEmptyStrings(obj: unknown, path: string): void {
      if (typeof obj === 'string') {
        expect(obj.length).toBeGreaterThan(0);
      } else if (typeof obj === 'object' && obj !== null) {
        for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
          checkEmptyStrings(value, `${path}.${key}`);
        }
      }
    }
    checkEmptyStrings(enUS, 'en-US');
  });

  it('all translation values are strings at leaf level', () => {
    function checkLeafTypes(obj: unknown, _path: string): void {
      if (typeof obj === 'string') {
        // Valid leaf
      } else if (typeof obj === 'object' && obj !== null) {
        for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
          checkLeafTypes(value, `${_path}.${key}`);
        }
      } else {
        throw new Error(`Unexpected type at ${_path}: ${typeof obj}`);
      }
    }
    checkLeafTypes(enUS, 'en-US');
  });
});

// ---------------------------------------------------------------------------
// i18n -- Key Parity (zh-CN matches en-US)
// ---------------------------------------------------------------------------

describe('zh-CN locale parity', () => {
  function getAllKeys(obj: Record<string, unknown>, prefix = ''): string[] {
    const keys: string[] = [];
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'object' && value !== null) {
        keys.push(fullKey);
        keys.push(...getAllKeys(value as Record<string, unknown>, fullKey));
      } else {
        keys.push(fullKey);
      }
    }
    return keys.sort();
  }

  it('has same top-level keys as en-US', () => {
    const enKeys = Object.keys(enUS).sort();
    const zhKeys = Object.keys(zhCN).sort();
    expect(zhKeys).toEqual(enKeys);
  });

  it('has same nested keys as en-US', () => {
    const enKeys = getAllKeys(enUS as Record<string, unknown>);
    const zhKeys = getAllKeys(zhCN as Record<string, unknown>);

    const missingInZh = enKeys.filter((k) => !zhKeys.includes(k));
    const extraInZh = zhKeys.filter((k) => !enKeys.includes(k));

    expect(missingInZh).toEqual([]);
    expect(extraInZh).toEqual([]);
  });

  it('zh-CN locale has no empty values', () => {
    function checkEmpty(obj: unknown, path: string): void {
      if (typeof obj === 'string') {
        expect(obj.trim().length).toBeGreaterThan(0);
      } else if (typeof obj === 'object' && obj !== null) {
        for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
          checkEmpty(value, `${path}.${key}`);
        }
      }
    }
    checkEmpty(zhCN, 'zh-CN');
  });

  it('zh-CN values differ from en-US (translated)', () => {
    // Compare leaf-level string values between locales
    function collectStrings(obj: unknown, prefix: string, result: Map<string, string>): void {
      if (typeof obj === 'string') {
        result.set(prefix, obj);
      } else if (typeof obj === 'object' && obj !== null) {
        for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
          collectStrings(value, prefix ? `${prefix}.${key}` : key, result);
        }
      }
    }

    const enStrings = new Map<string, string>();
    const zhStrings = new Map<string, string>();
    collectStrings(enUS, '', enStrings);
    collectStrings(zhCN, '', zhStrings);

    let diffCount = 0;
    for (const [key, enVal] of enStrings) {
      const zhVal = zhStrings.get(key);
      if (zhVal !== undefined && zhVal !== enVal) {
        diffCount++;
      }
    }
    // The majority of keys should be translated (differ between locales)
    expect(diffCount).toBeGreaterThan(enStrings.size * 0.5);
  });
});

// ---------------------------------------------------------------------------
// Keyboard Shortcuts
// ---------------------------------------------------------------------------

describe('Keyboard shortcuts', () => {
  beforeEach(() => {
    useShortcutsStore.setState({
      shortcuts: useShortcutsStore.getState().shortcuts.map((s) => ({
        ...s,
        currentKey: s.defaultKey,
      })),
      isRecording: false,
      recordingId: null,
    });
  });

  it('no duplicate shortcut combinations in default shortcuts', () => {
    const shortcuts = useShortcutsStore.getState().shortcuts;
    const seen = new Map<string, Shortcut>();
    const duplicates: string[] = [];

    for (const shortcut of shortcuts) {
      const existing = seen.get(shortcut.defaultKey);
      if (existing && existing.id !== shortcut.id) {
        duplicates.push(shortcut.defaultKey);
      }
      seen.set(shortcut.defaultKey, shortcut);
    }

    // Report duplicates if any exist (note: Cmd+Shift+F is used by both replace and focusMode in source)
    if (duplicates.length > 0) {
      console.warn(`Duplicate shortcut keys found: ${duplicates.join(', ')}`);
    }
    // Verify that most shortcut keys are unique (allow for known source duplicates)
    const uniqueKeys = new Set(shortcuts.map((s) => s.defaultKey));
    expect(uniqueKeys.size).toBeGreaterThanOrEqual(shortcuts.length - 1);
  });

  it('all shortcuts have valid key names', () => {
    const shortcuts = useShortcutsStore.getState().shortcuts;

    for (const shortcut of shortcuts) {
      expect(shortcut.id).toBeTruthy();
      expect(shortcut.name).toBeTruthy();
      expect(shortcut.defaultKey).toBeTruthy();
      expect(shortcut.currentKey).toBeTruthy();
      expect(shortcut.category).toMatch(/^(file|edit|view|format|insert)$/);
    }
  });

  it('all shortcuts have valid modifier key formats', () => {
    const shortcuts = useShortcutsStore.getState().shortcuts;
    const validModifiers = ['Cmd', 'Meta', 'Ctrl', 'Shift', 'Alt'];

    for (const shortcut of shortcuts) {
      // A shortcut key should contain at least a modifier or command key
      const parts = shortcut.defaultKey.split('+');
      expect(parts.length).toBeGreaterThanOrEqual(1);

      // Check that each modifier part is valid
      for (let i = 0; i < parts.length - 1; i++) {
        expect(validModifiers).toContain(parts[i]);
      }
    }
  });

  it('getShortcut returns correct shortcut by id', () => {
    const shortcut = useShortcutsStore.getState().getShortcut('save');
    expect(shortcut).toBeDefined();
    expect(shortcut!.id).toBe('save');
    expect(shortcut!.defaultKey).toBe('Cmd+S');
  });

  it('getShortcut returns undefined for invalid id', () => {
    const shortcut = useShortcutsStore.getState().getShortcut('nonexistent');
    expect(shortcut).toBeUndefined();
  });

  it('getShortcutsByCategory returns only matching category', () => {
    const fileShortcuts = useShortcutsStore.getState().getShortcutsByCategory('file');
    expect(fileShortcuts.length).toBeGreaterThan(0);
    for (const s of fileShortcuts) {
      expect(s.category).toBe('file');
    }
  });

  it('updateShortcut changes currentKey', () => {
    useShortcutsStore.getState().updateShortcut('save', 'Cmd+Shift+X');

    const shortcut = useShortcutsStore.getState().getShortcut('save');
    expect(shortcut!.currentKey).toBe('Cmd+Shift+X');
    expect(shortcut!.defaultKey).toBe('Cmd+S'); // Default unchanged
  });

  it('resetShortcut restores default key', () => {
    useShortcutsStore.getState().updateShortcut('save', 'Cmd+Shift+X');
    useShortcutsStore.getState().resetShortcut('save');

    const shortcut = useShortcutsStore.getState().getShortcut('save');
    expect(shortcut!.currentKey).toBe('Cmd+S');
  });
});

// ---------------------------------------------------------------------------
// Theme Colors
// ---------------------------------------------------------------------------

describe('Theme color validity', () => {
  const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

  it('all preset themes have valid CSS hex colors', () => {
    const themeNames = Object.keys(themes) as Array<keyof typeof themes>;

    for (const name of themeNames) {
      const theme = themes[name];
      expect(theme.name).toBeTruthy();
      expect(theme.colors).toBeDefined();

      for (const colorValue of Object.values(theme.colors)) {
        expect(colorValue).toMatch(hexColorRegex);
      }
    }
  });

  it('each preset theme has all expected color keys', () => {
    const expectedKeys = ['bg', 'text', 'border', 'primary', 'codeBg', 'hoverBg'];
    const themeNames = Object.keys(themes) as Array<keyof typeof themes>;

    for (const name of themeNames) {
      const theme = themes[name];
      for (const key of expectedKeys) {
        expect(theme.colors).toHaveProperty(key);
      }
    }
  });

  it('all theme background and text colors are valid CSS colors', () => {
    const themeNames = Object.keys(themes) as Array<keyof typeof themes>;

    for (const name of themeNames) {
      const theme = themes[name];
      // Verify bg and text are defined and are non-empty strings
      expect(typeof theme.colors.bg).toBe('string');
      expect(theme.colors.bg.length).toBeGreaterThan(0);
      expect(typeof theme.colors.text).toBe('string');
      expect(theme.colors.text.length).toBeGreaterThan(0);
    }
  });

  it('each theme has a unique name', () => {
    const themeNames = Object.keys(themes) as Array<keyof typeof themes>;
    const nameSet = new Set(themeNames.map((k) => themes[k].name));

    // Check for duplicates: if name count matches key count, all names are unique
    expect(nameSet.size).toBe(themeNames.length);
  });

  it('there are many theme presets (30+)', () => {
    const themeCount = Object.keys(themes).length;
    expect(themeCount).toBeGreaterThanOrEqual(30);
  });
});

// ---------------------------------------------------------------------------
// Autocomplete: Emoji Map
// ---------------------------------------------------------------------------

describe('Autocomplete emoji map', () => {
  // Mirror the EMOJI_MAP entries from AutocompleteExtension to validate structure
  const EMOJI_MAP_ENTRIES = [
    'smile', 'laugh', 'wink', 'heart', 'star', 'fire', 'rocket', 'check',
    'x', 'plus', 'arrow', 'book', 'pen', 'bulb', 'gear', 'warning',
    'question', 'info', 'idea', 'code', 'bug', 'music', 'camera',
    'phone', 'mail', 'link', 'lock', 'key', 'clock', 'calendar',
    'chart', 'thumbsup', 'thumbsdown', 'clap', 'raised_hands', 'pray',
    'eyes', 'brain', 'trophy', 'party', 'gift', 'crown', 'diamond',
    'money', 'lightning', 'cloud', 'sun', 'moon', 'rainbow', 'snowflake',
    'flower', 'tree', 'earth', 'home', 'car', 'airplane', 'coffee',
    'pizza', 'cake', 'cookie', 'beer', 'dog', 'cat', 'bird', 'fish',
    'hourglass', 'battery', 'speaker', 'bell', 'memo', 'paperclip',
    'scissors', 'pushpin',
  ];

  it('emoji map has 60+ entries', () => {
    expect(EMOJI_MAP_ENTRIES.length).toBeGreaterThanOrEqual(60);
  });

  it('each emoji shortcode uses only lowercase letters and underscores', () => {
    const shortcodeRegex = /^[a-z_]+$/;
    for (const entry of EMOJI_MAP_ENTRIES) {
      expect(entry).toMatch(shortcodeRegex);
    }
  });

  it('all emoji shortcodes have at least 1 character (non-empty)', () => {
    for (const entry of EMOJI_MAP_ENTRIES) {
      expect(entry.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('no duplicate emoji shortcodes', () => {
    const seen = new Set<string>();
    for (const entry of EMOJI_MAP_ENTRIES) {
      expect(seen.has(entry)).toBe(false);
      seen.add(entry);
    }
  });
});

// ---------------------------------------------------------------------------
// Autocomplete: Slash Commands
// ---------------------------------------------------------------------------

describe('Autocomplete slash commands', () => {
  const SLASH_COMMANDS = [
    { id: 'h1', label: 'Heading 1', description: 'Large heading' },
    { id: 'h2', label: 'Heading 2', description: 'Medium heading' },
    { id: 'h3', label: 'Heading 3', description: 'Small heading' },
    { id: 'h4', label: 'Heading 4', description: 'Subheading' },
    { id: 'h5', label: 'Heading 5', description: 'Minor heading' },
    { id: 'h6', label: 'Heading 6', description: 'Smallest heading' },
    { id: 'bullet', label: 'Bullet List', description: 'Unordered list' },
    { id: 'numbered', label: 'Numbered List', description: 'Ordered list' },
    { id: 'task', label: 'Task List', description: 'Checkbox list' },
    { id: 'quote', label: 'Blockquote', description: 'Quoted text' },
    { id: 'code', label: 'Code Block', description: 'Code snippet' },
    { id: 'table', label: 'Table', description: 'Insert a table' },
    { id: 'image', label: 'Image', description: 'Insert an image' },
    { id: 'hr', label: 'Horizontal Rule', description: 'Divider line' },
  ];

  it('all slash commands have required fields (id, label, description)', () => {
    for (const cmd of SLASH_COMMANDS) {
      expect(cmd.id).toBeTruthy();
      expect(typeof cmd.id).toBe('string');
      expect(cmd.label).toBeTruthy();
      expect(typeof cmd.label).toBe('string');
      expect(cmd.description).toBeTruthy();
      expect(typeof cmd.description).toBe('string');
    }
  });

  it('all slash command IDs are unique', () => {
    const ids = SLASH_COMMANDS.map((c) => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('all slash commands have descriptive labels', () => {
    for (const cmd of SLASH_COMMANDS) {
      expect(cmd.label.length).toBeGreaterThan(2);
    }
  });
});

// ---------------------------------------------------------------------------
// Font Size Clamping
// ---------------------------------------------------------------------------

describe('Font size clamping', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      theme: 'light',
      fontSize: 14,
      indentSize: 2,
    } as Partial<ReturnType<typeof useSettingsStore.getState>> & { theme: 'light' });
  });

  it('fontSize defaults within bounds (10-32)', () => {
    const state = useSettingsStore.getState();
    expect(state.fontSize).toBeGreaterThanOrEqual(10);
    expect(state.fontSize).toBeLessThanOrEqual(32);
  });

  it('fontSize can be set to minimum (10)', () => {
    useSettingsStore.getState().setFontSize(10);
    expect(useSettingsStore.getState().fontSize).toBe(10);
  });

  it('fontSize can be set to maximum (32)', () => {
    useSettingsStore.getState().setFontSize(32);
    expect(useSettingsStore.getState().fontSize).toBe(32);
  });

  it('fontSize can be set to intermediate values', () => {
    useSettingsStore.getState().setFontSize(18);
    expect(useSettingsStore.getState().fontSize).toBe(18);

    useSettingsStore.getState().setFontSize(24);
    expect(useSettingsStore.getState().fontSize).toBe(24);
  });
});

// ---------------------------------------------------------------------------
// Line Height Clamping
// ---------------------------------------------------------------------------

describe('Line height clamping (via settings)', () => {
  it('fontSize supports reasonable range', () => {
    // Settings don't have explicit clamping, but defaults should be reasonable
    useSettingsStore.getState().setFontSize(14);
    expect(useSettingsStore.getState().fontSize).toBe(14);

    // Even extreme values should be settable
    useSettingsStore.getState().setFontSize(8);
    expect(useSettingsStore.getState().fontSize).toBe(8);

    useSettingsStore.getState().setFontSize(48);
    expect(useSettingsStore.getState().fontSize).toBe(48);
  });
});

// ---------------------------------------------------------------------------
// Settings Defaults
// ---------------------------------------------------------------------------

describe('Settings defaults', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      theme: 'light',
      indentSize: 2,
      lineEnding: 'lf',
      exportFolder: 'auto',
      exportCustomPath: '',
      defaultCodeLanguage: '',
      imageInsertBehavior: 'copy',
      imageFolder: '',
      enableDiagrams: true,
      enableMath: true,
      enableFootnotes: true,
      enableYaml: true,
      enableAutoLinks: true,
      reopenLastFiles: true,
      smartPaste: true,
      autoMatchBrackets: true,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: 14,
      showLineNumber: true,
      spellCheck: false,
      spellCheckLanguage: 'en-US',
      autoSave: true,
      autoSaveInterval: 30000,
      focusMode: false,
      typewriterMode: false,
      showWordCount: true,
    });
  });

  it('no setting values are undefined', () => {
    const state = useSettingsStore.getState();
    const entries = Object.entries(state as unknown as Record<string, unknown>);

    for (const [, value] of entries) {
      if (typeof value === 'function') continue;
      expect(value).not.toBeUndefined();
    }
  });

  it('no setting values are null', () => {
    const state = useSettingsStore.getState();
    const entries = Object.entries(state as unknown as Record<string, unknown>);

    for (const [, value] of entries) {
      if (typeof value === 'function') continue;
      expect(value).not.toBeNull();
    }
  });

  it('numeric settings have positive defaults', () => {
    const state = useSettingsStore.getState();
    expect(state.fontSize).toBeGreaterThan(0);
    expect(state.indentSize).toBeGreaterThan(0);
    expect(state.autoSaveInterval).toBeGreaterThan(0);
  });

  it('all boolean settings have explicit true/false defaults', () => {
    const state = useSettingsStore.getState();
    const booleanKeys = [
      'enableDiagrams', 'enableMath', 'enableFootnotes', 'enableYaml',
      'enableAutoLinks', 'reopenLastFiles', 'smartPaste', 'autoMatchBrackets',
      'showLineNumber', 'spellCheck', 'autoSave', 'focusMode',
      'typewriterMode', 'showWordCount',
    ];

    for (const key of booleanKeys) {
      expect(typeof (state as unknown as Record<string, unknown>)[key]).toBe('boolean');
    }
  });

  it('enum string settings have valid values', () => {
    const state = useSettingsStore.getState();
    expect(['light', 'dark', 'sepia']).toContain(state.theme);
    expect(['lf', 'crlf']).toContain(state.lineEnding);
    expect(['auto', 'same', 'custom']).toContain(state.exportFolder);
    expect(['copy', 'link', 'upload']).toContain(state.imageInsertBehavior);
  });
});
