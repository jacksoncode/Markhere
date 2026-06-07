import { create } from 'zustand';
import { themes, ThemeName } from './themes';

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
    const root = document.documentElement;

    // Use CSS custom properties so they can be overridden by .dark-contrast.css
    root.style.setProperty('--theme-bg', theme.colors.bg);
    root.style.setProperty('--theme-text', theme.colors.text);
    root.style.setProperty('--theme-border', theme.colors.border);
    root.style.setProperty('--theme-primary', theme.colors.primary);
    root.style.setProperty('--theme-code-bg', theme.colors.codeBg);
    root.style.setProperty('--theme-hover-bg', theme.colors.hoverBg);
    root.style.setProperty('--theme-shadow', `${theme.colors.border}40`);

    const isDark = theme.colors.bg.toLowerCase() < '#888888';
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
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