import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AI_PROVIDERS, type AIModel } from '../services/aiProviders';

export interface AIConfig {
  providerId: string;
  model: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AIState {
  config: AIConfig;
  apiKeys: Record<string, string>;
  isEnabled: boolean;
  history: ChatMessage[];

  setConfig: (config: Partial<AIConfig>) => void;
  setApiKey: (provider: string, key: string) => void;
  clearApiKey: (provider: string) => void;
  toggleEnabled: () => void;
  addHistory: (role: ChatMessage['role'], content: string) => void;
  clearHistory: () => void;
  getCurrentApiKey: () => string;
}

const defaultConfig: AIConfig = {
  providerId: 'deepseek',
  model: 'deepseek-chat',
};

export const useAIStore = create<AIState>()(
  persist(
    (set, get) => ({
      config: defaultConfig,
      apiKeys: {},
      isEnabled: false,
      history: [],

      setConfig: (newConfig) =>
        set((state) => ({
          config: { ...state.config, ...newConfig },
        })),

      setApiKey: (provider, key) =>
        set((state) => ({
          apiKeys: { ...state.apiKeys, [provider]: key },
        })),

      clearApiKey: (provider) =>
        set((state) => ({
          apiKeys: { ...state.apiKeys, [provider]: '' },
        })),

      toggleEnabled: () =>
        set((state) => ({ isEnabled: !state.isEnabled })),

      addHistory: (role, content) =>
        set((state) => ({
          history: [...state.history.slice(-20), { role, content }],
        })),

      clearHistory: () => set({ history: [] }),

      getCurrentApiKey: () => {
        const state = get();
        return state.apiKeys[state.config.providerId] || '';
      },
    }),
    {
      name: 'markhere-ai-config',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

function buildSystemPrompt(context: string): string {
  return `You are a writing assistant helping with a Markdown document.
The user's current document context is:
${context}

Help the user improve their writing, fix grammar, suggest improvements, or answer questions about the content.`;
}

function buildHeaders(apiKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  return headers;
}

function resolveProvider(providerId: string) {
  const provider = AI_PROVIDERS.find((p) => p.id === providerId);
  if (!provider) {
    throw new Error(`Unknown provider: ${providerId}`);
  }
  return provider;
}

function buildRequestBody(model: string, systemPrompt: string, prompt: string, stream: boolean) {
  return {
    model,
    max_tokens: 1024,
    stream,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
  };
}

export async function callAI(
  prompt: string,
  context: string,
  config: AIConfig,
  apiKey: string
): Promise<string> {
  const provider = resolveProvider(config.providerId);

  if (!apiKey && config.providerId !== 'ollama') {
    throw new Error('API key not configured');
  }

  const response = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: buildHeaders(apiKey),
    body: JSON.stringify(buildRequestBody(config.model, buildSystemPrompt(context), prompt, false)),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

export async function callAIStream(
  prompt: string,
  context: string,
  config: AIConfig,
  apiKey: string,
  onChunk: (chunk: string) => void
): Promise<string> {
  const provider = resolveProvider(config.providerId);

  if (!apiKey && config.providerId !== 'ollama') {
    throw new Error('API key not configured');
  }

  const response = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: buildHeaders(apiKey),
    body: JSON.stringify(buildRequestBody(config.model, buildSystemPrompt(context), prompt, true)),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error (${response.status}): ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let fullContent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n').filter((line) => line.startsWith('data: '));

    for (const line of lines) {
      const data = line.slice(6);
      if (data === '[DONE]') continue;
      try {
        const json = JSON.parse(data);
        const content: string | undefined = json.choices?.[0]?.delta?.content;
        if (content) {
          fullContent += content;
          onChunk(content);
        }
      } catch {
        // Skip malformed JSON chunks
      }
    }
  }

  return fullContent;
}

// Re-export provider list and types for convenience
export { AI_PROVIDERS };
export type { AIModel };
