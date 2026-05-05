import { invoke } from '@tauri-apps/api/core';
import { MarkherePlugin, PluginMetadata } from './PluginAPI';
import { usePluginStore } from '../store/pluginStore';

export async function loadPluginFromDirectory(pluginPath: string): Promise<MarkherePlugin | null> {
  try {
    const manifestPath = `${pluginPath}/manifest.json`;
    const manifestContent = await invoke<string>('read_text_file', { path: manifestPath });
    const manifest: PluginMetadata = JSON.parse(manifestContent);
    
    const mainPath = `${pluginPath}/main.js`;
    const mainContent = await invoke<string>('read_text_file', { path: mainPath });
    
    const pluginFunction = new Function('return ' + mainContent)();
    const pluginModule = pluginFunction();
    
    const plugin: MarkherePlugin = {
      ...manifest,
      ...pluginModule,
    };
    
    return plugin;
  } catch (error) {
    console.error('Failed to load plugin from directory:', error);
    return null;
  }
}

export async function discoverPlugins(): Promise<string[]> {
  try {
    const pluginPaths = await invoke<string[]>('list_plugins');
    return pluginPaths;
  } catch (error) {
    console.error('Failed to discover plugins:', error);
    return [];
  }
}

export async function loadAllPlugins(): Promise<void> {
  const pluginPaths = await discoverPlugins();
  
  for (const pluginPath of pluginPaths) {
    const plugin = await loadPluginFromDirectory(pluginPath);
    
    if (plugin) {
      await usePluginStore.getState().loadPlugin(plugin);
    }
  }
}

export function createPluginManifestTemplate(): PluginMetadata {
  return {
    id: 'com.example.plugin',
    name: 'Example Plugin',
    version: '1.0.0',
    author: 'Your Name',
    description: 'A sample plugin for Markhere',
    homepage: 'https://github.com/example/plugin',
    repository: 'https://github.com/example/plugin',
    license: 'MIT',
    minAppVersion: '0.4.0',
    enabled: false,
  };
}

export function createPluginMainTemplate(): string {
  return `
// Markhere Plugin Template
// This file exports your plugin lifecycle hooks and features

module.exports = {
  onLoad: async (api) => {
    console.log('Plugin loaded:', api.metadata.name);
    
    // Register a command
    api.registerCommand({
      id: 'example.hello',
      label: 'Hello World',
      category: 'plugin',
      handler: () => {
        api.showNotification('Hello from plugin!', 'info');
      },
    });
    
    // Register an extension
    api.registerExtension({
      name: 'exampleExtension',
      extension: ExampleExtension,
    });
    
    // Register a panel
    api.registerPanel({
      id: 'examplePanel',
      title: 'Example Panel',
      position: 'right',
      render: () => {
        return '<div>Example Plugin Panel</div>';
      },
    });
  },
  
  onUnload: async () => {
    console.log('Plugin unloaded');
  },
  
  onEditorReady: async (editor) => {
    console.log('Editor ready:', editor);
  },
};
`;
}