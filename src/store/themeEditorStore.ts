import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ThemeConfig {
  name: string;
  colors: {
    primary: string;
    background: string;
    backgroundSecondary: string;
    text: string;
    textSecondary: string;
    border: string;
    success: string;
    warning: string;
    error: string;
  };
  fonts: {
    family: string;
    size: string;
    lineHeight: string;
  };
  isCustom: boolean;
}

interface ThemeState {
  currentTheme: ThemeConfig;
  customThemes: ThemeConfig[];
  
  setTheme: (theme: ThemeConfig) => void;
  addCustomTheme: (theme: ThemeConfig) => void;
  removeCustomTheme: (name: string) => void;
  updateThemeColors: (colors: Partial<ThemeConfig['colors']>) => void;
  updateThemeFonts: (fonts: Partial<ThemeConfig['fonts']>) => void;
  applyTheme: () => void;
  resetTheme: () => void;
}

const defaultLightTheme: ThemeConfig = {
  name: 'Light',
  colors: {
    primary: '#3b82f6',
    background: '#ffffff',
    backgroundSecondary: '#f4f4f5',
    text: '#18181b',
    textSecondary: '#71717a',
    border: '#e4e4e7',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
  },
  fonts: {
    family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    size: '14px',
    lineHeight: '1.6',
  },
  isCustom: false,
};

const defaultDarkTheme: ThemeConfig = {
  name: 'Dark',
  colors: {
    primary: '#3b82f6',
    background: '#18181b',
    backgroundSecondary: '#27272a',
    text: '#fafafa',
    textSecondary: '#a1a1aa',
    border: '#3f3f46',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
  },
  fonts: {
    family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    size: '14px',
    lineHeight: '1.6',
  },
  isCustom: false,
};

export const useThemeEditorStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      currentTheme: defaultLightTheme,
      customThemes: [],
      
      setTheme: (theme) => {
        set({ currentTheme: theme });
        get().applyTheme();
      },
      
      addCustomTheme: (theme) => set((state) => ({
        customThemes: [...state.customThemes, { ...theme, isCustom: true }],
      })),
      
      removeCustomTheme: (name) => set((state) => ({
        customThemes: state.customThemes.filter((t) => t.name !== name),
      })),
      
      updateThemeColors: (colors) => set((state) => ({
        currentTheme: {
          ...state.currentTheme,
          colors: { ...state.currentTheme.colors, ...colors },
          isCustom: true,
        },
      })),
      
      updateThemeFonts: (fonts) => set((state) => ({
        currentTheme: {
          ...state.currentTheme,
          fonts: { ...state.currentTheme.fonts, ...fonts },
          isCustom: true,
        },
      })),
      
      applyTheme: () => {
        const { currentTheme } = get();
        const root = document.documentElement;
        
        root.style.setProperty('--color-primary', currentTheme.colors.primary);
        root.style.setProperty('--color-bg-primary', currentTheme.colors.background);
        root.style.setProperty('--color-bg-secondary', currentTheme.colors.backgroundSecondary);
        root.style.setProperty('--color-text-primary', currentTheme.colors.text);
        root.style.setProperty('--color-text-secondary', currentTheme.colors.textSecondary);
        root.style.setProperty('--color-border', currentTheme.colors.border);
        root.style.setProperty('--color-success', currentTheme.colors.success);
        root.style.setProperty('--color-warning', currentTheme.colors.warning);
        root.style.setProperty('--color-error', currentTheme.colors.error);
        
        root.style.setProperty('--font-family', currentTheme.fonts.family);
        root.style.setProperty('--font-size', currentTheme.fonts.size);
        root.style.setProperty('--line-height', currentTheme.fonts.lineHeight);
      },
      
      resetTheme: () => {
        set({ currentTheme: defaultLightTheme });
        get().applyTheme();
      },
    }),
    {
      name: 'theme-editor-storage',
    }
  )
);

export { defaultLightTheme, defaultDarkTheme };