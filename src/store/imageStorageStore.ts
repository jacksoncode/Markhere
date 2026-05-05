import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ImageStorageConfig, DEFAULT_IMAGE_STORAGE } from '../services/imageStorageConfig';

interface ImageStorageState {
  config: ImageStorageConfig;
  updateConfig: (updates: Partial<ImageStorageConfig>) => void;
  resetConfig: () => void;
}

export const useImageStorageStore = create<ImageStorageState>()(
  persist(
    (set) => ({
      config: DEFAULT_IMAGE_STORAGE,
      
      updateConfig: (updates) => set((state) => ({
        config: { ...state.config, ...updates },
      })),
      
      resetConfig: () => set({ config: DEFAULT_IMAGE_STORAGE }),
    }),
    {
      name: 'image-storage-config',
    }
  )
);