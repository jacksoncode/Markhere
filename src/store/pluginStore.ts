import { create } from 'zustand';

export interface Plugin {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  path: string;
}

interface PluginState {
  plugins: Plugin[];
  loadPlugin: (path: string) => Promise<void>;
  enablePlugin: (id: string) => void;
  disablePlugin: (id: string) => void;
  unloadPlugin: (id: string) => void;
}

export const usePluginStore = create<PluginState>((set) => ({
  plugins: JSON.parse(localStorage.getItem('markhere-plugins') || '[]'),
  
  loadPlugin: async (path: string) => {
    const plugin: Plugin = {
      id: Date.now().toString(),
      name: path.split('/').pop() || 'Unknown',
      version: '1.0.0',
      enabled: false,
      path,
    };
    
    set((state: PluginState) => {
      const plugins = [...state.plugins, plugin];
      localStorage.setItem('markhere-plugins', JSON.stringify(plugins));
      return { plugins };
    });
  },
  
  enablePlugin: (id: string) => {
    set((state: PluginState) => ({
      plugins: state.plugins.map((p: Plugin) =>
        p.id === id ? { ...p, enabled: true } : p
      ),
    }));
  },
  
  disablePlugin: (id: string) => {
    set((state: PluginState) => ({
      plugins: state.plugins.map((p: Plugin) =>
        p.id === id ? { ...p, enabled: false } : p
      ),
    }));
  },
  
  unloadPlugin: (id: string) => {
    set((state: PluginState) => {
      const plugins = state.plugins.filter((p: Plugin) => p.id !== id);
      localStorage.setItem('markhere-plugins', JSON.stringify(plugins));
      return { plugins };
    });
  },
}));