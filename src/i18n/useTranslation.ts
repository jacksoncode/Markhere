import { useLanguageStore } from './languageStore';

import zhCN from './locales/zh-CN.json';
import enUS from './locales/en-US.json';

const translations = {
  'zh-CN': zhCN,
  'en-US': enUS,
};

type TranslationKey = string;

function getNestedValue(obj: any, path: string): string {
  const keys = path.split('.');
  let result = obj;
  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = result[key];
    } else {
      return path;
    }
  }
  return typeof result === 'string' ? result : path;
}

export function useTranslation() {
  const { language } = useLanguageStore();
  const t = (key: TranslationKey): string => {
    const locale = translations[language] || translations['zh-CN'];
    return getNestedValue(locale, key);
  };
  return { t, language };
}