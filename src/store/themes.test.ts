import { describe, it, expect } from 'vitest';
import { themes } from './themes';

const REQUIRED_COLOR_KEYS = ['bg', 'text', 'border', 'primary', 'codeBg', 'hoverBg'];

describe('themes', () => {
  it('has 20 or more theme entries', () => {
    const themeEntries = Object.entries(themes);
    expect(themeEntries.length).toBeGreaterThanOrEqual(20);
  });

  it('exports an object (not an array)', () => {
    expect(typeof themes).toBe('object');
    expect(Array.isArray(themes)).toBe(false);
  });

  describe('each theme structure', () => {
    const themeEntries = Object.entries(themes);
    const neededKeys = ['name', 'colors'];

    for (const [themeKey, theme] of themeEntries) {
      describe(`theme "${themeKey}"`, () => {
        it('has a "name" property that is a non-empty string', () => {
          expect(typeof theme.name).toBe('string');
          expect(theme.name.length).toBeGreaterThan(0);
        });

        it('has a "colors" property that is an object', () => {
          expect(theme.colors).toBeDefined();
          expect(typeof theme.colors).toBe('object');
        });

        it.each(neededKeys)('has key "%s"', (key) => {
          expect(theme).toHaveProperty(key);
        });

        describe('colors', () => {
          it.each(REQUIRED_COLOR_KEYS)('has color key "%s"', (colorKey) => {
            expect(theme.colors).toHaveProperty(colorKey);
          });

          it.each(REQUIRED_COLOR_KEYS)('has valid CSS hex color for "%s"', (colorKey) => {
            const color = theme.colors[colorKey as keyof typeof theme.colors];
            expect(typeof color).toBe('string');
            // Valid CSS hex color: # followed by 3, 6, or 8 hex digits
            expect(color).toMatch(/^#[0-9A-Fa-f]{3,8}$/);
          });
        });
      });
    }
  });

  describe('no duplicate theme names', () => {
    it('has unique theme names', () => {
      const names = Object.values(themes).map((t) => t.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    it('has unique theme keys', () => {
      const keys = Object.keys(themes);
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(keys.length);
    });
  });

  describe('color value validity', () => {
    it('all color values across all themes are valid hex colors', () => {
      for (const [, theme] of Object.entries(themes)) {
        for (const [key, value] of Object.entries(theme.colors)) {
          expect(
            value,
            `Theme "${theme.name}" color "${key}" has invalid value: "${value}"`
          ).toMatch(/^#[0-9A-Fa-f]{3,8}$/);
        }
      }
    });
  });

  describe('well-known themes are present', () => {
    it('includes popular theme keys', () => {
      const popularThemes = ['github', 'night', 'dracula', 'monokai', 'oneDark', 'solarizedDark'];
      for (const key of popularThemes) {
        expect(themes).toHaveProperty(key);
      }
    });
  });
});
