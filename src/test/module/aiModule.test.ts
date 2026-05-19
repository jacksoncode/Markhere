import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAIStore, callAI, callAIStream } from '../../store/aiStore';
import { AI_PROVIDERS } from '../../services/aiProviders';

// ---- Helpers ----

function createSSEStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}

function parseRequestJSON(mockFetch: ReturnType<typeof vi.fn>): Record<string, unknown> {
  const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
  const body = callArgs[1].body;
  if (typeof body === 'string') {
    return JSON.parse(body) as Record<string, unknown>;
  }
  throw new Error('Request body is not a string');
}

// ---- Tests ----

// Module-level variable for the fetch mock, reassigned in beforeEach
let mockFetch: ReturnType<typeof vi.fn>;

describe('AI Module', () => {
  beforeEach(() => {
    localStorage.clear();
    useAIStore.setState({
      config: { providerId: 'deepseek', model: 'deepseek-chat' },
      apiKeys: {},
      isEnabled: false,
      history: [],
    });
    vi.clearAllMocks();
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  describe('useAIStore', () => {
    it('setConfig updates provider config', () => {
      const { setConfig } = useAIStore.getState();

      setConfig({ providerId: 'qwen', model: 'qwen-turbo' });

      const state = useAIStore.getState();
      expect(state.config.providerId).toBe('qwen');
      expect(state.config.model).toBe('qwen-turbo');
    });

    it('setConfig does a partial update', () => {
      const { setConfig } = useAIStore.getState();

      setConfig({ providerId: 'zhipu' });

      const state = useAIStore.getState();
      expect(state.config.providerId).toBe('zhipu');
      // model should remain unchanged from the last setConfig call
      expect(state.config.model).toBe('deepseek-chat');
    });

    it('setApiKey stores key and getCurrentApiKey returns it', () => {
      const { setApiKey, getCurrentApiKey } = useAIStore.getState();

      setApiKey('deepseek', 'sk-test-key-123');

      const key = getCurrentApiKey();
      expect(key).toBe('sk-test-key-123');
    });

    it('getCurrentApiKey returns empty string for unconfigured provider', () => {
      // Change provider to one that has no key set
      useAIStore.getState().setConfig({ providerId: 'qwen' });

      const key = useAIStore.getState().getCurrentApiKey();
      expect(key).toBe('');
    });

    it('clearApiKey removes a stored key', () => {
      const { setApiKey, clearApiKey } = useAIStore.getState();

      setApiKey('deepseek', 'sk-secret');
      clearApiKey('deepseek');

      const key = useAIStore.getState().apiKeys['deepseek'];
      expect(key).toBe('');
    });

    it('toggleEnabled toggles isEnabled flag', () => {
      const { toggleEnabled } = useAIStore.getState();

      expect(useAIStore.getState().isEnabled).toBe(false);

      toggleEnabled();
      expect(useAIStore.getState().isEnabled).toBe(true);

      toggleEnabled();
      expect(useAIStore.getState().isEnabled).toBe(false);
    });

    it('addHistory adds messages and clearHistory clears them', () => {
      const { addHistory, clearHistory } = useAIStore.getState();

      addHistory('user', 'What is markdown?');
      addHistory('assistant', 'Markdown is a lightweight markup language.');

      expect(useAIStore.getState().history).toHaveLength(2);
      expect(useAIStore.getState().history[0].role).toBe('user');
      expect(useAIStore.getState().history[1].role).toBe('assistant');

      clearHistory();
      expect(useAIStore.getState().history).toHaveLength(0);
    });

    it('addHistory keeps at most 21 entries (rolling window of slice(-20) + 1 appended)', () => {
      const { addHistory } = useAIStore.getState();

      for (let i = 0; i < 25; i++) {
        addHistory('user', `Message ${i + 1}`);
      }

      // The code does: [...state.history.slice(-20), { role, content }]
      // So max entries = 20 (from slice) + 1 (new) = 21
      const history = useAIStore.getState().history;
      expect(history.length).toBeLessThanOrEqual(21);
      // The earliest entries (Message 1-4) should be dropped
      expect(history.find((m) => m.content === 'Message 1')).toBeUndefined();
      // The most recent entry should be present
      expect(history.find((m) => m.content === 'Message 25')).toBeDefined();
    });
  });

  describe('callAI', () => {
    it('sends request to the correct URL based on provider baseUrl', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: 'Generated response' } }],
          }),
      });

      const config = { providerId: 'deepseek', model: 'deepseek-chat' };
      await callAI('Hello AI', 'My document context', config, 'sk-key');

      const url = mockFetch.mock.calls[0][0] as string;
      // DeepSeek's baseUrl is 'https://api.deepseek.com/v1'
      expect(url).toBe('https://api.deepseek.com/v1/chat/completions');
    });

    it('request body contains model, messages with system+user roles, max_tokens, and stream:false', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: 'Response' } }],
          }),
      });

      const config = { providerId: 'deepseek', model: 'deepseek-chat' };
      await callAI('Summarize this', 'Document content goes here', config, 'sk-key');

      const body = parseRequestJSON(mockFetch);

      expect(body.model).toBe('deepseek-chat');
      expect(body.max_tokens).toBe(1024);
      expect(body.stream).toBe(false);

      const messages = body.messages as Array<Record<string, unknown>>;
      expect(messages).toBeInstanceOf(Array);
      expect(messages).toHaveLength(2);

      expect(messages[0].role).toBe('system');
      expect(messages[0].content).toContain('Document content goes here');
      expect(messages[1].role).toBe('user');
      expect(messages[1].content).toBe('Summarize this');
    });

    it('request headers include Authorization Bearer and Content-Type', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: 'OK' } }],
          }),
      });

      const config = { providerId: 'deepseek', model: 'deepseek-chat' };
      await callAI('Test', 'Context', config, 'sk-my-token');

      const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
      const headers = callArgs[1].headers as Record<string, string>;
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['Authorization']).toBe('Bearer sk-my-token');
    });

    it('parses JSON response and extracts content from choices[0].message.content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: 'The AI response text' } }],
          }),
      });

      const config = { providerId: 'deepseek', model: 'deepseek-chat' };
      const result = await callAI('Prompt', 'Context', config, 'sk-key');

      expect(result).toBe('The AI response text');
    });

    it('returns empty string when response has no choices', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ choices: [] }),
      });

      const config = { providerId: 'deepseek', model: 'deepseek-chat' };
      const result = await callAI('Prompt', 'Context', config, 'sk-key');

      expect(result).toBe('');
    });

    it('throws with status text when response is not OK', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      });

      const config = { providerId: 'deepseek', model: 'deepseek-chat' };

      await expect(
        callAI('Prompt', 'Context', config, 'sk-bad-key'),
      ).rejects.toThrow(/API error.*401.*Unauthorized/);
    });

    it('throws when API key is missing for non-ollama providers', async () => {
      const config = { providerId: 'deepseek', model: 'deepseek-chat' };

      await expect(
        callAI('Prompt', 'Context', config, ''),
      ).rejects.toThrow('API key not configured');
    });
  });

  describe('callAIStream', () => {
    it('streams SSE chunks and calls onChunk for each delta', async () => {
      const sseStream = createSSEStream([
        'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" World"}}]}\n\n',
        'data: [DONE]\n\n',
      ]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: sseStream,
      });

      const config = { providerId: 'deepseek', model: 'deepseek-chat' };
      const chunks: string[] = [];

      const result = await callAIStream(
        'Prompt',
        'Context',
        config,
        'sk-key',
        (chunk) => {
          chunks.push(chunk);
        },
      );

      expect(chunks).toEqual(['Hello', ' World']);
      expect(result).toBe('Hello World');
    });

    it('handles [DONE] signal and completes the stream', async () => {
      const sseStream = createSSEStream([
        'data: {"choices":[{"delta":{"content":"Partial"}}]}\n\n',
        'data: [DONE]\n\n',
      ]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: sseStream,
      });

      const config = { providerId: 'deepseek', model: 'deepseek-chat' };
      const chunks: string[] = [];

      const result = await callAIStream(
        'Prompt',
        'Context',
        config,
        'sk-key',
        (chunk) => chunks.push(chunk),
      );

      expect(chunks).toEqual(['Partial']);
      expect(result).toBe('Partial');
    });

    it('handles empty delta gracefully (skips chunks with no content)', async () => {
      const sseStream = createSSEStream([
        'data: {"choices":[{"delta":{}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"Valid"}}]}\n\n',
        'data: [DONE]\n\n',
      ]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: sseStream,
      });

      const config = { providerId: 'deepseek', model: 'deepseek-chat' };
      const chunks: string[] = [];

      const result = await callAIStream(
        'Prompt',
        'Context',
        config,
        'sk-key',
        (chunk) => chunks.push(chunk),
      );

      expect(chunks).toEqual(['Valid']);
      expect(result).toBe('Valid');
    });

    it('ignores malformed JSON lines in SSE stream', async () => {
      const sseStream = createSSEStream([
        'data: not-valid-json\n\n',
        'data: {"choices":[{"delta":{"content":"Good"}}]}\n\n',
        'data: corrupted{data\n\n',
        'data: [DONE]\n\n',
      ]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: sseStream,
      });

      const config = { providerId: 'deepseek', model: 'deepseek-chat' };
      const chunks: string[] = [];

      const result = await callAIStream(
        'Prompt',
        'Context',
        config,
        'sk-key',
        (chunk) => chunks.push(chunk),
      );

      expect(chunks).toEqual(['Good']);
      expect(result).toBe('Good');
    });

    it('throws when stream response is not OK', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      });

      const config = { providerId: 'deepseek', model: 'deepseek-chat' };

      await expect(
        callAIStream('Prompt', 'Context', config, 'sk-key', () => {}),
      ).rejects.toThrow(/API error.*500.*Internal Server Error/);
    });

    it('requires API key for non-ollama providers', async () => {
      const config = { providerId: 'deepseek', model: 'deepseek-chat' };

      await expect(
        callAIStream('Prompt', 'Context', config, '', () => {}),
      ).rejects.toThrow('API key not configured');
    });
  });

  describe('Multiple provider support', () => {
    it('DeepSeek uses the correct baseUrl', () => {
      const provider = AI_PROVIDERS.find((p) => p.id === 'deepseek')!;
      expect(provider.baseUrl).toBe('https://api.deepseek.com/v1');
    });

    it('Qwen uses a different baseUrl than DeepSeek', () => {
      const deepseek = AI_PROVIDERS.find((p) => p.id === 'deepseek')!;
      const qwen = AI_PROVIDERS.find((p) => p.id === 'qwen')!;

      expect(deepseek.baseUrl).not.toBe(qwen.baseUrl);
      expect(qwen.baseUrl).toBe('https://dashscope.aliyuncs.com/api/v1');
    });

    it('different providers resolve to different fetch URLs', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              choices: [{ message: { content: 'DeepSeek response' } }],
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              choices: [{ message: { content: 'Qwen response' } }],
            }),
        });

      await callAI(
        'Hello',
        'Context',
        { providerId: 'deepseek', model: 'deepseek-chat' },
        'sk-key',
      );

      await callAI(
        'Hello',
        'Context',
        { providerId: 'qwen', model: 'qwen-turbo' },
        'sk-key2',
      );

      const url1 = mockFetch.mock.calls[0][0] as string;
      const url2 = mockFetch.mock.calls[1][0] as string;

      expect(url1).toContain('api.deepseek.com');
      expect(url2).toContain('dashscope.aliyuncs.com');
    });

    it('Ollama provider allows empty API key (local)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: 'Local response' } }],
          }),
      });

      // Should NOT throw for ollama with empty API key
      const result = await callAI(
        'Prompt',
        'Context',
        { providerId: 'ollama', model: 'llama3.1' },
        '',
      );

      expect(result).toBe('Local response');
    });
  });
});
