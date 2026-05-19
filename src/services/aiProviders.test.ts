import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AI_PROVIDERS, fetchModelsFromProvider } from './aiProviders';

describe('AI_PROVIDERS', () => {
  it('has at least 12 providers', () => {
    expect(AI_PROVIDERS.length).toBeGreaterThanOrEqual(12);
  });

  it('each provider has required fields: id, name, models, baseUrl, apiKeyPrefix', () => {
    for (const provider of AI_PROVIDERS) {
      expect(provider).toHaveProperty('id');
      expect(provider).toHaveProperty('name');
      expect(provider).toHaveProperty('baseUrl');
      expect(provider).toHaveProperty('apiKeyPrefix');
      expect(provider).toHaveProperty('models');
      expect(provider).toHaveProperty('features');

      expect(typeof provider.id).toBe('string');
      expect(typeof provider.name).toBe('string');
      expect(typeof provider.baseUrl).toBe('string');
      expect(Array.isArray(provider.models)).toBe(true);
      expect(provider.models.length).toBeGreaterThan(0);
    }
  });

  it('has no duplicate provider IDs', () => {
    const ids = AI_PROVIDERS.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('each model in each provider has valid fields', () => {
    for (const provider of AI_PROVIDERS) {
      for (const model of provider.models) {
        expect(typeof model.id).toBe('string');
        expect(typeof model.name).toBe('string');
        expect(typeof model.maxTokens).toBe('number');
        expect(model.maxTokens).toBeGreaterThan(0);

        expect(model.pricing).toHaveProperty('input');
        expect(model.pricing).toHaveProperty('output');
        expect(typeof model.pricing.input).toBe('number');
        expect(typeof model.pricing.output).toBe('number');

        expect(Array.isArray(model.capabilities)).toBe(true);
      }
    }
  });

  it('each provider has features object with streaming, tools, vision', () => {
    for (const provider of AI_PROVIDERS) {
      expect(typeof provider.features.streaming).toBe('boolean');
      expect(typeof provider.features.tools).toBe('boolean');
      expect(typeof provider.features.vision).toBe('boolean');
    }
  });

  it('Ollama provider has localhost baseUrl', () => {
    const ollama = AI_PROVIDERS.find((p) => p.id === 'ollama');
    expect(ollama).toBeDefined();
    expect(ollama!.baseUrl).toContain('127.0.0.1');
  });
});

// ---------------------------------------------------------------------------
// fetchModelsFromProvider tests
// ---------------------------------------------------------------------------

describe('fetchModelsFromProvider', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls the correct URL for a standard provider', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        data: [
          { id: 'model-a', max_tokens: 8192 },
          { id: 'model-b', max_tokens: 4096 },
        ],
      }),
    };
    mockFetch.mockResolvedValue(mockResponse as unknown as Response);

    const models = await fetchModelsFromProvider('deepseek', 'sk-test-key');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.deepseek.com/v1/models',
      {
        headers: {
          Authorization: 'Bearer sk-test-key',
        },
      }
    );

    expect(models).toHaveLength(2);
    expect(models[0].id).toBe('model-a');
    expect(models[0].maxTokens).toBe(8192);
  });

  it('handles Ollama provider with tags endpoint', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        models: [
          { name: 'llama3.1:latest' },
          { name: 'qwen2.5:7b' },
        ],
      }),
    };
    mockFetch.mockResolvedValue(mockResponse as unknown as Response);

    const models = await fetchModelsFromProvider('ollama', '');

    expect(mockFetch).toHaveBeenCalledWith('http://127.0.0.1:11434/api/tags');

    expect(models).toHaveLength(2);
    expect(models[0].id).toBe('llama3.1:latest');
    expect(models[0].pricing.input).toBe(0);
    expect(models[0].pricing.output).toBe(0);
  });

  it('falls back to default models on fetch error', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const models = await fetchModelsFromProvider('deepseek', 'sk-test-key');

    const deepseekProvider = AI_PROVIDERS.find((p) => p.id === 'deepseek');
    expect(models).toEqual(deepseekProvider!.models);
  });

  it('falls back to default models on non-ok response', async () => {
    const mockResponse = {
      ok: false,
      status: 401,
      json: vi.fn().mockResolvedValue({ error: 'Unauthorized' }),
    };
    mockFetch.mockResolvedValue(mockResponse as unknown as Response);

    const models = await fetchModelsFromProvider('deepseek', 'sk-test-key');

    const deepseekProvider = AI_PROVIDERS.find((p) => p.id === 'deepseek');
    expect(models).toEqual(deepseekProvider!.models);
  });

  it('Ollama falls back to default models on error', async () => {
    mockFetch.mockRejectedValue(new Error('Connection refused'));

    const models = await fetchModelsFromProvider('ollama', '');

    const ollamaProvider = AI_PROVIDERS.find((p) => p.id === 'ollama');
    expect(models).toEqual(ollamaProvider!.models);
  });

  it('returns empty array for unknown provider ID', async () => {
    const models = await fetchModelsFromProvider('nonexistent-provider', 'key');

    expect(models).toEqual([]);
  });

  it('returns default models when API response has no data field', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({ other: 'stuff' }),
    };
    mockFetch.mockResolvedValue(mockResponse as unknown as Response);

    const models = await fetchModelsFromProvider('deepseek', 'sk-test-key');

    const deepseekProvider = AI_PROVIDERS.find((p) => p.id === 'deepseek');
    expect(models).toEqual(deepseekProvider!.models);
  });

  it('Ollama returns empty array when response has no models field', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({ other: 'stuff' }),
    };
    mockFetch.mockResolvedValue(mockResponse as unknown as Response);

    const models = await fetchModelsFromProvider('ollama', '');

    // When data.models is missing, the optional chain returns undefined,
    // and `|| []` returns [] (does NOT fall back to defaults in the try block)
    expect(models).toEqual([]);
  });
});
