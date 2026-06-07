import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Language = 'zh-CN' | 'en-US' | 'ja-JP' | 'ko-KR' | 'fr-FR';

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'zh-CN',
      setLanguage: (lang) => set({ language: lang }),
    }),
    {
      name: 'language-storage',
    }
  )
);