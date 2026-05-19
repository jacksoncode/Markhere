import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks must be hoisted above all imports
// ---------------------------------------------------------------------------
const mockSetConfig = vi.fn();
const mockSetApiKey = vi.fn();
const mockClearApiKey = vi.fn();

vi.mock('./aiStore', () => ({
  useAIStore: vi.fn(() => ({
    config: { providerId: 'deepseek', model: 'deepseek-chat' },
    apiKeys: { deepseek: 'sk-test-key' },
    setConfig: mockSetConfig,
    setApiKey: mockSetApiKey,
    clearApiKey: mockClearApiKey,
  })),
}));

import { useAIProviderStore } from './aiProviderStore';
import { useAIStore } from './aiStore';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('useAIProviderStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAIStore).mockReturnValue({
      config: { providerId: 'deepseek', model: 'deepseek-chat' },
      apiKeys: { deepseek: 'sk-test-key' },
      setConfig: mockSetConfig,
      setApiKey: mockSetApiKey,
      clearApiKey: mockClearApiKey,
    } as any);
  });

  // -----------------------------------------------------------------------
  // selectedProvider
  // -----------------------------------------------------------------------
  it('selectedProvider returns providerId from aiStore config', () => {
    const store = useAIProviderStore();
    expect(store.selectedProvider).toBe('deepseek');
  });

  it('selectedProvider updates when aiStore config changes', () => {
    vi.mocked(useAIStore).mockReturnValue({
      config: { providerId: 'openai', model: 'gpt-4' },
      apiKeys: {},
      setConfig: mockSetConfig,
      setApiKey: mockSetApiKey,
      clearApiKey: mockClearApiKey,
    } as any);

    const store = useAIProviderStore();
    expect(store.selectedProvider).toBe('openai');
  });

  // -----------------------------------------------------------------------
  // selectedModel
  // -----------------------------------------------------------------------
  it('selectedModel returns model from aiStore config', () => {
    const store = useAIProviderStore();
    expect(store.selectedModel).toBe('deepseek-chat');
  });

  it('selectedModel updates when aiStore config changes', () => {
    vi.mocked(useAIStore).mockReturnValue({
      config: { providerId: 'deepseek', model: 'deepseek-reasoner' },
      apiKeys: {},
      setConfig: mockSetConfig,
      setApiKey: mockSetApiKey,
      clearApiKey: mockClearApiKey,
    } as any);

    const store = useAIProviderStore();
    expect(store.selectedModel).toBe('deepseek-reasoner');
  });

  // -----------------------------------------------------------------------
  // apiKeys
  // -----------------------------------------------------------------------
  it('apiKeys returns keys from aiStore', () => {
    const store = useAIProviderStore();
    expect(store.apiKeys).toEqual({ deepseek: 'sk-test-key' });
  });

  // -----------------------------------------------------------------------
  // setSelectedProvider
  // -----------------------------------------------------------------------
  it('setSelectedProvider delegates to aiStore setConfig with providerId', () => {
    const store = useAIProviderStore();
    store.setSelectedProvider('openai');

    expect(mockSetConfig).toHaveBeenCalledWith({ providerId: 'openai' });
  });

  // -----------------------------------------------------------------------
  // setSelectedModel
  // -----------------------------------------------------------------------
  it('setSelectedModel delegates to aiStore setConfig with model', () => {
    const store = useAIProviderStore();
    store.setSelectedModel('gpt-4o');

    expect(mockSetConfig).toHaveBeenCalledWith({ model: 'gpt-4o' });
  });

  // -----------------------------------------------------------------------
  // setApiKey / clearApiKey
  // -----------------------------------------------------------------------
  it('setApiKey delegates to aiStore setApiKey', () => {
    const store = useAIProviderStore();
    store.setApiKey('openai', 'sk-new-key');

    expect(mockSetApiKey).toHaveBeenCalledWith('openai', 'sk-new-key');
  });

  it('clearApiKey delegates to aiStore clearApiKey', () => {
    const store = useAIProviderStore();
    store.clearApiKey('deepseek');

    expect(mockClearApiKey).toHaveBeenCalledWith('deepseek');
  });
});
