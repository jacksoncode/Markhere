/**
 * @deprecated Use `useAIStore` from `@/store/aiStore` instead.
 *
 * This store has been superseded by the unified `aiStore` (P1-3 architecture).
 * It is kept for backward compatibility only — all new code should import from `aiStore`.
 *
 * Migration guide:
 *   `selectedProvider`       -> `config.providerId`
 *   `selectedModel`          -> `config.model`
 *   `setSelectedProvider(p)` -> `setConfig({ providerId: p })`
 *   `setSelectedModel(m)`    -> `setConfig({ model: m })`
 *   `setApiKey` / `clearApiKey` / `apiKeys` — unchanged, same signatures in both stores.
 */

import { useAIStore } from './aiStore';

// Re-export types for any code still importing them from this file.
export type { AIConfig, AIModel } from './aiStore';
export { AI_PROVIDERS } from './aiStore';

/**
 * @deprecated Use `useAIStore` instead. See migration guide above.
 */
export function useAIProviderStore() {
  const state = useAIStore();

  return {
    selectedProvider: state.config.providerId,
    selectedModel: state.config.model,
    apiKeys: state.apiKeys,

    setSelectedProvider: (provider: string) =>
      state.setConfig({ providerId: provider }),

    setSelectedModel: (model: string) =>
      state.setConfig({ model }),

    setApiKey: state.setApiKey,

    clearApiKey: state.clearApiKey,
  };
}
