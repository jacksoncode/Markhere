import { create } from 'zustand';

export interface FontSettings {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
}

const defaultFonts = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  fontSize: 16,
  lineHeight: 1.6,
};

interface FontState extends FontSettings {
  setFontFamily: (font: string) => void;
  setFontSize: (size: number) => void;
  setLineHeight: (height: number) => void;
  applyFont: () => void;
}

export const useFontStore = create<FontState>((set, get) => ({
  ...defaultFonts,
  
  setFontFamily: (font) => {
    set({ fontFamily: font });
    localStorage.setItem('markhere-font-family', font);
    get().applyFont();
  },
  
  setFontSize: (size) => {
    set({ fontSize: Math.max(10, Math.min(32, size)) });
    localStorage.setItem('markhere-font-size', size.toString());
    get().applyFont();
  },
  
  setLineHeight: (height) => {
    set({ lineHeight: Math.max(1.0, Math.min(3.0, height)) });
    localStorage.setItem('markhere-line-height', height.toString());
    get().applyFont();
  },
  
  applyFont: () => {
    const state = get();
    const root = document.documentElement;
    
    root.style.setProperty('--font-family', state.fontFamily);
    root.style.setProperty('--font-size', `${state.fontSize}px`);
    root.style.setProperty('--line-height', state.lineHeight.toString());
    
    const editor = document.querySelector('.editor-content') as HTMLElement | null;
    if (editor) {
      editor.style.fontFamily = state.fontFamily;
      editor.style.fontSize = `${state.fontSize}px`;
      editor.style.lineHeight = state.lineHeight.toString();
    }
  },
}));

export const initFontStore = () => {
  const fontFamily = localStorage.getItem('markhere-font-family');
  const fontSize = localStorage.getItem('markhere-font-size');
  const lineHeight = localStorage.getItem('markhere-line-height');
  
  if (fontFamily) useFontStore.getState().setFontFamily(fontFamily);
  if (fontSize) useFontStore.getState().setFontSize(parseInt(fontSize, 10));
  if (lineHeight) useFontStore.getState().setLineHeight(parseFloat(lineHeight));
};