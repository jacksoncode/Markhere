import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/* ------------------------------------------------------------------ */
/*  ThemeConfig – colours grouped by role, plus fonts                 */
/* ------------------------------------------------------------------ */
export interface ThemeColors {
  /* Backgrounds */
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  /* Text */
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  /* Primary */
  primaryColor: string;
  primaryHover: string;
  /* Accent */
  accentColor: string;
  accentHover: string;
  /* Borders */
  borderColor: string;
  borderLight: string;
  /* Code */
  codeBg: string;
  codeText: string;
  /* Headings & links */
  headingColor: string;
  linkColor: string;
  /* Chrome */
  toolbarBg: string;
  sidebarBg: string;
  statusbarBg: string;
  /* Status */
  success: string;
  warning: string;
  error: string;
}

export interface ThemeFonts {
  family: string;
  size: string;
  lineHeight: string;
}

export interface ThemeConfig {
  name: string;
  colors: ThemeColors;
  fonts: ThemeFonts;
  isCustom: boolean;
}

/* ------------------------------------------------------------------ */
/*  Preset Themes                                                     */
/* ------------------------------------------------------------------ */

const defaultLightTheme: ThemeConfig = {
  name: 'Default Light',
  colors: {
    bgPrimary: '#ffffff',
    bgSecondary: '#f4f4f5',
    bgTertiary: '#e4e4e7',
    textPrimary: '#18181b',
    textSecondary: '#71717a',
    textMuted: '#a1a1aa',
    primaryColor: '#3b82f6',
    primaryHover: '#2563eb',
    accentColor: '#8b5cf6',
    accentHover: '#7c3aed',
    borderColor: '#e4e4e7',
    borderLight: '#f4f4f5',
    codeBg: '#f4f4f5',
    codeText: '#18181b',
    headingColor: '#18181b',
    linkColor: '#3b82f6',
    toolbarBg: '#fafafa',
    sidebarBg: '#ffffff',
    statusbarBg: '#f4f4f5',
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
  name: 'Default Dark',
  colors: {
    bgPrimary: '#18181b',
    bgSecondary: '#27272a',
    bgTertiary: '#3f3f46',
    textPrimary: '#fafafa',
    textSecondary: '#a1a1aa',
    textMuted: '#71717a',
    primaryColor: '#3b82f6',
    primaryHover: '#60a5fa',
    accentColor: '#a78bfa',
    accentHover: '#8b5cf6',
    borderColor: '#3f3f46',
    borderLight: '#27272a',
    codeBg: '#27272a',
    codeText: '#fafafa',
    headingColor: '#fafafa',
    linkColor: '#60a5fa',
    toolbarBg: '#27272a',
    sidebarBg: '#18181b',
    statusbarBg: '#27272a',
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

const sepiaTheme: ThemeConfig = {
  name: 'Sepia',
  colors: {
    bgPrimary: '#f4ecd8',
    bgSecondary: '#e8dcc0',
    bgTertiary: '#dccca8',
    textPrimary: '#5b4636',
    textSecondary: '#6b5544',
    textMuted: '#8b7355',
    primaryColor: '#8b5e3c',
    primaryHover: '#a0704c',
    accentColor: '#c17d3b',
    accentHover: '#d48d4b',
    borderColor: '#dccca8',
    borderLight: '#e8dcc0',
    codeBg: '#e8dcc0',
    codeText: '#5b4636',
    headingColor: '#4a3728',
    linkColor: '#8b5e3c',
    toolbarBg: '#e8dcc0',
    sidebarBg: '#f4ecd8',
    statusbarBg: '#e8dcc0',
    success: '#5b8c5a',
    warning: '#c4963b',
    error: '#c45a3b',
  },
  fonts: {
    family: 'Georgia, "Times New Roman", serif',
    size: '15px',
    lineHeight: '1.7',
  },
  isCustom: false,
};

const nordTheme: ThemeConfig = {
  name: 'Nord',
  colors: {
    bgPrimary: '#2e3440',
    bgSecondary: '#3b4252',
    bgTertiary: '#434c5e',
    textPrimary: '#d8dee9',
    textSecondary: '#e5e9f0',
    textMuted: '#81a1c1',
    primaryColor: '#5e81ac',
    primaryHover: '#81a1c1',
    accentColor: '#88c0d0',
    accentHover: '#8fbcbb',
    borderColor: '#4c566a',
    borderLight: '#3b4252',
    codeBg: '#242933',
    codeText: '#d8dee9',
    headingColor: '#88c0d0',
    linkColor: '#81a1c1',
    toolbarBg: '#3b4252',
    sidebarBg: '#2e3440',
    statusbarBg: '#3b4252',
    success: '#a3be8c',
    warning: '#ebcb8b',
    error: '#bf616a',
  },
  fonts: {
    family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    size: '14px',
    lineHeight: '1.6',
  },
  isCustom: false,
};

const draculaTheme: ThemeConfig = {
  name: 'Dracula',
  colors: {
    bgPrimary: '#282a36',
    bgSecondary: '#343746',
    bgTertiary: '#44475a',
    textPrimary: '#f8f8f2',
    textSecondary: '#6272a4',
    textMuted: '#44475a',
    primaryColor: '#bd93f9',
    primaryHover: '#caa9fa',
    accentColor: '#50fa7b',
    accentHover: '#69ff94',
    borderColor: '#44475a',
    borderLight: '#343746',
    codeBg: '#1e1f29',
    codeText: '#f8f8f2',
    headingColor: '#ff79c6',
    linkColor: '#8be9fd',
    toolbarBg: '#343746',
    sidebarBg: '#282a36',
    statusbarBg: '#343746',
    success: '#50fa7b',
    warning: '#f1fa8c',
    error: '#ff5555',
  },
  fonts: {
    family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    size: '14px',
    lineHeight: '1.6',
  },
  isCustom: false,
};

const solarizedLightTheme: ThemeConfig = {
  name: 'Solarized Light',
  colors: {
    bgPrimary: '#fdf6e3',
    bgSecondary: '#eee8d5',
    bgTertiary: '#e4ddc8',
    textPrimary: '#657b83',
    textSecondary: '#839496',
    textMuted: '#93a1a1',
    primaryColor: '#268bd2',
    primaryHover: '#2d9ae8',
    accentColor: '#b58900',
    accentHover: '#cb9600',
    borderColor: '#d3cbb6',
    borderLight: '#eee8d5',
    codeBg: '#eee8d5',
    codeText: '#657b83',
    headingColor: '#586e75',
    linkColor: '#268bd2',
    toolbarBg: '#eee8d5',
    sidebarBg: '#fdf6e3',
    statusbarBg: '#eee8d5',
    success: '#859900',
    warning: '#b58900',
    error: '#dc322f',
  },
  fonts: {
    family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    size: '14px',
    lineHeight: '1.6',
  },
  isCustom: false,
};

const solarizedDarkTheme: ThemeConfig = {
  name: 'Solarized Dark',
  colors: {
    bgPrimary: '#002b36',
    bgSecondary: '#073642',
    bgTertiary: '#134652',
    textPrimary: '#839496',
    textSecondary: '#586e75',
    textMuted: '#657b83',
    primaryColor: '#268bd2',
    primaryHover: '#2d9ae8',
    accentColor: '#b58900',
    accentHover: '#cb9600',
    borderColor: '#073642',
    borderLight: '#0a4959',
    codeBg: '#073642',
    codeText: '#839496',
    headingColor: '#93a1a1',
    linkColor: '#268bd2',
    toolbarBg: '#073642',
    sidebarBg: '#002b36',
    statusbarBg: '#073642',
    success: '#859900',
    warning: '#b58900',
    error: '#dc322f',
  },
  fonts: {
    family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    size: '14px',
    lineHeight: '1.6',
  },
  isCustom: false,
};

const monokaiTheme: ThemeConfig = {
  name: 'Monokai',
  colors: {
    bgPrimary: '#272822',
    bgSecondary: '#3e3d32',
    bgTertiary: '#49483e',
    textPrimary: '#f8f8f2',
    textSecondary: '#a6a598',
    textMuted: '#75715e',
    primaryColor: '#a6e22e',
    primaryHover: '#b8f340',
    accentColor: '#f92672',
    accentHover: '#fa5290',
    borderColor: '#3e3d32',
    borderLight: '#49483e',
    codeBg: '#1e1f1c',
    codeText: '#f8f8f2',
    headingColor: '#fd971f',
    linkColor: '#66d9ef',
    toolbarBg: '#3e3d32',
    sidebarBg: '#272822',
    statusbarBg: '#3e3d32',
    success: '#a6e22e',
    warning: '#e6db74',
    error: '#f92672',
  },
  fonts: {
    family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    size: '14px',
    lineHeight: '1.6',
  },
  isCustom: false,
};

const githubLightTheme: ThemeConfig = {
  name: 'GitHub Light',
  colors: {
    bgPrimary: '#ffffff',
    bgSecondary: '#f6f8fa',
    bgTertiary: '#e1e4e8',
    textPrimary: '#24292e',
    textSecondary: '#586069',
    textMuted: '#959da5',
    primaryColor: '#0366d6',
    primaryHover: '#0256b9',
    accentColor: '#28a745',
    accentHover: '#22863a',
    borderColor: '#e1e4e8',
    borderLight: '#f0f0f0',
    codeBg: '#f6f8fa',
    codeText: '#24292e',
    headingColor: '#24292e',
    linkColor: '#0366d6',
    toolbarBg: '#f6f8fa',
    sidebarBg: '#ffffff',
    statusbarBg: '#f6f8fa',
    success: '#28a745',
    warning: '#f9c513',
    error: '#d73a49',
  },
  fonts: {
    family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    size: '14px',
    lineHeight: '1.6',
  },
  isCustom: false,
};

const githubDarkTheme: ThemeConfig = {
  name: 'GitHub Dark',
  colors: {
    bgPrimary: '#0d1117',
    bgSecondary: '#161b22',
    bgTertiary: '#21262d',
    textPrimary: '#c9d1d9',
    textSecondary: '#8b949e',
    textMuted: '#484f58',
    primaryColor: '#58a6ff',
    primaryHover: '#79c0ff',
    accentColor: '#3fb950',
    accentHover: '#56d364',
    borderColor: '#30363d',
    borderLight: '#21262d',
    codeBg: '#161b22',
    codeText: '#c9d1d9',
    headingColor: '#f0f6fc',
    linkColor: '#58a6ff',
    toolbarBg: '#161b22',
    sidebarBg: '#0d1117',
    statusbarBg: '#161b22',
    success: '#3fb950',
    warning: '#d29922',
    error: '#f85149',
  },
  fonts: {
    family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    size: '14px',
    lineHeight: '1.6',
  },
  isCustom: false,
};

/** All built-in preset themes available for one-click selection. */
export const presetThemes: ThemeConfig[] = [
  defaultLightTheme,
  defaultDarkTheme,
  sepiaTheme,
  nordTheme,
  draculaTheme,
  solarizedLightTheme,
  solarizedDarkTheme,
  monokaiTheme,
  githubLightTheme,
  githubDarkTheme,
];

/* ------------------------------------------------------------------ */
/*  Store                                                             */
/* ------------------------------------------------------------------ */

interface ThemeState {
  currentTheme: ThemeConfig;
  customThemes: ThemeConfig[];
  isLivePreview: boolean;

  /* Basic editing */
  setTheme: (theme: ThemeConfig) => void;
  addCustomTheme: (theme: ThemeConfig) => void;
  removeCustomTheme: (name: string) => void;
  updateThemeColors: (colors: Partial<ThemeColors>) => void;
  updateThemeFonts: (fonts: Partial<ThemeFonts>) => void;

  /* Application */
  applyTheme: () => void;

  /* Import / Export */
  exportTheme: () => string;
  importTheme: (json: string) => boolean;

  /* Preview */
  previewTheme: (cssVars: Record<string, string>) => void;
  clearPreview: () => void;

  /* Reset */
  resetToDefault: () => void;

  /* Live preview toggle */
  toggleLivePreview: () => void;
}

/* ---------- helpers ---------- */

/** Clone a theme deeply to avoid accidental mutation. */
function cloneTheme(t: ThemeConfig): ThemeConfig {
  return JSON.parse(JSON.stringify(t));
}

/** Known colour keys (for validation in importTheme). */
const KNOWN_COLOR_KEYS: (keyof ThemeColors)[] = [
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

const DEFAULT_FONTS: ThemeFonts = {
  family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  size: '14px',
  lineHeight: '1.6',
};

function applyCssFromConfig(theme: ThemeConfig): void {
  const root = document.documentElement;
  const c = theme.colors;
  const f = theme.fonts;

  /* New CSS variable naming */
  root.style.setProperty('--bg-primary', c.bgPrimary);
  root.style.setProperty('--bg-secondary', c.bgSecondary);
  root.style.setProperty('--bg-tertiary', c.bgTertiary);
  root.style.setProperty('--text-primary', c.textPrimary);
  root.style.setProperty('--text-secondary', c.textSecondary);
  root.style.setProperty('--text-muted', c.textMuted);
  root.style.setProperty('--primary-color', c.primaryColor);
  root.style.setProperty('--primary-hover', c.primaryHover);
  root.style.setProperty('--accent-color', c.accentColor);
  root.style.setProperty('--accent-hover', c.accentHover);
  root.style.setProperty('--border-color', c.borderColor);
  root.style.setProperty('--border-light', c.borderLight);
  root.style.setProperty('--code-bg', c.codeBg);
  root.style.setProperty('--code-text', c.codeText);
  root.style.setProperty('--heading-color', c.headingColor);
  root.style.setProperty('--link-color', c.linkColor);
  root.style.setProperty('--toolbar-bg', c.toolbarBg);
  root.style.setProperty('--sidebar-bg', c.sidebarBg);
  root.style.setProperty('--statusbar-bg', c.statusbarBg);

  /* Backward compatibility with legacy variable names */
  root.style.setProperty('--color-primary', c.primaryColor);
  root.style.setProperty('--color-bg-primary', c.bgPrimary);
  root.style.setProperty('--color-bg-secondary', c.bgSecondary);
  root.style.setProperty('--color-text-primary', c.textPrimary);
  root.style.setProperty('--color-text-secondary', c.textSecondary);
  root.style.setProperty('--color-border', c.borderColor);
  root.style.setProperty('--color-success', c.success);
  root.style.setProperty('--color-warning', c.warning);
  root.style.setProperty('--color-error', c.error);

  root.style.setProperty('--font-family', f.family);
  root.style.setProperty('--font-size', f.size);
  root.style.setProperty('--line-height', f.lineHeight);
}

/* ------------------------------------------------------------------ */
/*  Store creation                                                    */
/* ------------------------------------------------------------------ */

export const useThemeEditorStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      currentTheme: cloneTheme(defaultLightTheme),
      customThemes: [],
      isLivePreview: true,

      /* ---- Basic editing ---- */

      setTheme: (theme) => {
        set({ currentTheme: cloneTheme(theme) });
        if (get().isLivePreview) {
          applyCssFromConfig(theme);
        }
      },

      addCustomTheme: (theme) => {
        const clone = cloneTheme(theme);
        clone.isCustom = true;
        set((state) => ({
          customThemes: [...state.customThemes, clone],
        }));
      },

      removeCustomTheme: (name) =>
        set((state) => ({
          customThemes: state.customThemes.filter((t) => t.name !== name),
        })),

      updateThemeColors: (colors) =>
        set((state) => {
          const updated: ThemeConfig = {
            ...state.currentTheme,
            colors: { ...state.currentTheme.colors, ...colors },
            isCustom: true,
          };
          if (state.isLivePreview) {
            applyCssFromConfig(updated);
          }
          return { currentTheme: updated };
        }),

      updateThemeFonts: (fonts) =>
        set((state) => {
          const updated: ThemeConfig = {
            ...state.currentTheme,
            fonts: { ...state.currentTheme.fonts, ...fonts },
            isCustom: true,
          };
          if (state.isLivePreview) {
            applyCssFromConfig(updated);
          }
          return { currentTheme: updated };
        }),

      /* ---- Application ---- */

      applyTheme: () => {
        applyCssFromConfig(get().currentTheme);
      },

      /* ---- Import / Export ---- */

      exportTheme: (): string => {
        return JSON.stringify(get().currentTheme, null, 2);
      },

      importTheme: (json: string): boolean => {
        try {
          const parsed = JSON.parse(json);

          if (!parsed || typeof parsed !== 'object') return false;
          if (typeof parsed.name !== 'string' || !parsed.name.trim()) return false;

          // Validate colours – at minimum bgPrimary and textPrimary must exist
          if (!parsed.colors || typeof parsed.colors !== 'object') return false;
          if (
            typeof parsed.colors.bgPrimary !== 'string' ||
            typeof parsed.colors.textPrimary !== 'string'
          ) {
            return false;
          }

          // Build safe colour map (fill missing keys with defaults from light theme)
          const colors = { ...defaultLightTheme.colors } as Record<string, string>;
          for (const key of KNOWN_COLOR_KEYS) {
            if (typeof parsed.colors[key] === 'string' && parsed.colors[key].trim()) {
              colors[key] = parsed.colors[key];
            }
          }

          // Build safe font map
          const fonts: ThemeFonts = { ...DEFAULT_FONTS };
          if (parsed.fonts && typeof parsed.fonts === 'object') {
            if (typeof parsed.fonts.family === 'string') fonts.family = parsed.fonts.family;
            if (typeof parsed.fonts.size === 'string') fonts.size = parsed.fonts.size;
            if (typeof parsed.fonts.lineHeight === 'string')
              fonts.lineHeight = parsed.fonts.lineHeight;
          }

          const imported: ThemeConfig = {
            name: parsed.name.trim(),
            colors: colors as unknown as ThemeColors,
            fonts,
            isCustom: true,
          };

          set({ currentTheme: imported });
          if (get().isLivePreview) {
            applyCssFromConfig(imported);
          }
          return true;
        } catch {
          return false;
        }
      },

      /* ---- Preview (temporary, won't persist) ---- */

      previewTheme: (cssVars) => {
        const root = document.documentElement;
        for (const [key, value] of Object.entries(cssVars)) {
          root.style.setProperty(key, value);
        }
      },

      clearPreview: () => {
        applyCssFromConfig(get().currentTheme);
      },

      /* ---- Reset ---- */

      resetToDefault: () => {
        const def = cloneTheme(defaultLightTheme);
        set({ currentTheme: def });
        applyCssFromConfig(def);
      },

      /* ---- Toggle ---- */

      toggleLivePreview: () => {
        const next = !get().isLivePreview;
        set({ isLivePreview: next });
        // When turning live preview on, apply current edits immediately
        if (next) {
          applyCssFromConfig(get().currentTheme);
        }
      },
    }),
    {
      name: 'theme-editor-storage',
    },
  ),
);

export { defaultLightTheme, defaultDarkTheme };
