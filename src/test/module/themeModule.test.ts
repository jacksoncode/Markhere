import { describe, it, expect, beforeEach } from 'vitest';
import { useThemeEditorStore, presetThemes, defaultLightTheme } from '../../store/themeEditorStore';
import type { ThemeColors, ThemeConfig } from '../../store/themeEditorStore';
import { useThemeStore } from '../../store/themeStore';
import { themes } from '../../store/themes';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/** All colour keys every ThemeConfig must define. */
const REQUIRED_COLOR_KEYS: (keyof ThemeColors)[] = [
  'bgPrimary',
  'bgSecondary',
  'bgTertiary',
  'textPrimary',
  'textSecondary',
  'textMuted',
  'primaryColor',
  'primaryHover',
  'accentColor',
  'accentHover',
  'borderColor',
  'borderLight',
  'codeBg',
  'codeText',
  'headingColor',
  'linkColor',
  'toolbarBg',
  'sidebarBg',
  'statusbarBg',
  'success',
  'warning',
  'error',
];

/** Hex colour regex (3 or 6 hex digits, case-insensitive). */
const HEX_COLOR_RE = /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/;

/** Deep-clone a ThemeConfig to avoid accidental reference sharing. */
function cloneTheme(t: ThemeConfig): ThemeConfig {
  return JSON.parse(JSON.stringify(t)) as ThemeConfig;
}

/** Remove every CSS custom property from :root in one shot. */
function clearRootCssVars() {
  document.documentElement.style.cssText = '';
  document.body.removeAttribute('data-theme');
}

/* ------------------------------------------------------------------ */
/*  Test suite                                                         */
/* ------------------------------------------------------------------ */
beforeEach(() => {
  // Purge any persisted state from previous runs
  localStorage.clear();

  // Wipe CSS custom properties and data-theme attribute
  clearRootCssVars();

  // Reset the theme-editor store (persist-backed) to defaults
  useThemeEditorStore.setState({
    currentTheme: cloneTheme(defaultLightTheme),
    customThemes: [],
    isLivePreview: true,
  });

  // Reset the simple theme store to defaults
  useThemeStore.setState({
    currentTheme: 'github',
  });
});

/* ------------------------------------------------------------------ */
/*  Theme data integrity                                               */
/* ------------------------------------------------------------------ */
describe('Theme data integrity', () => {
  it('every preset theme contains all required colour keys', () => {
    for (const theme of presetThemes) {
      for (const key of REQUIRED_COLOR_KEYS) {
        expect(
          theme.colors[key],
          `Theme "${theme.name}" is missing colour key "${key}"`,
        ).toBeDefined();
      }
    }
  });

  it('every preset theme colour value is a valid hex colour', () => {
    for (const theme of presetThemes) {
      for (const key of REQUIRED_COLOR_KEYS) {
        const value = theme.colors[key] as string;
        expect(
          value,
          `Theme "${theme.name}" key "${key}" is not a valid hex colour: "${value}"`,
        ).toMatch(HEX_COLOR_RE);
      }
    }
  });

  it('has no duplicate theme names among built-in presets', () => {
    const names = presetThemes.map((t) => t.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });
});

/* ------------------------------------------------------------------ */
/*  themeEditorStore – setTheme & CSS application                      */
/* ------------------------------------------------------------------ */
describe('themeEditorStore - setTheme and CSS application', () => {
  it('applies CSS variables on documentElement when setTheme is called', () => {
    const sepiaTheme = presetThemes.find((t) => t.name === 'Sepia')!;
    const { setTheme } = useThemeEditorStore.getState();

    setTheme(sepiaTheme);

    const root = document.documentElement;
    expect(root.style.getPropertyValue('--bg-primary')).toBe(sepiaTheme.colors.bgPrimary);
    expect(root.style.getPropertyValue('--text-primary')).toBe(sepiaTheme.colors.textPrimary);
    expect(root.style.getPropertyValue('--font-family')).toBe(sepiaTheme.fonts.family);
    expect(root.style.getPropertyValue('--font-size')).toBe(sepiaTheme.fonts.size);
    expect(root.style.getPropertyValue('--line-height')).toBe(sepiaTheme.fonts.lineHeight);
  });

  it('sets legacy backward-compatibility CSS variables as well', () => {
    const draculaTheme = presetThemes.find((t) => t.name === 'Dracula')!;
    const { setTheme } = useThemeEditorStore.getState();

    setTheme(draculaTheme);

    const root = document.documentElement;
    expect(root.style.getPropertyValue('--color-primary')).toBe(draculaTheme.colors.primaryColor);
    expect(root.style.getPropertyValue('--color-bg-primary')).toBe(draculaTheme.colors.bgPrimary);
    expect(root.style.getPropertyValue('--color-text-primary')).toBe(draculaTheme.colors.textPrimary);
    expect(root.style.getPropertyValue('--color-border')).toBe(draculaTheme.colors.borderColor);
  });
});

/* ------------------------------------------------------------------ */
/*  themeEditorStore – updateThemeColors                               */
/* ------------------------------------------------------------------ */
describe('themeEditorStore - updateThemeColors', () => {
  it('updates colours in the store and marks the theme as custom', () => {
    const { updateThemeColors } = useThemeEditorStore.getState();

    updateThemeColors({ bgPrimary: '#ff0000', textPrimary: '#00ff00' });

    const state = useThemeEditorStore.getState();
    expect(state.currentTheme.colors.bgPrimary).toBe('#ff0000');
    expect(state.currentTheme.colors.textPrimary).toBe('#00ff00');
    expect(state.currentTheme.isCustom).toBe(true);
  });

  it('immediately writes updated CSS variables to the DOM when live preview is on', () => {
    const { updateThemeColors } = useThemeEditorStore.getState();

    updateThemeColors({ bgPrimary: '#aabbcc' });

    expect(document.documentElement.style.getPropertyValue('--bg-primary')).toBe('#aabbcc');
  });
});

/* ------------------------------------------------------------------ */
/*  themeEditorStore – previewTheme / clearPreview                      */
/* ------------------------------------------------------------------ */
describe('themeEditorStore - previewTheme and clearPreview', () => {
  it('sets a temporary preview and then restores the original theme', () => {
    const { setTheme, previewTheme, clearPreview } = useThemeEditorStore.getState();

    // Apply a known theme first (Nord)
    const nordTheme = presetThemes.find((t) => t.name === 'Nord')!;
    setTheme(nordTheme);
    const originalBgPrimary = document.documentElement.style.getPropertyValue('--bg-primary');

    // Apply a preview overlay
    previewTheme({ '--bg-primary': '#123456', '--text-primary': '#abcdef' });
    expect(document.documentElement.style.getPropertyValue('--bg-primary')).toBe('#123456');
    expect(document.documentElement.style.getPropertyValue('--text-primary')).toBe('#abcdef');

    // Clear preview – should restore Nord colours
    clearPreview();
    expect(document.documentElement.style.getPropertyValue('--bg-primary')).toBe(originalBgPrimary);
    expect(document.documentElement.style.getPropertyValue('--text-primary')).toBe(
      nordTheme.colors.textPrimary,
    );
  });
});

/* ------------------------------------------------------------------ */
/*  themeEditorStore – exportTheme                                      */
/* ------------------------------------------------------------------ */
describe('themeEditorStore - exportTheme', () => {
  it('produces valid JSON containing all theme data', () => {
    const monokaiTheme = presetThemes.find((t) => t.name === 'Monokai')!;
    const { setTheme, exportTheme } = useThemeEditorStore.getState();

    setTheme(monokaiTheme);
    const json = exportTheme();

    const parsed = JSON.parse(json) as Record<string, unknown>;
    expect(parsed.name).toBe('Monokai');
    expect(parsed.colors).toBeDefined();
    expect(parsed.fonts).toBeDefined();
    expect(typeof parsed.colors).toBe('object');

    // Spot-check a few colour values
    const colors = parsed.colors as Record<string, string>;
    expect(colors.bgPrimary).toBe(monokaiTheme.colors.bgPrimary);
    expect(colors.headingColor).toBe(monokaiTheme.colors.headingColor);
  });
});

/* ------------------------------------------------------------------ */
/*  themeEditorStore – importTheme                                      */
/* ------------------------------------------------------------------ */
describe('themeEditorStore - importTheme', () => {
  it('loads a valid theme JSON and applies it to the store and DOM', () => {
    const { importTheme } = useThemeEditorStore.getState();

    const themeJson = JSON.stringify({
      name: 'Imported Dark',
      colors: {
        bgPrimary: '#111111',
        textPrimary: '#eeeeee',
      },
      fonts: {
        family: 'monospace',
        size: '16px',
        lineHeight: '2.0',
      },
    });

    const result = importTheme(themeJson);
    expect(result).toBe(true);

    const state = useThemeEditorStore.getState();
    expect(state.currentTheme.name).toBe('Imported Dark');
    expect(state.currentTheme.colors.bgPrimary).toBe('#111111');
    expect(state.currentTheme.colors.textPrimary).toBe('#eeeeee');
    expect(state.currentTheme.fonts.family).toBe('monospace');
    expect(state.currentTheme.isCustom).toBe(true);

    // CSS variables should be applied
    expect(document.documentElement.style.getPropertyValue('--bg-primary')).toBe('#111111');
    expect(document.documentElement.style.getPropertyValue('--font-family')).toBe('monospace');
  });

  it('fills missing colours with defaults from the light theme', () => {
    const { importTheme } = useThemeEditorStore.getState();

    // Only provide two colours; the rest should fall back to default light theme
    const themeJson = JSON.stringify({
      name: 'Minimal Theme',
      colors: {
        bgPrimary: '#222222',
        textPrimary: '#dddddd',
      },
    });

    importTheme(themeJson);

    const state = useThemeEditorStore.getState();
    // Supplied colours override
    expect(state.currentTheme.colors.bgPrimary).toBe('#222222');
    expect(state.currentTheme.colors.textPrimary).toBe('#dddddd');
    // Unspecified keys should fall back to default light theme values
    expect(state.currentTheme.colors.accentColor).toBe(defaultLightTheme.colors.accentColor);
    expect(state.currentTheme.colors.success).toBe(defaultLightTheme.colors.success);
  });

  it('returns false for invalid JSON without changing state', () => {
    const { importTheme } = useThemeEditorStore.getState();

    // Snapshot current state before the import attempt
    const stateBefore = useThemeEditorStore.getState();
    const nameBefore = stateBefore.currentTheme.name;

    const result = importTheme('not-valid-json');

    expect(result).toBe(false);

    // State should be unchanged
    const stateAfter = useThemeEditorStore.getState();
    expect(stateAfter.currentTheme.name).toBe(nameBefore);
  });

  it('returns false for JSON missing required fields', () => {
    const { importTheme } = useThemeEditorStore.getState();

    // Missing "name"
    expect(importTheme(JSON.stringify({ colors: { bgPrimary: '#fff' } }))).toBe(false);

    // Missing "colors"
    expect(importTheme(JSON.stringify({ name: 'Bad' }))).toBe(false);

    // Missing bgPrimary within colors
    expect(
      importTheme(
        JSON.stringify({ name: 'Bad', colors: { textPrimary: '#000' } }),
      ),
    ).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/*  themeEditorStore – resetToDefault                                   */
/* ------------------------------------------------------------------ */
describe('themeEditorStore - resetToDefault', () => {
  it('restores the default light theme and applies its CSS variables', () => {
    const { setTheme, resetToDefault } = useThemeEditorStore.getState();

    // First switch to a different theme
    const draculaTheme = presetThemes.find((t) => t.name === 'Dracula')!;
    setTheme(draculaTheme);

    // Reset back
    resetToDefault();

    const state = useThemeEditorStore.getState();
    expect(state.currentTheme.name).toBe('Default Light');
    expect(state.currentTheme.colors.bgPrimary).toBe(defaultLightTheme.colors.bgPrimary);

    // CSS variables should reflect the default light theme
    expect(document.documentElement.style.getPropertyValue('--bg-primary')).toBe(
      defaultLightTheme.colors.bgPrimary,
    );
  });
});

/* ------------------------------------------------------------------ */
/*  useThemeStore – simple theme switching                              */
/* ------------------------------------------------------------------ */
describe('useThemeStore - simple theme switching', () => {
  it('switches to Sepia and writes CSS variables and localStorage', () => {
    const { setTheme } = useThemeStore.getState();

    setTheme('sepia');

    const root = document.documentElement;
    expect(root.style.getPropertyValue('--theme-bg')).toBe(themes.sepia.colors.bg);
    expect(root.style.getPropertyValue('--theme-text')).toBe(themes.sepia.colors.text);
    expect(root.style.getPropertyValue('--theme-border')).toBe(themes.sepia.colors.border);
    expect(root.style.getPropertyValue('--theme-primary')).toBe(themes.sepia.colors.primary);
    expect(root.style.getPropertyValue('--theme-code-bg')).toBe(themes.sepia.colors.codeBg);
    expect(root.style.getPropertyValue('--theme-hover-bg')).toBe(themes.sepia.colors.hoverBg);

    // The simple store also sets data-theme attribute based on bg colour lightness
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    // localStorage should hold the selected theme name
    expect(localStorage.getItem('markhere-theme')).toBe('sepia');
  });

  it('sets data-theme to "dark" for dark-background themes', () => {
    const { setTheme } = useThemeStore.getState();

    setTheme('night'); // Night has bg '#1E1E1E' which is dark

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('initial applyTheme on the default "github" theme works', () => {
    const { applyTheme } = useThemeStore.getState();

    applyTheme();

    const root = document.documentElement;
    expect(root.style.getPropertyValue('--theme-bg')).toBe(themes.github.colors.bg);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
