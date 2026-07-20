import { describe, it, expect, beforeEach } from 'vitest';
import { isDarkColor, normalizeHex, applyThemeVariables } from './themeApplication';
import { useThemeStore } from './themeStore';

describe('normalizeHex', () => {
  it('expands 3-digit hex', () => {
    expect(normalizeHex('#FFF')).toBe('#ffffff');
  });
  it('lowercases 6-digit hex', () => {
    expect(normalizeHex('#1E1E1E')).toBe('#1e1e1e');
  });
  it('returns null for invalid input', () => {
    expect(normalizeHex('not-a-color')).toBeNull();
    expect(normalizeHex('')).toBeNull();
  });
});

describe('isDarkColor (replaces fragile lexical comparison)', () => {
  it('classifies pure white as light', () => {
    expect(isDarkColor('#ffffff')).toBe(false);
  });
  it('classifies pure black as dark', () => {
    expect(isDarkColor('#000000')).toBe(true);
  });
  it('classifies known dark editor backgrounds as dark', () => {
    expect(isDarkColor('#1E1E1E')).toBe(true); // night
    expect(isDarkColor('#282A36')).toBe(true); // dracula
    expect(isDarkColor('#2E3440')).toBe(true); // nord
    expect(isDarkColor('#002B36')).toBe(true); // solarized dark
  });
  it('classifies known light editor backgrounds as light', () => {
    expect(isDarkColor('#FDF6E3')).toBe(false); // solarized light
    expect(isDarkColor('#FFFFFF')).toBe(false); // github
  });
  it('handles 3-digit notation', () => {
    expect(isDarkColor('#000')).toBe(true);
    expect(isDarkColor('#fff')).toBe(false);
  });
  it('returns false (treated as light) for invalid input', () => {
    expect(isDarkColor('rgb(0,0,0)')).toBe(false);
  });
});

describe('applyThemeVariables', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('style');
    document.documentElement.removeAttribute('data-theme');
  });

  it('sets provided variables and toggles data-theme based on luminance', () => {
    applyThemeVariables({ '--bg-primary': '#1e1e1e' }, '#1e1e1e');
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--bg-primary')).toBe('#1e1e1e');
    expect(root.getAttribute('data-theme')).toBe('dark');
  });

  it('treats a light background as light', () => {
    applyThemeVariables({ '--bg-primary': '#ffffff' }, '#ffffff');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});

describe('themeStore preset now drives canonical tokens (merge dual-track)', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('style');
    document.documentElement.removeAttribute('data-theme');
  });

  it('maps the night preset onto --color-bg-primary / --color-primary', () => {
    useThemeStore.getState().setTheme('night');
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--color-bg-primary')).toBe('#1E1E1E');
    expect(root.style.getPropertyValue('--color-primary')).toBe('#569CD6');
    expect(root.style.getPropertyValue('--bg-primary')).toBe('#1E1E1E');
    expect(root.getAttribute('data-theme')).toBe('dark');
  });

  it('keeps legacy --theme-* names for backward compatibility', () => {
    useThemeStore.getState().setTheme('github');
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--theme-bg')).toBe('#FFFFFF');
    expect(root.style.getPropertyValue('--theme-primary')).toBe('#0366D6');
  });
});
