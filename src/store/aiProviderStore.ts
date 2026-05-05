import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AIProviderState {
  selectedProvider: string;
  selectedModel: string;
  apiKeys: Record<string, string>;
  
  setSelectedProvider: (provider: string) => void;
  setSelectedModel: (model: string) => void;
  setApiKey: (provider: string, key: string) => void;
  clearApiKey: (provider: string) => void;
}

export const useAIProviderStore = create<AIProviderState>()(
  persist(
    (set) => ({
      selectedProvider: 'deepseek',
      selectedModel: 'deepseek-chat',
      apiKeys: {},
      
      setSelectedProvider: (provider) => set({ selectedProvider: provider }),
      setSelectedModel: (model) => set({ selectedModel: model }),
      setApiKey: (provider, key) => set((state) => ({
        apiKeys: { ...state.apiKeys, [provider]: key },
      })),
      clearApiKey: (provider) => set((state) => ({
        apiKeys: { ...state.apiKeys, [provider]: '' },
      })),
    }),
    {
      name: 'ai-provider-storage',
      partialize: (state) => ({
        selectedProvider: state.selectedProvider,
        selectedModel: state.selectedModel,
        apiKeys: state.apiKeys,
      }),
    }
  )
);