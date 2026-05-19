import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAIStore, callAI, callAIStream } from '../store/aiStore';

const mockFetch = vi.fn();
(globalThis as any).fetch = mockFetch;

const initialState = {
  config: { providerId: 'deepseek' as string, model: 'deepseek-chat' as string },
  apiKeys: {} as Record<string, string>,
  isEnabled: false,
  history: [] as { role: 'user' | 'assistant'; content: string }[],
};

describe('useAIStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useAIStore.setState({ ...initialState });
    mockFetch.mockReset();
  });

  describe('initial state', () => {
    it('has correct default config', () => {
      const state = useAIStore.getState();
      expect(state.config).toEqual({ providerId: 'deepseek', model: 'deepseek-chat' });
    });

    it('has empty apiKeys', () => {
      expect(useAIStore.getState().apiKeys).toEqual({});
    });

    it('is disabled by default', () => {
      expect(useAIStore.getState().isEnabled).toBe(false);
    });

    it('has empty history', () => {
      expect(useAIStore.getState().history).toEqual([]);
    });
  });

  describe('setConfig', () => {
    it('updates providerId', () => {
      useAIStore.getState().setConfig({ providerId: 'qwen' });
      expect(useAIStore.getState().config.providerId).toBe('qwen');
    });

    it('updates model', () => {
      useAIStore.getState().setConfig({ model: 'deepseek-coder' });
      expect(useAIStore.getState().config.model).toBe('deepseek-coder');
    });

    it('merges partial config preserving unspecified fields', () => {
      useAIStore.getState().setConfig({ providerId: 'moonshot' });
      const config = useAIStore.getState().config;
      expect(config.providerId).toBe('moonshot');
      expect(config.model).toBe('deepseek-chat');
    });
  });

  describe('setApiKey', () => {
    it('stores api key for a provider', () => {
      useAIStore.getState().setApiKey('deepseek', 'sk-test-key');
      expect(useAIStore.getState().apiKeys.deepseek).toBe('sk-test-key');
    });

    it('stores keys for multiple providers independently', () => {
      const { setApiKey } = useAIStore.getState();
      setApiKey('deepseek', 'sk-ds-key');
      setApiKey('qwen', 'sk-qw-key');
      const keys = useAIStore.getState().apiKeys;
      expect(keys.deepseek).toBe('sk-ds-key');
      expect(keys.qwen).toBe('sk-qw-key');
    });
  });

  describe('clearApiKey', () => {
    it('sets the key to empty string for the given provider', () => {
      const { setApiKey, clearApiKey } = useAIStore.getState();
      setApiKey('deepseek', 'sk-test-key');
      expect(useAIStore.getState().apiKeys.deepseek).toBe('sk-test-key');

      clearApiKey('deepseek');
      expect(useAIStore.getState().apiKeys.deepseek).toBe('');
    });
  });

  describe('toggleEnabled', () => {
    it('toggles from false to true', () => {
      useAIStore.getState().toggleEnabled();
      expect(useAIStore.getState().isEnabled).toBe(true);
    });

    it('toggles from true back to false', () => {
      useAIStore.setState({ isEnabled: true });
      useAIStore.getState().toggleEnabled();
      expect(useAIStore.getState().isEnabled).toBe(false);
    });
  });

  describe('addHistory', () => {
    it('adds user and assistant messages to history', () => {
      const { addHistory } = useAIStore.getState();
      addHistory('user', 'Hello');
      addHistory('assistant', 'Hi there!');

      const history = useAIStore.getState().history;
      expect(history).toHaveLength(2);
      expect(history[0]).toEqual({ role: 'user', content: 'Hello' });
      expect(history[1]).toEqual({ role: 'assistant', content: 'Hi there!' });
    });

    it('wraps history keeping at most 21 items', () => {
      const { addHistory } = useAIStore.getState();
      for (let i = 1; i <= 25; i++) {
        addHistory('user', `Message ${i}`);
      }

      const history = useAIStore.getState().history;
      expect(history).toHaveLength(21);
      expect(history[0].content).toBe('Message 5');
      expect(history[20].content).toBe('Message 25');
    });
  });

  describe('clearHistory', () => {
    it('empties the history array', () => {
      const { addHistory, clearHistory } = useAIStore.getState();
      addHistory('user', 'Hello');
      addHistory('assistant', 'Hi');

      clearHistory();
      expect(useAIStore.getState().history).toEqual([]);
    });
  });

  describe('getCurrentApiKey', () => {
    it('returns the api key for the active provider', () => {
      const { setApiKey } = useAIStore.getState();
      setApiKey('deepseek', 'sk-ds-key');
      expect(useAIStore.getState().getCurrentApiKey()).toBe('sk-ds-key');
    });

    it('returns empty string when no key is configured', () => {
      expect(useAIStore.getState().getCurrentApiKey()).toBe('');
    });

    it('returns empty string for a provider without a configured key', () => {
      const { setApiKey } = useAIStore.getState();
      setApiKey('deepseek', 'sk-ds-key');
      useAIStore.getState().setConfig({ providerId: 'qwen' });
      expect(useAIStore.getState().getCurrentApiKey()).toBe('');
    });
  });
});

describe('callAI', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  function mockSuccessResponse(content: string) {
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content } }] }),
    };
  }

  it('constructs fetch URL from provider baseUrl', async () => {
    mockFetch.mockResolvedValueOnce(mockSuccessResponse('Response'));

    await callAI('prompt', 'context', { providerId: 'deepseek', model: 'deepseek-chat' }, 'sk-test');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toBe('https://api.deepseek.com/v1/chat/completions');
  });

  it('sends correct headers including Authorization and Content-Type', async () => {
    mockFetch.mockResolvedValueOnce(mockSuccessResponse('Response'));

    await callAI('prompt', 'context', { providerId: 'deepseek', model: 'deepseek-chat' }, 'sk-test-key');

    const options = mockFetch.mock.calls[0][1] as RequestInit;
    expect(options.method).toBe('POST');
    expect((options.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect((options.headers as Record<string, string>)['Authorization']).toBe('Bearer sk-test-key');
  });

  it('sends correct request body structure', async () => {
    mockFetch.mockResolvedValueOnce(mockSuccessResponse('Response'));

    await callAI('Write a poem', 'User is editing a markdown file',
      { providerId: 'deepseek', model: 'deepseek-chat' }, 'sk-key');

    const body = JSON.parse((mockFetch.mock.calls[0][1] as any).body as string);
    expect(body.model).toBe('deepseek-chat');
    expect(body.stream).toBe(false);
    expect(body.max_tokens).toBe(1024);
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[1].role).toBe('user');
    expect(body.messages[1].content).toBe('Write a poem');
  });

  it('extracts content from response choices', async () => {
    mockFetch.mockResolvedValueOnce(mockSuccessResponse('Generated response'));

    const result = await callAI('prompt', 'context',
      { providerId: 'deepseek', model: 'deepseek-chat' }, 'sk-key');

    expect(result).toBe('Generated response');
  });

  it('throws on non-OK HTTP status', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    });

    await expect(
      callAI('prompt', 'context', { providerId: 'deepseek', model: 'deepseek-chat' }, 'sk-key')
    ).rejects.toThrow('API error (401): Unauthorized');
  });

  it('throws when apiKey is missing for non-Ollama providers', async () => {
    await expect(
      callAI('prompt', 'context', { providerId: 'deepseek', model: 'deepseek-chat' }, '')
    ).rejects.toThrow('API key not configured');
  });

  it('allows empty apiKey for Ollama provider', async () => {
    mockFetch.mockResolvedValueOnce(mockSuccessResponse('Local response'));

    const result = await callAI('prompt', 'context',
      { providerId: 'ollama', model: 'llama3.1' }, '');

    expect(result).toBe('Local response');
    const options = mockFetch.mock.calls[0][1] as RequestInit;
    const headers = (options.headers as Record<string, string>);
    expect(headers['Authorization']).toBeUndefined();
  });

  it('returns empty string when response has no choices', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const result = await callAI('prompt', 'context',
      { providerId: 'deepseek', model: 'deepseek-chat' }, 'sk-key');

    expect(result).toBe('');
  });

  it('uses Qwen provider baseUrl correctly', async () => {
    mockFetch.mockResolvedValueOnce(mockSuccessResponse('Qwen response'));

    await callAI('prompt', 'context', { providerId: 'qwen', model: 'qwen-turbo' }, 'sk-qw-key');

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toBe('https://dashscope.aliyuncs.com/api/v1/chat/completions');
    const options = mockFetch.mock.calls[0][1] as RequestInit;
    const headers = (options.headers as Record<string, string>);
    expect(headers['Authorization']).toBe('Bearer sk-qw-key');
    const body = JSON.parse((options as any).body as string);
    expect(body.model).toBe('qwen-turbo');
  });

  it('throws for unknown provider id', async () => {
    await expect(
      callAI('prompt', 'context', { providerId: 'nonexistent', model: 'model' }, 'sk-key')
    ).rejects.toThrow('Unknown provider: nonexistent');
  });
});

describe('callAIStream', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  function createSSEChunk(data: string): Uint8Array {
    return new TextEncoder().encode(`data: ${data}\n\n`);
  }

  function createStreamResponse(chunks: Uint8Array[]): Response {
    const stream = new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(chunk);
        }
        controller.close();
      },
    });

    return {
      ok: true,
      body: stream,
    } as unknown as Response;
  }

  it('constructs correct fetch URL for streaming endpoint', async () => {
    mockFetch.mockResolvedValueOnce(createStreamResponse([]));

    await callAIStream('prompt', 'context',
      { providerId: 'deepseek', model: 'deepseek-chat' }, 'sk-key', () => {});

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toBe('https://api.deepseek.com/v1/chat/completions');
  });

  it('sends stream: true in request body', async () => {
    mockFetch.mockResolvedValueOnce(createStreamResponse([]));

    await callAIStream('prompt', 'context',
      { providerId: 'deepseek', model: 'deepseek-chat' }, 'sk-key', () => {});

    const options = mockFetch.mock.calls[0][1] as any;
    const body = JSON.parse(options.body as string);
    expect(body.stream).toBe(true);
  });

  it('calls onChunk for each SSE delta content', async () => {
    const chunks = [
      createSSEChunk(JSON.stringify({ choices: [{ delta: { content: 'Hello' } }] })),
      createSSEChunk(JSON.stringify({ choices: [{ delta: { content: ' World' } }] })),
      createSSEChunk(JSON.stringify({ choices: [{ delta: { content: '!' } }] })),
    ];
    mockFetch.mockResolvedValueOnce(createStreamResponse(chunks));

    const received: string[] = [];
    await callAIStream('prompt', 'context',
      { providerId: 'deepseek', model: 'deepseek-chat' }, 'sk-key',
      (chunk) => { received.push(chunk); });

    expect(received).toEqual(['Hello', ' World', '!']);
  });

  it('returns full concatenated content', async () => {
    const chunks = [
      createSSEChunk(JSON.stringify({ choices: [{ delta: { content: 'Part 1' } }] })),
      createSSEChunk(JSON.stringify({ choices: [{ delta: { content: 'Part 2' } }] })),
    ];
    mockFetch.mockResolvedValueOnce(createStreamResponse(chunks));

    const fullContent = await callAIStream('prompt', 'context',
      { providerId: 'deepseek', model: 'deepseek-chat' }, 'sk-key', () => {});

    expect(fullContent).toBe('Part 1Part 2');
  });

  it('skips malformed JSON chunks gracefully', async () => {
    const chunks = [
      createSSEChunk(JSON.stringify({ choices: [{ delta: { content: 'Good' } }] })),
      createSSEChunk('invalid json{{{'),
      createSSEChunk(JSON.stringify({ choices: [{ delta: { content: ' Chunk' } }] })),
    ];
    mockFetch.mockResolvedValueOnce(createStreamResponse(chunks));

    const received: string[] = [];
    const fullContent = await callAIStream('prompt', 'context',
      { providerId: 'deepseek', model: 'deepseek-chat' }, 'sk-key',
      (chunk) => { received.push(chunk); });

    expect(received).toEqual(['Good', ' Chunk']);
    expect(fullContent).toBe('Good Chunk');
  });

  it('skips [DONE] marker without passing to onChunk', async () => {
    const chunks = [
      createSSEChunk(JSON.stringify({ choices: [{ delta: { content: 'Content' } }] })),
      new TextEncoder().encode('data: [DONE]\n\n'),
    ];
    mockFetch.mockResolvedValueOnce(createStreamResponse(chunks));

    const received: string[] = [];
    await callAIStream('prompt', 'context',
      { providerId: 'deepseek', model: 'deepseek-chat' }, 'sk-key',
      (chunk) => { received.push(chunk); });

    expect(received).toEqual(['Content']);
  });

  it('throws on non-OK streaming response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });

    await expect(
      callAIStream('prompt', 'context',
        { providerId: 'deepseek', model: 'deepseek-chat' }, 'sk-key', () => {})
    ).rejects.toThrow('API error (500): Internal Server Error');
  });

  it('throws when apiKey is missing for non-Ollama providers', async () => {
    await expect(
      callAIStream('prompt', 'context',
        { providerId: 'deepseek', model: 'deepseek-chat' }, '', () => {})
    ).rejects.toThrow('API key not configured');
  });

  it('allows streaming without apiKey for Ollama', async () => {
    const chunks = [
      createSSEChunk(JSON.stringify({ choices: [{ delta: { content: 'Local' } }] })),
    ];
    mockFetch.mockResolvedValueOnce(createStreamResponse(chunks));

    const result = await callAIStream('prompt', 'context',
      { providerId: 'ollama', model: 'llama3.1' }, '', () => {});

    expect(result).toBe('Local');
  });

  it('uses Qwen provider for streaming with correct baseUrl', async () => {
    const chunks = [
      createSSEChunk(JSON.stringify({ choices: [{ delta: { content: 'Qwen stream' } }] })),
    ];
    mockFetch.mockResolvedValueOnce(createStreamResponse(chunks));

    await callAIStream('prompt', 'context',
      { providerId: 'qwen', model: 'qwen-turbo' }, 'sk-qw-key', () => {});

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toBe('https://dashscope.aliyuncs.com/api/v1/chat/completions');
  });
});
