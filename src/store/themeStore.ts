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
    
    root.style.setProperty('--bg-color', theme.colors.bg);
    root.style.setProperty('--text-color', theme.colors.text);
    root.style.setProperty('--border-color', theme.colors.border);
    root.style.setProperty('--primary-color', theme.colors.primary);
    root.style.setProperty('--code-bg', theme.colors.codeBg);
    root.style.setProperty('--hover-bg', theme.colors.hoverBg);
    root.style.setProperty('--shadow-color', `${theme.colors.border}40`);
    
    const isDark = theme.colors.bg.toLowerCase() < '#888888';
    document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
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