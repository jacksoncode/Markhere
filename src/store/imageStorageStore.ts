import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  ImageStorageConfig,
  DEFAULT_IMAGE_STORAGE,
  ImageHostingProvider,
  uploadToProvider,
} from '../services/imageStorageConfig';

interface ImageStorageState {
  // Legacy config preserved for backward compatibility
  config: ImageStorageConfig;
  updateConfig: (updates: Partial<ImageStorageConfig>) => void;
  resetConfig: () => void;

  // New hosting provider management
  activeProvider: string | null;
  providers: ImageHostingProvider[];

  addProvider: (provider: ImageHostingProvider) => void;
  updateProvider: (id: string, updates: Partial<ImageHostingProvider>) => void;
  deleteProvider: (id: string) => void;
  setActiveProvider: (id: string | null) => void;

  /**
   * Upload an image file. If an active hosting provider is set,
   * uploads to that provider and returns the public URL.
   * Otherwise returns null, signaling the caller to fall back
   * to local save.
   */
  uploadImage: (file: File) => Promise<string | null>;
}

export const useImageStorageStore = create<ImageStorageState>()(
  persist(
    (set, get) => ({
      // Legacy
      config: DEFAULT_IMAGE_STORAGE,
      updateConfig: (updates) =>
        set((state) => ({
          config: { ...state.config, ...updates },
        })),
      resetConfig: () => set({ config: DEFAULT_IMAGE_STORAGE }),

      // Hosting provider state
      activeProvider: null,
      providers: [],

      addProvider: (provider) =>
        set((state) => ({
          providers: [...state.providers, provider],
        })),

      updateProvider: (id, updates) =>
        set((state) => ({
          providers: state.providers.map((p) =>
            p.id === id ? { ...p, ...updates } : p,
          ),
          // If we updated the active provider, replace its reference
          // (no special handling needed since equality is by ID)
        })),

      deleteProvider: (id) =>
        set((state) => ({
          providers: state.providers.filter((p) => p.id !== id),
          activeProvider: state.activeProvider === id ? null : state.activeProvider,
        })),

      setActiveProvider: (id) => set({ activeProvider: id }),

      uploadImage: async (file: File): Promise<string | null> => {
        const { activeProvider, providers } = get();
        if (!activeProvider) return null;

        const provider = providers.find((p) => p.id === activeProvider);
        if (!provider) return null;

        const url = await uploadToProvider(file, provider);
        return url;
      },
    }),
    {
      name: 'image-storage-config',
    },
  ),
);
