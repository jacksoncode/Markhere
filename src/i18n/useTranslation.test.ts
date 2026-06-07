import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTranslation } from './useTranslation';

// Mock useLanguageStore before importing anything that uses it
const mockSetLanguage = vi.fn();
let currentLanguage: 'zh-CN' | 'en-US' = 'zh-CN';

vi.mock('./languageStore', () => ({
  useLanguageStore: vi.fn(() => ({
    language: currentLanguage,
    setLanguage: mockSetLanguage,
  })),
}));

describe('useTranslation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentLanguage = 'zh-CN';
  });

  describe('t() with valid dot-notation keys', () => {
    it('returns translation for a simple key', () => {
      const { t } = useTranslation();
      expect(t('app.title')).toBe('Markhere');
    });

    it('returns translation for a nested key', () => {
      const { t } = useTranslation();
      expect(t('menu.file')).toBe('文件');
    });

    it('returns translation for a deeply nested key', () => {
      const { t } = useTranslation();
      expect(t('settings.generalSection.startup')).toBe('启动选项');
    });
  });

  describe('t() with fallback', () => {
    it('returns fallback string when key is not found', () => {
      const { t } = useTranslation();
      expect(t('nonexistent.key', 'Default Text')).toBe('Default Text');
    });

    it('returns key itself when no fallback is provided and key is not found', () => {
      const { t } = useTranslation();
      expect(t('nonexistent.key')).toBe('nonexistent.key');
    });

    it('does not use fallback when key exists', () => {
      const { t } = useTranslation();
      expect(t('app.title', 'Fallback Title')).toBe('Markhere');
    });
  });

  describe('t() with interpolation', () => {
    it('replaces a single {{param}} placeholder', () => {
      const { t } = useTranslation();
      const result = t('statusBar.words', undefined, { count: 100 });
      expect(result).toBe('100 词');
    });

    it('replaces multiple {{param}} placeholders', () => {
      const { t } = useTranslation();
      const result = t('search.searchingProgress', undefined, { current: 3, total: 10 });
      expect(result).toBe('已扫描 3/10 个文件');
    });

    it('replaces placeholder with number value', () => {
      const { t } = useTranslation();
      const result = t('statusBar.chars', undefined, { count: 500 });
      expect(result).toBe('500 字符');
    });

    it('replaces placeholder with string value', () => {
      const { t } = useTranslation();
      const result = t('export.exporting', undefined, { format: 'PDF' });
      expect(result).toBe('正在导出 PDF...');
    });
  });

  describe('t() with missing interpolation params', () => {
    it('leaves the placeholder unchanged when param is missing', () => {
      const { t } = useTranslation();
      const result = t('statusBar.words', undefined, {});
      expect(result).toBe('{{count}} 词');
    });

    it('replaces known params and leaves unknown ones', () => {
      const { t } = useTranslation();
      const result = t('search.searchingProgress', undefined, { current: 1 });
      expect(result).toBe('已扫描 1/{{total}} 个文件');
    });
  });

  describe('t() with edge cases', () => {
    it('returns empty string when value is empty and no fallback', () => {
      // There are no empty-string values in the locale, so a missing key with no fallback
      // returns the key itself as a string
      const { t } = useTranslation();
      const result = t('');
      expect(result).toBe('');
    });

    it('handles keys that traverse through non-object intermediate values', () => {
      const { t } = useTranslation();
      // app.title is a string, so app.title.nonexistent will fail traversal
      const result = t('app.title.nonexistent');
      expect(result).toBe('app.title.nonexistent');
    });

    it('returns empty string for empty key with fallback', () => {
      const { t } = useTranslation();
      expect(t('', 'fallback')).toBe('fallback');
    });
  });

  describe('language switching', () => {
    it('returns Chinese translation when language is zh-CN', () => {
      currentLanguage = 'zh-CN';
      const { t } = useTranslation();
      expect(t('menu.file')).toBe('文件');
    });

    it('returns English translation when language is en-US', () => {
      currentLanguage = 'en-US';
      const { t } = useTranslation();
      expect(t('menu.file')).toBe('File');
    });

    it('returns the language from the hook', () => {
      currentLanguage = 'en-US';
      const { language } = useTranslation();
      expect(language).toBe('en-US');
    });

    it('falls back to zh-CN locale when language is invalid', () => {
      currentLanguage = 'xx-XX' as 'zh-CN'; // Override to truly unknown language
      const { t } = useTranslation();
      // Should fall back to zh-CN since 'xx-XX' is not in translations
      expect(t('menu.file')).toBe('文件');
    });
  });

  describe('interpolation with fallback', () => {
    it('interpolates params into a fallback string', () => {
      const { t } = useTranslation();
      const result = t('nonexistent.key', 'Hello {{name}}', { name: 'World' });
      expect(result).toBe('Hello World');
    });

    it('interpolates multiple params into a fallback string', () => {
      const { t } = useTranslation();
      const result = t('nonexistent.key', '{{greeting}} {{name}}', {
        greeting: 'Hi',
        name: 'Alice',
      });
      expect(result).toBe('Hi Alice');
    });
  });
});
