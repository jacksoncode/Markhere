import { create } from 'zustand';

export interface CloudProvider {
  name: string;
  icon: string;
  connected: boolean;
}

interface CloudState {
  providers: CloudProvider[];
  syncEnabled: boolean;
  lastSync: string | null;
  connect: (provider: string) => Promise<void>;
  disconnect: (provider: string) => void;
  sync: () => Promise<void>;
}

const defaultProviders: CloudProvider[] = [
  { name: 'iCloud', icon: '🍎', connected: false },
  { name: 'Dropbox', icon: '📦', connected: false },
  { name: 'Google Drive', icon: '☁️', connected: false },
  { name: 'OneDrive', icon: '🔹', connected: false },
];

export const useCloudStore = create<CloudState>((set) => ({
  providers: defaultProviders,
  syncEnabled: false,
  lastSync: null,
  
  connect: async (provider: string) => {
    set((state: CloudState) => ({
      providers: state.providers.map((p: CloudProvider) =>
        p.name === provider ? { ...p, connected: true } : p
      ),
      syncEnabled: true,
    }));
  },
  
  disconnect: (provider: string) => {
    set((state: CloudState) => ({
      providers: state.providers.map((p: CloudProvider) =>
        p.name === provider ? { ...p, connected: false } : p
      ),
    }));
  },
  
  sync: async () => {
    set({ lastSync: new Date().toISOString() });
  },
}));