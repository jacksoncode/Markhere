import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AIConfig {
  provider: 'openai' | 'anthropic' | 'local';
  apiKey: string;
  model: string;
  baseUrl?: string;
}

interface AIState {
  config: AIConfig;
  isEnabled: boolean;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  
  setConfig: (config: Partial<AIConfig>) => void;
  toggleEnabled: () => void;
  addHistory: (role: 'user' | 'assistant', content: string) => void;
  clearHistory: () => void;
}

const defaultConfig: AIConfig = {
  provider: 'openai',
  apiKey: '',
  model: 'gpt-4o-mini',
  baseUrl: '',
};

export const useAIStore = create<AIState>()(
  persist(
    (set) => ({
      config: defaultConfig,
      isEnabled: false,
      history: [],

      setConfig: (newConfig) =>
        set((state) => ({
          config: { ...state.config, ...newConfig },
        })),

      toggleEnabled: () =>
        set((state) => ({ isEnabled: !state.isEnabled })),

      addHistory: (role, content) =>
        set((state) => ({
          history: [...state.history.slice(-20), { role, content }],
        })),

      clearHistory: () => set({ history: [] }),
    }),
    {
      name: 'markhere-ai-config',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export async function callAI(prompt: string, context: string, config: AIConfig): Promise<string> {
  if (!config.apiKey) {
    throw new Error('API key not configured');
  }

  const systemPrompt = `You are a writing assistant helping with a Markdown document. 
The user's current document context is:
${context}

Help the user improve their writing, fix grammar, suggest improvements, or answer questions about the content.`;

  if (config.provider === 'anthropic') {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.model || 'claude-3-haiku-20240307',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    return data.content[0]?.text || '';
  }

  const baseUrl = config.baseUrl || 'https://api.openai.com/v1';
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model || 'gpt-4o-mini',
      max_tokens: 1024,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
    }),
  });

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}