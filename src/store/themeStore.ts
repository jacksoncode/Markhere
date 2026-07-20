import { create } from 'zustand';
import { themes, ThemeName } from './themes';
import { applyThemeVariables } from './themeApplication';

interface ThemeState {
  currentTheme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  applyTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  currentTheme: 'github',

  setTheme: (theme) => {
    set({ currentTheme: theme });
    localStorage.setItem('markhere-theme', theme);
    get().applyTheme();
  },

  applyTheme: () => {
    const theme = themes[get().currentTheme];
    if (!theme) return;
    const { bg, text, border, primary, codeBg, hoverBg } = theme.colors;

    // Drive the canonical token set so presets actually theme the UI.
    // Previously only the orphaned `--theme-*` vars were written, which no
    // component consumed — see DESIGN.md §3 "合并主题双轨".
    const vars: Record<string, string> = {
      // Canonical tokens (design-tokens.css)
      '--color-bg-primary': bg,
      '--color-text-primary': text,
      '--color-border-primary': border,
      '--color-primary': primary,
      '--color-code-bg': codeBg,
      '--color-bg-hover': hoverBg,
      // Aliases consumed by theme.css / components
      '--bg-primary': bg,
      '--text-primary': text,
      '--border-color': border,
      '--primary-color': primary,
      '--code-bg': codeBg,
      '--hover-bg': hoverBg,
      // Legacy `--theme-*` names kept for backward compatibility
      '--theme-bg': bg,
      '--theme-text': text,
      '--theme-border': border,
      '--theme-primary': primary,
      '--theme-code-bg': codeBg,
      '--theme-hover-bg': hoverBg,
      '--theme-shadow': `${border}40`,
    };

    applyThemeVariables(vars, bg);
  },
}));

export const initThemeStore = () => {
  const saved = localStorage.getItem('markhere-theme') as ThemeName | null;
  if (saved && themes[saved]) {
    useThemeStore.getState().setTheme(saved);
  } else {
    useThemeStore.getState().applyTheme();
  }
};

export function initTheme() {
  initThemeStore();
}