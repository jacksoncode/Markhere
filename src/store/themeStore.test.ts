import { describe, it, expect, beforeEach } from 'vitest';
import { useThemeStore, initThemeStore } from './themeStore';
import { themes, ThemeName } from './themes';

describe('useThemeStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useThemeStore.setState({ currentTheme: 'github' });
    document.documentElement.style.cssText = '';
    document.body.removeAttribute('data-theme');
  });

  describe('initial state', () => {
    it('has github as the initial theme', () => {
      const { currentTheme } = useThemeStore.getState();
      expect(currentTheme).toBe('github');
    });
  });

  describe('setTheme', () => {
    it('updates the current theme name', () => {
      useThemeStore.getState().setTheme('night');
      expect(useThemeStore.getState().currentTheme).toBe('night');
    });

    it('persists theme name to localStorage', () => {
      useThemeStore.getState().setTheme('dracula');
      expect(localStorage.getItem('markhere-theme')).toBe('dracula');
    });

    it('applies CSS custom properties when theme changes', () => {
      useThemeStore.getState().setTheme('night');

      const root = document.documentElement;
      expect(root.style.getPropertyValue('--bg-color')).toBe('#1E1E1E');
      expect(root.style.getPropertyValue('--text-color')).toBe('#D4D4D4');
      expect(root.style.getPropertyValue('--border-color')).toBe('#3E3E3E');
      expect(root.style.getPropertyValue('--primary-color')).toBe('#569CD6');
    });
  });

  describe('applyTheme', () => {
    it('sets all seven CSS custom properties on documentElement', () => {
      useThemeStore.setState({ currentTheme: 'github' });
      useThemeStore.getState().applyTheme();

      const root = document.documentElement;
      expect(root.style.getPropertyValue('--bg-color')).toBe('#FFFFFF');
      expect(root.style.getPropertyValue('--text-color')).toBe('#24292E');
      expect(root.style.getPropertyValue('--border-color')).toBe('#E1E4E8');
      expect(root.style.getPropertyValue('--primary-color')).toBe('#0366D6');
      expect(root.style.getPropertyValue('--code-bg')).toBe('#F6F8FA');
      expect(root.style.getPropertyValue('--hover-bg')).toBe('#F3F4F6');
      expect(root.style.getPropertyValue('--shadow-color')).toBe('#E1E4E840');
    });

    it('sets data-theme="light" on body for light-colored backgrounds', () => {
      useThemeStore.setState({ currentTheme: 'github' }); // bg: #FFFFFF
      useThemeStore.getState().applyTheme();
      expect(document.body.getAttribute('data-theme')).toBe('light');
    });

    it('sets data-theme="dark" on body for dark-colored backgrounds', () => {
      useThemeStore.setState({ currentTheme: 'night' }); // bg: #1E1E1E
      useThemeStore.getState().applyTheme();
      expect(document.body.getAttribute('data-theme')).toBe('dark');
    });
  });

  describe('initThemeStore', () => {
    it('restores saved theme name from localStorage', () => {
      localStorage.setItem('markhere-theme', 'night');
      initThemeStore();
      expect(useThemeStore.getState().currentTheme).toBe('night');
    });

    it('applies default theme when no saved theme exists in localStorage', () => {
      initThemeStore();
      // Should still be 'github' (default unchanged) and CSS should be applied
      expect(useThemeStore.getState().currentTheme).toBe('github');
      expect(document.documentElement.style.getPropertyValue('--bg-color')).toBe('#FFFFFF');
    });

    it('ignores invalid theme names in localStorage', () => {
      localStorage.setItem('markhere-theme', 'nonExistentTheme');
      initThemeStore();
      // Falls back to default theme
      expect(useThemeStore.getState().currentTheme).toBe('github');
    });
  });

  describe('all built-in themes', () => {
    it('has at least 25 theme entries defined', () => {
      const themeNames = Object.keys(themes) as ThemeName[];
      expect(themeNames.length).toBeGreaterThanOrEqual(25);
    });

    it('every theme can be applied without throwing and sets its own --bg-color', () => {
      const themeNames = Object.keys(themes) as ThemeName[];
      const { setTheme } = useThemeStore.getState();

      for (const name of themeNames) {
        expect(() => setTheme(name)).not.toThrow();
        expect(useThemeStore.getState().currentTheme).toBe(name);

        const expectedBg = themes[name].colors.bg;
        expect(document.documentElement.style.getPropertyValue('--bg-color')).toBe(expectedBg);
      }
    });

    it('every theme has required color keys in its definition', () => {
      const themeNames = Object.keys(themes) as ThemeName[];
      const requiredKeys: Array<keyof typeof themes[ThemeName]['colors']> = [
        'bg', 'text', 'border', 'primary', 'codeBg', 'hoverBg',
      ];

      for (const name of themeNames) {
        for (const key of requiredKeys) {
          expect(themes[name].colors[key]).toBeTruthy();
        }
      }
    });
  });
});
