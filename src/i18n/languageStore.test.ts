import { describe, it, expect, beforeEach } from 'vitest';
import { useLanguageStore } from './languageStore';

const initialState = {
  language: 'zh-CN' as const,
};

describe('useLanguageStore', () => {
  beforeEach(() => {
    useLanguageStore.setState({ ...initialState });
  });

  it('has zh-CN as the default language', () => {
    const { language } = useLanguageStore.getState();
    expect(language).toBe('zh-CN');
  });

  it('setLanguage updates the language to en-US', () => {
    const { setLanguage } = useLanguageStore.getState();
    setLanguage('en-US');
    expect(useLanguageStore.getState().language).toBe('en-US');
  });

  it('setLanguage updates the language back to zh-CN', () => {
    useLanguageStore.setState({ language: 'en-US' });
    const { setLanguage } = useLanguageStore.getState();
    setLanguage('zh-CN');
    expect(useLanguageStore.getState().language).toBe('zh-CN');
  });

  it('supports toggling between both supported languages', () => {
    const { setLanguage } = useLanguageStore.getState();

    setLanguage('en-US');
    expect(useLanguageStore.getState().language).toBe('en-US');

    setLanguage('zh-CN');
    expect(useLanguageStore.getState().language).toBe('zh-CN');
  });
});
