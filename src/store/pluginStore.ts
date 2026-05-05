import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Editor } from '@tiptap/react';
import { MarkherePlugin, PluginCommand, PluginExtension, PluginPanel } from '../plugins/PluginAPI';

interface PluginState {
  plugins: Map<string, MarkherePlugin>;
  enabledPlugins: string[];
  commands: Map<string, PluginCommand[]>;
  extensions: Map<string, PluginExtension[]>;
  panels: Map<string, PluginPanel[]>;
  currentEditor: Editor | null;
  
  loadPlugin: (plugin: MarkherePlugin) => Promise<void>;
  unloadPlugin: (pluginId: string) => Promise<void>;
  enablePlugin: (pluginId: string) => void;
  disablePlugin: (pluginId: string) => void;
  
  registerCommand: (pluginId: string, command: PluginCommand) => void;
  unregisterCommand: (pluginId: string, commandId: string) => void;
  
  registerExtension: (pluginId: string, extension: PluginExtension) => void;
  unregisterExtension: (pluginId: string, extensionName: string) => void;
  
  registerPanel: (pluginId: string, panel: PluginPanel) => void;
  unregisterPanel: (pluginId: string, panelId: string) => void;
  
  setEditor: (editor: Editor) => void;
  
  getCommands: () => PluginCommand[];
  getExtensions: () => PluginExtension[];
  getPanels: () => PluginPanel[];
}

export const usePluginStore = create<PluginState>()(
  persist(
    (set, get) => ({
      plugins: new Map(),
      enabledPlugins: [],
      commands: new Map(),
      extensions: new Map(),
      panels: new Map(),
      currentEditor: null,
      
      loadPlugin: async (plugin) => {
        const state = get();
        
        if (!plugin.enabled) {
          return;
        }
        
        const newPlugins = new Map(state.plugins);
        newPlugins.set(plugin.id, plugin);
        
        set({ plugins: newPlugins });
        
        if (plugin.onLoad) {
          const { createPluginAPI } = await import('../plugins/PluginAPI');
          const api = createPluginAPI(plugin);
          plugin.api = api;
          await plugin.onLoad(api);
        }
        
        if (state.currentEditor && plugin.onEditorReady) {
          await plugin.onEditorReady(state.currentEditor);
        }
      },
      
      unloadPlugin: async (pluginId) => {
        const state = get();
        const plugin = state.plugins.get(pluginId);
        
        if (plugin && plugin.onUnload) {
          await plugin.onUnload();
        }
        
        const newPlugins = new Map(state.plugins);
        newPlugins.delete(pluginId);
        
        const newCommands = new Map(state.commands);
        newCommands.delete(pluginId);
        
        const newExtensions = new Map(state.extensions);
        newExtensions.delete(pluginId);
        
        const newPanels = new Map(state.panels);
        newPanels.delete(pluginId);
        
        set({
          plugins: newPlugins,
          commands: newCommands,
          extensions: newExtensions,
          panels: newPanels,
        });
      },
      
      enablePlugin: (pluginId) => {
        const state = get();
        const plugin = state.plugins.get(pluginId);
        
        if (!plugin) return;
        
        plugin.enabled = true;
        
        if (plugin.onActivate) {
          plugin.onActivate();
        }
        
        set({ enabledPlugins: [...state.enabledPlugins, pluginId] });
      },
      
      disablePlugin: (pluginId) => {
        const state = get();
        const plugin = state.plugins.get(pluginId);
        
        if (!plugin) return;
        
        plugin.enabled = false;
        
        if (plugin.onDeactivate) {
          plugin.onDeactivate();
        }
        
        set({
          enabledPlugins: state.enabledPlugins.filter((id) => id !== pluginId),
        });
      },
      
      registerCommand: (pluginId, command) => {
        const state = get();
        const newCommands = new Map(state.commands);
        const pluginCommands = newCommands.get(pluginId) || [];
        newCommands.set(pluginId, [...pluginCommands, command]);
        set({ commands: newCommands });
      },
      
      unregisterCommand: (pluginId, commandId) => {
        const state = get();
        const newCommands = new Map(state.commands);
        const pluginCommands = newCommands.get(pluginId) || [];
        newCommands.set(
          pluginId,
          pluginCommands.filter((cmd) => cmd.id !== commandId)
        );
        set({ commands: newCommands });
      },
      
      registerExtension: (pluginId, extension) => {
        const state = get();
        const newExtensions = new Map(state.extensions);
        const pluginExtensions = newExtensions.get(pluginId) || [];
        newExtensions.set(pluginId, [...pluginExtensions, extension]);
        set({ extensions: newExtensions });
      },
      
      unregisterExtension: (pluginId, extensionName) => {
        const state = get();
        const newExtensions = new Map(state.extensions);
        const pluginExtensions = newExtensions.get(pluginId) || [];
        newExtensions.set(
          pluginId,
          pluginExtensions.filter((ext) => ext.name !== extensionName)
        );
        set({ extensions: newExtensions });
      },
      
      registerPanel: (pluginId, panel) => {
        const state = get();
        const newPanels = new Map(state.panels);
        const pluginPanels = newPanels.get(pluginId) || [];
        newPanels.set(pluginId, [...pluginPanels, panel]);
        set({ panels: newPanels });
      },
      
      unregisterPanel: (pluginId, panelId) => {
        const state = get();
        const newPanels = new Map(state.panels);
        const pluginPanels = newPanels.get(pluginId) || [];
        newPanels.set(
          pluginId,
          pluginPanels.filter((p) => p.id !== panelId)
        );
        set({ panels: newPanels });
      },
      
      setEditor: (editor) => {
        const state = get();
        set({ currentEditor: editor });
        
        state.plugins.forEach((plugin) => {
          if (plugin.enabled && plugin.onEditorReady) {
            plugin.onEditorReady(editor);
          }
        });
      },
      
      getCommands: () => {
        const state = get();
        const allCommands: PluginCommand[] = [];
        state.commands.forEach((commands) => {
          allCommands.push(...commands);
        });
        return allCommands;
      },
      
      getExtensions: () => {
        const state = get();
        const allExtensions: PluginExtension[] = [];
        state.extensions.forEach((extensions) => {
          allExtensions.push(...extensions);
        });
        return allExtensions;
      },
      
      getPanels: () => {
        const state = get();
        const allPanels: PluginPanel[] = [];
        state.panels.forEach((panels) => {
          allPanels.push(...panels);
        });
        return allPanels;
      },
    }),
    {
      name: 'plugin-storage',
      partialize: (state) => ({
        enabledPlugins: state.enabledPlugins,
      }),
    }
  )
);