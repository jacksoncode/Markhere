import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeType = 'light' | 'dark' | 'sepia';
export type LineEnding = 'lf' | 'crlf';
export type ImageInsertBehavior = 'copy' | 'link' | 'upload';
export type ExportFolder = 'auto' | 'same' | 'custom';

interface SettingsState {
  theme: ThemeType;
  indentSize: number;
  lineEnding: LineEnding;
  exportFolder: ExportFolder;
  exportCustomPath: string;
  defaultCodeLanguage: string;
  imageInsertBehavior: ImageInsertBehavior;
  imageFolder: string;
  enableDiagrams: boolean;
  enableMath: boolean;
  enableFootnotes: boolean;
  enableYaml: boolean;
  enableAutoLinks: boolean;
  reopenLastFiles: boolean;
  smartPaste: boolean;
  autoMatchBrackets: boolean;
  fontFamily: string;
  fontSize: number;
  showLineNumber: boolean;
  spellCheck: boolean;
  spellCheckLanguage: string;
  autoSave: boolean;
  autoSaveInterval: number;
  focusMode: boolean;
  typewriterMode: boolean;
  showWordCount: boolean;
  
  setTheme: (theme: ThemeType) => void;
  setIndentSize: (size: number) => void;
  setLineEnding: (ending: LineEnding) => void;
  setExportFolder: (folder: ExportFolder) => void;
  setExportCustomPath: (path: string) => void;
  setDefaultCodeLanguage: (lang: string) => void;
  setImageInsertBehavior: (behavior: ImageInsertBehavior) => void;
  setImageFolder: (folder: string) => void;
  setEnableDiagrams: (enable: boolean) => void;
  setEnableMath: (enable: boolean) => void;
  setEnableFootnotes: (enable: boolean) => void;
  setEnableYaml: (enable: boolean) => void;
  setEnableAutoLinks: (enable: boolean) => void;
  setReopenLastFiles: (enable: boolean) => void;
  setSmartPaste: (enable: boolean) => void;
  setAutoMatchBrackets: (enable: boolean) => void;
  setFontFamily: (family: string) => void;
  setFontSize: (size: number) => void;
  setShowLineNumber: (show: boolean) => void;
  setSpellCheck: (enable: boolean) => void;
  setSpellCheckLanguage: (lang: string) => void;
  setAutoSave: (enable: boolean) => void;
  setAutoSaveInterval: (interval: number) => void;
  setFocusMode: (enable: boolean) => void;
  setTypewriterMode: (enable: boolean) => void;
  setShowWordCount: (show: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'light',
      indentSize: 2,
      lineEnding: 'lf',
      exportFolder: 'auto',
      exportCustomPath: '',
      defaultCodeLanguage: '',
      imageInsertBehavior: 'copy',
      imageFolder: '',
      enableDiagrams: true,
      enableMath: true,
      enableFootnotes: true,
      enableYaml: true,
      enableAutoLinks: true,
      reopenLastFiles: true,
      smartPaste: true,
      autoMatchBrackets: true,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: 14,
      showLineNumber: true,
      spellCheck: false,
      spellCheckLanguage: 'en-US',
      autoSave: true,
      autoSaveInterval: 30000,
      focusMode: false,
      typewriterMode: false,
      showWordCount: true,
      
      setTheme: (theme) => set({ theme }),
      setIndentSize: (indentSize) => set({ indentSize }),
      setLineEnding: (lineEnding) => set({ lineEnding }),
      setExportFolder: (exportFolder) => set({ exportFolder }),
      setExportCustomPath: (exportCustomPath) => set({ exportCustomPath }),
      setDefaultCodeLanguage: (defaultCodeLanguage) => set({ defaultCodeLanguage }),
      setImageInsertBehavior: (imageInsertBehavior) => set({ imageInsertBehavior }),
      setImageFolder: (imageFolder) => set({ imageFolder }),
      setEnableDiagrams: (enableDiagrams) => set({ enableDiagrams }),
      setEnableMath: (enableMath) => set({ enableMath }),
      setEnableFootnotes: (enableFootnotes) => set({ enableFootnotes }),
      setEnableYaml: (enableYaml) => set({ enableYaml }),
      setEnableAutoLinks: (enableAutoLinks) => set({ enableAutoLinks }),
      setReopenLastFiles: (reopenLastFiles) => set({ reopenLastFiles }),
      setSmartPaste: (smartPaste) => set({ smartPaste }),
      setAutoMatchBrackets: (autoMatchBrackets) => set({ autoMatchBrackets }),
      setFontFamily: (fontFamily) => set({ fontFamily }),
      setFontSize: (fontSize) => set({ fontSize }),
      setShowLineNumber: (showLineNumber) => set({ showLineNumber }),
      setSpellCheck: (spellCheck) => set({ spellCheck }),
      setSpellCheckLanguage: (spellCheckLanguage) => set({ spellCheckLanguage }),
      setAutoSave: (autoSave) => set({ autoSave }),
      setAutoSaveInterval: (autoSaveInterval) => set({ autoSaveInterval }),
      setFocusMode: (focusMode) => set({ focusMode }),
      setTypewriterMode: (typewriterMode) => set({ typewriterMode }),
      setShowWordCount: (showWordCount) => set({ showWordCount }),
    }),
    {
      name: 'markhere-settings',
    }
  )
);