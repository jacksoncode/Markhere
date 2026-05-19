import { describe, it, expect, beforeEach } from 'vitest';
import {
  useThemeEditorStore,
  presetThemes,
  defaultLightTheme,
  defaultDarkTheme,
} from '../store/themeEditorStore';
import type { ThemeConfig } from '../store/themeEditorStore';

/* ------------------------------------------------------------------ */
/*  Helper to create minimal valid theme for testing                   */
/* ------------------------------------------------------------------ */

function makeTheme(overrides: Partial<ThemeConfig> = {}): ThemeConfig {
  return {
    name: 'Test Theme',
    colors: {
      bgPrimary: '#ffffff',
      bgSecondary: '#f0f0f0',
      bgTertiary: '#e0e0e0',
      textPrimary: '#000000',
      textSecondary: '#555555',
      textMuted: '#999999',
      primaryColor: '#3b82f6',
      primaryHover: '#2563eb',
      accentColor: '#8b5cf6',
      accentHover: '#7c3aed',
      borderColor: '#cccccc',
      borderLight: '#eeeeee',
      codeBg: '#f4f4f5',
      codeText: '#18181b',
      headingColor: '#111111',
      linkColor: '#3b82f6',
      toolbarBg: '#fafafa',
      sidebarBg: '#ffffff',
      statusbarBg: '#f4f4f5',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
    },
    fonts: {
      family: 'Arial, sans-serif',
      size: '14px',
      lineHeight: '1.6',
    },
    isCustom: true,
    ...overrides,
  };
}

const REQUIRED_COLOR_KEYS = [
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
] as const;

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('useThemeEditorStore', () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset store to the same state it starts with
    useThemeEditorStore.setState({
      currentTheme: JSON.parse(JSON.stringify(defaultLightTheme)),
      customThemes: [],
      isLivePreview: true,
    });
    // Clean up any styles left on documentElement from previous tests
    const root = document.documentElement;
    root.removeAttribute('style');
  });

  describe('initial state defaults', () => {
    it('has default light theme as current', () => {
      const state = useThemeEditorStore.getState();
      expect(state.currentTheme.name).toBe('Default Light');
      expect(state.currentTheme.colors.bgPrimary).toBe('#ffffff');
    });

    it('has empty customThemes array', () => {
      expect(useThemeEditorStore.getState().customThemes).toEqual([]);
    });

    it('has live preview enabled by default', () => {
      expect(useThemeEditorStore.getState().isLivePreview).toBe(true);
    });
  });

  /* ---- Basic editing ---- */

  describe('setTheme', () => {
    it('updates currentTheme', () => {
      const theme = makeTheme({ name: 'New Theme' });
      useThemeEditorStore.getState().setTheme(theme);
      expect(useThemeEditorStore.getState().currentTheme.name).toBe('New Theme');
    });

    it('clones theme so reference differs from input', () => {
      const theme = makeTheme();
      useThemeEditorStore.getState().setTheme(theme);
      const stored = useThemeEditorStore.getState().currentTheme;
      expect(stored).not.toBe(theme);
      expect(stored.name).toBe(theme.name);
    });

    it('applies CSS variables when live preview is on', () => {
      const theme = makeTheme({
        name: 'Live Theme',
        colors: { ...makeTheme().colors, bgPrimary: '#ff0000' },
      });
      useThemeEditorStore.getState().setTheme(theme);

      const root = document.documentElement;
      expect(root.style.getPropertyValue('--bg-primary')).toBe('#ff0000');
    });

    it('does not apply CSS when live preview is off', () => {
      useThemeEditorStore.setState({ isLivePreview: false });
      const theme = makeTheme({
        colors: { ...makeTheme().colors, bgPrimary: '#abcdef' },
      });
      useThemeEditorStore.getState().setTheme(theme);

      const root = document.documentElement;
      expect(root.style.getPropertyValue('--bg-primary')).toBe('');
    });
  });

  describe('addCustomTheme', () => {
    it('adds theme to customThemes array', () => {
      const theme = makeTheme({ name: 'Custom 1' });
      useThemeEditorStore.getState().addCustomTheme(theme);
      expect(useThemeEditorStore.getState().customThemes).toHaveLength(1);
      expect(useThemeEditorStore.getState().customThemes[0].name).toBe('Custom 1');
    });

    it('marks added theme as custom regardless of input', () => {
      const theme = makeTheme({ name: 'Preset Lookalike', isCustom: false });
      useThemeEditorStore.getState().addCustomTheme(theme);
      expect(useThemeEditorStore.getState().customThemes[0].isCustom).toBe(true);
    });

    it('clones theme so reference differs from input', () => {
      const theme = makeTheme({ name: 'Clone Check' });
      useThemeEditorStore.getState().addCustomTheme(theme);
      const stored = useThemeEditorStore.getState().customThemes[0];
      expect(stored).not.toBe(theme);
    });

    it('supports multiple custom themes', () => {
      const { addCustomTheme } = useThemeEditorStore.getState();
      addCustomTheme(makeTheme({ name: 'A' }));
      addCustomTheme(makeTheme({ name: 'B' }));
      addCustomTheme(makeTheme({ name: 'C' }));
      expect(useThemeEditorStore.getState().customThemes).toHaveLength(3);
    });
  });

  describe('removeCustomTheme', () => {
    it('removes a theme by name', () => {
      const { addCustomTheme, removeCustomTheme } = useThemeEditorStore.getState();
      addCustomTheme(makeTheme({ name: 'Keep' }));
      addCustomTheme(makeTheme({ name: 'Remove Me' }));

      removeCustomTheme('Remove Me');

      const custom = useThemeEditorStore.getState().customThemes;
      expect(custom).toHaveLength(1);
      expect(custom[0].name).toBe('Keep');
    });

    it('does nothing when name does not match any theme', () => {
      const { addCustomTheme, removeCustomTheme } = useThemeEditorStore.getState();
      addCustomTheme(makeTheme({ name: 'Only' }));

      removeCustomTheme('Non Existent');

      expect(useThemeEditorStore.getState().customThemes).toHaveLength(1);
    });
  });

  describe('updateThemeColors', () => {
    it('updates a specific color key', () => {
      useThemeEditorStore.getState().updateThemeColors({ bgPrimary: '#ff0000' });
      expect(useThemeEditorStore.getState().currentTheme.colors.bgPrimary).toBe('#ff0000');
    });

    it('updates multiple color keys at once', () => {
      useThemeEditorStore.getState().updateThemeColors({
        textPrimary: '#111111',
        textSecondary: '#333333',
      });
      const colors = useThemeEditorStore.getState().currentTheme.colors;
      expect(colors.textPrimary).toBe('#111111');
      expect(colors.textSecondary).toBe('#333333');
    });

    it('marks theme as custom after color update', () => {
      expect(useThemeEditorStore.getState().currentTheme.isCustom).toBe(false);
      useThemeEditorStore.getState().updateThemeColors({ bgPrimary: '#ff0000' });
      expect(useThemeEditorStore.getState().currentTheme.isCustom).toBe(true);
    });

    it('applies CSS vars when live preview is on', () => {
      useThemeEditorStore.getState().updateThemeColors({ primaryColor: '#123456' });
      expect(document.documentElement.style.getPropertyValue('--primary-color')).toBe('#123456');
    });

    it('does not apply CSS vars when live preview is off', () => {
      useThemeEditorStore.setState({ isLivePreview: false });
      useThemeEditorStore.getState().updateThemeColors({ primaryColor: '#999999' });
      expect(document.documentElement.style.getPropertyValue('--primary-color')).toBe('');
    });
  });

  describe('updateThemeFonts', () => {
    it('updates font family', () => {
      useThemeEditorStore.getState().updateThemeFonts({ family: 'Georgia, serif' });
      expect(useThemeEditorStore.getState().currentTheme.fonts.family).toBe('Georgia, serif');
    });

    it('updates font size', () => {
      useThemeEditorStore.getState().updateThemeFonts({ size: '18px' });
      expect(useThemeEditorStore.getState().currentTheme.fonts.size).toBe('18px');
    });

    it('updates line height', () => {
      useThemeEditorStore.getState().updateThemeFonts({ lineHeight: '2.0' });
      expect(useThemeEditorStore.getState().currentTheme.fonts.lineHeight).toBe('2.0');
    });

    it('marks theme as custom after font update', () => {
      expect(useThemeEditorStore.getState().currentTheme.isCustom).toBe(false);
      useThemeEditorStore.getState().updateThemeFonts({ size: '20px' });
      expect(useThemeEditorStore.getState().currentTheme.isCustom).toBe(true);
    });

    it('applies CSS vars when live preview is on', () => {
      useThemeEditorStore.getState().updateThemeFonts({ family: 'monospace' });
      expect(document.documentElement.style.getPropertyValue('--font-family')).toBe('monospace');
    });
  });

  /* ---- Application ---- */

  describe('applyTheme', () => {
    it('sets CSS custom properties on documentElement', () => {
      const theme = makeTheme({ name: 'Apply Test' });
      useThemeEditorStore.getState().setTheme(theme);
      useThemeEditorStore.getState().applyTheme();

      const root = document.documentElement;
      expect(root.style.getPropertyValue('--bg-primary')).toBe('#ffffff');
      expect(root.style.getPropertyValue('--text-primary')).toBe('#000000');
      expect(root.style.getPropertyValue('--primary-color')).toBe('#3b82f6');
    });

    it('sets legacy CSS variable names for backwards compatibility', () => {
      const theme = makeTheme();
      useThemeEditorStore.getState().setTheme(theme);
      useThemeEditorStore.getState().applyTheme();

      const root = document.documentElement;
      expect(root.style.getPropertyValue('--color-primary')).toBe('#3b82f6');
      expect(root.style.getPropertyValue('--color-bg-primary')).toBe('#ffffff');
      expect(root.style.getPropertyValue('--color-text-primary')).toBe('#000000');
      expect(root.style.getPropertyValue('--color-border')).toBe('#cccccc');
      expect(root.style.getPropertyValue('--color-success')).toBe('#22c55e');
    });

    it('sets font CSS custom properties', () => {
      const theme = makeTheme({
        fonts: { family: 'monospace', size: '16px', lineHeight: '1.8' },
      });
      useThemeEditorStore.getState().setTheme(theme);
      useThemeEditorStore.getState().applyTheme();

      const root = document.documentElement;
      expect(root.style.getPropertyValue('--font-family')).toBe('monospace');
      expect(root.style.getPropertyValue('--font-size')).toBe('16px');
      expect(root.style.getPropertyValue('--line-height')).toBe('1.8');
    });
  });

  /* ---- Import / Export ---- */

  describe('exportTheme', () => {
    it('returns currentTheme as a JSON string', () => {
      const theme = makeTheme({ name: 'Export Me' });
      useThemeEditorStore.getState().setTheme(theme);

      const json = useThemeEditorStore.getState().exportTheme();
      expect(json).toBeTypeOf('string');

      const parsed = JSON.parse(json);
      expect(parsed.name).toBe('Export Me');
    });

    it('produces pretty-printed JSON with 2-space indent', () => {
      const json = useThemeEditorStore.getState().exportTheme();
      expect(json).toContain('\n  ');
    });
  });

  describe('importTheme', () => {
    it('imports valid JSON and returns true', () => {
      const theme = makeTheme({ name: 'Imported' });
      const json = JSON.stringify(theme);

      const result = useThemeEditorStore.getState().importTheme(json);

      expect(result).toBe(true);
      expect(useThemeEditorStore.getState().currentTheme.name).toBe('Imported');
    });

    it('applies CSS when live preview is on after import', () => {
      const theme = makeTheme({
        name: 'Imported Live',
        colors: { ...makeTheme().colors, bgPrimary: '#0ff' },
      });
      const json = JSON.stringify(theme);

      useThemeEditorStore.getState().importTheme(json);

      expect(document.documentElement.style.getPropertyValue('--bg-primary')).toBe('#0ff');
    });

    it('returns false for invalid JSON string', () => {
      const result = useThemeEditorStore.getState().importTheme('not valid json{{{');
      expect(result).toBe(false);
    });

    it('returns false for non-object parsed value', () => {
      const result = useThemeEditorStore.getState().importTheme('"just a string"');
      expect(result).toBe(false);
    });

    it('returns false when name is missing', () => {
      const result = useThemeEditorStore.getState().importTheme(
        JSON.stringify({ colors: { bgPrimary: '#fff', textPrimary: '#000' } })
      );
      expect(result).toBe(false);
    });

    it('returns false when name is empty after trim', () => {
      const result = useThemeEditorStore.getState().importTheme(
        JSON.stringify({ name: '   ', colors: { bgPrimary: '#fff', textPrimary: '#000' } })
      );
      expect(result).toBe(false);
    });

    it('returns false when colors is missing', () => {
      const result = useThemeEditorStore.getState().importTheme(
        JSON.stringify({ name: 'No Colors' })
      );
      expect(result).toBe(false);
    });

    it('returns false when colors.bgPrimary is missing', () => {
      const result = useThemeEditorStore.getState().importTheme(
        JSON.stringify({ name: 'Test', colors: { textPrimary: '#000' } })
      );
      expect(result).toBe(false);
    });

    it('returns false when colors.textPrimary is missing', () => {
      const result = useThemeEditorStore.getState().importTheme(
        JSON.stringify({ name: 'Test', colors: { bgPrimary: '#fff' } })
      );
      expect(result).toBe(false);
    });

    it('fills missing color keys with defaults from light theme', () => {
      const importedName = 'Minimal Theme';
      const json = JSON.stringify({
        name: importedName,
        colors: { bgPrimary: '#abc', textPrimary: '#def', primaryColor: '#123' },
      });

      const result = useThemeEditorStore.getState().importTheme(json);

      expect(result).toBe(true);
      const colors = useThemeEditorStore.getState().currentTheme.colors;
      // Provided values should be present
      expect(colors.bgPrimary).toBe('#abc');
      expect(colors.textPrimary).toBe('#def');
      expect(colors.primaryColor).toBe('#123');
      // Missing values should fall back to light theme defaults
      expect(colors.textSecondary).toBe(defaultLightTheme.colors.textSecondary);
      expect(colors.success).toBe(defaultLightTheme.colors.success);
    });

    it('fills missing font settings with defaults', () => {
      const json = JSON.stringify({
        name: 'No Fonts',
        colors: { bgPrimary: '#fff', textPrimary: '#000' },
      });

      const result = useThemeEditorStore.getState().importTheme(json);

      expect(result).toBe(true);
      const fonts = useThemeEditorStore.getState().currentTheme.fonts;
      expect(fonts.family).toContain('-apple-system');
      expect(fonts.size).toBe('14px');
      expect(fonts.lineHeight).toBe('1.6');
    });

    it('marks imported theme as custom', () => {
      const theme = makeTheme({ name: 'My Import', isCustom: false });
      const json = JSON.stringify(theme);

      useThemeEditorStore.getState().importTheme(json);

      expect(useThemeEditorStore.getState().currentTheme.isCustom).toBe(true);
    });

    it('does not change state when import fails', () => {
      const originalName = useThemeEditorStore.getState().currentTheme.name;

      useThemeEditorStore.getState().importTheme('bad json');

      expect(useThemeEditorStore.getState().currentTheme.name).toBe(originalName);
    });
  });

  /* ---- Preview ---- */

  describe('previewTheme', () => {
    it('sets arbitrary CSS variables on documentElement', () => {
      useThemeEditorStore.getState().previewTheme({
        '--test-var': 'red',
        '--another-var': '42px',
      });

      const root = document.documentElement;
      expect(root.style.getPropertyValue('--test-var')).toBe('red');
      expect(root.style.getPropertyValue('--another-var')).toBe('42px');
    });
  });

  describe('clearPreview', () => {
    it('reapplies current theme CSS variables', () => {
      const theme = makeTheme({
        name: 'Current',
        colors: { ...makeTheme().colors, bgPrimary: '#121212' },
      });
      useThemeEditorStore.getState().setTheme(theme);

      // Set some preview vars that differ from the theme
      useThemeEditorStore.getState().previewTheme({ '--bg-primary': 'orange' });
      expect(document.documentElement.style.getPropertyValue('--bg-primary')).toBe('orange');

      // Clear preview should reapply the current theme
      useThemeEditorStore.getState().clearPreview();
      expect(document.documentElement.style.getPropertyValue('--bg-primary')).toBe('#121212');
    });
  });

  /* ---- Reset ---- */

  describe('resetToDefault', () => {
    it('restores currentTheme to default light theme', () => {
      // First, mess up the theme
      useThemeEditorStore.getState().setTheme(makeTheme({
        name: 'Messed Up',
        colors: { ...makeTheme().colors, bgPrimary: '#bad' },
      }));

      useThemeEditorStore.getState().resetToDefault();

      const current = useThemeEditorStore.getState().currentTheme;
      expect(current.name).toBe('Default Light');
      expect(current.colors.bgPrimary).toBe('#ffffff');
    });

    it('applies default theme CSS after reset', () => {
      useThemeEditorStore.getState().setTheme(makeTheme({
        colors: { ...makeTheme().colors, bgPrimary: '#abcdef' },
      }));

      useThemeEditorStore.getState().resetToDefault();

      expect(document.documentElement.style.getPropertyValue('--bg-primary')).toBe('#ffffff');
    });

    it('clones so currentTheme is not the same reference as defaultLightTheme', () => {
      useThemeEditorStore.getState().resetToDefault();
      const current = useThemeEditorStore.getState().currentTheme;
      expect(current).not.toBe(defaultLightTheme);
    });
  });

  /* ---- Toggle ---- */

  describe('toggleLivePreview', () => {
    it('toggles from true to false', () => {
      useThemeEditorStore.getState().toggleLivePreview();
      expect(useThemeEditorStore.getState().isLivePreview).toBe(false);
    });

    it('toggles from false back to true and applies current theme', () => {
      // Turn off live preview and change theme
      useThemeEditorStore.setState({ isLivePreview: false });
      useThemeEditorStore.getState().setTheme(makeTheme({
        colors: { ...makeTheme().colors, bgPrimary: '#ff0000' },
      }));
      // Clear any styles to simulate no preview
      document.documentElement.removeAttribute('style');

      // Toggle back on
      useThemeEditorStore.getState().toggleLivePreview();

      expect(useThemeEditorStore.getState().isLivePreview).toBe(true);
      // It should apply the current theme when turning on
      expect(document.documentElement.style.getPropertyValue('--bg-primary')).toBe('#ff0000');
    });
  });

  /* ---- Preset themes integrity ---- */

  describe('presetThemes', () => {
    it('has at least 8 preset themes', () => {
      expect(presetThemes.length).toBeGreaterThanOrEqual(8);
    });

    it('each preset has a non-empty name', () => {
      for (const preset of presetThemes) {
        expect(preset.name).toBeTruthy();
      }
    });

    it('each preset has all required color keys', () => {
      for (const preset of presetThemes) {
        for (const key of REQUIRED_COLOR_KEYS) {
          expect(preset.colors[key]).toBeDefined();
          expect(typeof preset.colors[key]).toBe('string');
        }
      }
    });

    it('each preset has valid font settings', () => {
      for (const preset of presetThemes) {
        expect(preset.fonts.family).toBeTruthy();
        expect(preset.fonts.size).toBeTruthy();
        expect(preset.fonts.lineHeight).toBeTruthy();
      }
    });

    it('all presets have isCustom set to false', () => {
      for (const preset of presetThemes) {
        expect(preset.isCustom).toBe(false);
      }
    });

    it('includes "Default Light" and "Default Dark" as presets', () => {
      const names = presetThemes.map((p) => p.name);
      expect(names).toContain('Default Light');
      expect(names).toContain('Default Dark');
    });

    it('includes "Nord" and "Dracula" as presets', () => {
      const names = presetThemes.map((p) => p.name);
      expect(names).toContain('Nord');
      expect(names).toContain('Dracula');
    });

    it('includes "Monokai" as a preset', () => {
      const names = presetThemes.map((p) => p.name);
      expect(names).toContain('Monokai');
    });

    it('includes "Sepia" as a preset', () => {
      const names = presetThemes.map((p) => p.name);
      expect(names).toContain('Sepia');
    });

    it('includes both Solarized variants as presets', () => {
      const names = presetThemes.map((p) => p.name);
      expect(names).toContain('Solarized Light');
      expect(names).toContain('Solarized Dark');
    });

    it('includes both GitHub variants as presets', () => {
      const names = presetThemes.map((p) => p.name);
      expect(names).toContain('GitHub Light');
      expect(names).toContain('GitHub Dark');
    });
  });

  describe('defaultLightTheme', () => {
    it('has isCustom as false', () => {
      expect(defaultLightTheme.isCustom).toBe(false);
    });

    it('has white background', () => {
      expect(defaultLightTheme.colors.bgPrimary).toBe('#ffffff');
    });
  });

  describe('defaultDarkTheme', () => {
    it('has isCustom as false', () => {
      expect(defaultDarkTheme.isCustom).toBe(false);
    });

    it('has dark background', () => {
      expect(defaultDarkTheme.colors.bgPrimary).toBe('#18181b');
    });
  });
});
