import { useLanguageStore } from './languageStore';

import zhCN from './locales/zh-CN.json';
import enUS from './locales/en-US.json';

// Lazy-load additional locales
const translations: Record<string, Record<string, unknown>> = {
  'zh-CN': zhCN,
  'en-US': enUS,
};

// Dynamic import for non-default locales
const localeLoaders: Record<string, () => Promise<Record<string, unknown>>> = {
  'ja-JP': () => import('./locales/ja-JP.json'),
  'ko-KR': () => import('./locales/ko-KR.json'),
  'fr-FR': () => import('./locales/fr-FR.json'),
};

// Preload fallback locale
for (const [lang, loader] of Object.entries(localeLoaders)) {
  loader().then(mod => {
    const data = (mod as { default?: Record<string, unknown> }).default || (mod as Record<string, unknown>);
    translations[lang] = data;
  }).catch(() => { /* locale not available, will use fallback */ });
}

type TranslationParams = Record<string, string | number>;

function getNestedValue(obj: any, path: string): string | undefined {
  const keys = path.split('.');
  let result: any = obj;
  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = result[key];
    } else {
      return undefined;
    }
  }
  return typeof result === 'string' ? result : undefined;
}

/**
 * Replace {{variable}} placeholders in a string with values from a params object.
 */
function interpolate(text: string, params?: TranslationParams): string {
  if (!params) return text;
  return text.replace(/\{\{(\w+)\}\}/g, (_match, key: string) =>
    String(params[key] ?? `{{${key}}}`)
  );
}

export function useTranslation() {
  const { language } = useLanguageStore();

  /**
   * Look up a translation key in the current locale.
   *
   * @param key       Dot-separated path to the translation (e.g. "statusBar.words").
   * @param fallback  String to return when the key is not found in the current locale.
   * @param params    Optional object for interpolating {{placeholder}} tokens.
   */
  const t = (
    key: string,
    fallback?: string,
    params?: TranslationParams
  ): string => {
    const locale = translations[language] || translations['zh-CN'];
    const raw = getNestedValue(locale, key);
    const value = raw ?? fallback ?? key;
    return interpolate(value, params);
  };

  return { t, language };
}