import { describe, it, expect, vi } from 'vitest';

vi.mock('../store/aiStore', () => ({
  useAIStore: { getState: () => ({ getCurrentApiKey: () => '', config: { providerId: 'deepseek' } }) },
  callAI: vi.fn().mockResolvedValue('Mocked AI response'),
}));

import { AIEnhanced } from './AIEnhanced';

describe('AIEnhanced', () => {
  it('summarize returns error without API key', async () => {
    const r = await AIEnhanced.summarize('test');
    expect(r.success).toBe(false);
    expect(r.error).toBeTruthy();
  });

  it('translate requests target language', async () => {
    const r = await AIEnhanced.translate('Hello', 'ja');
    expect(r.success).toBe(false); // no API key
  });

  it('polish works with style parameter', async () => {
    const r = await AIEnhanced.polish('text', 'academic');
    expect(r.success).toBe(false);
  });

  it('suggestTags works', async () => {
    const r = await AIEnhanced.suggestTags('test');
    expect(r.success).toBe(false);
  });

  it('writingSuggestions returns result', async () => {
    const r = await AIEnhanced.writingSuggestions('test');
    expect(r.success).toBe(false);
  });

  it('generateOutline returns result', async () => {
    const r = await AIEnhanced.generateOutline('# Title\nContent');
    expect(r.success).toBe(false);
  });
});
