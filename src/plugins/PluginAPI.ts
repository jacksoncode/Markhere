import { Editor } from '@tiptap/react';
import { useSettingsStore } from '../store/settingsStore';

export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  homepage?: string;
  repository?: string;
  license: string;
  minAppVersion: string;
  enabled: boolean;
}

export interface PluginLifecycle {
  onLoad?: (api: PluginAPI) => void | Promise<void>;
  onUnload?: () => void | Promise<void>;
  onActivate?: () => void | Promise<void>;
  onDeactivate?: () => void | Promise<void>;
  onEditorReady?: (editor: Editor) => void | Promise<void>;
}

export type PluginCommand = {
  id: string;
  label: string;
  category: 'file' | 'edit' | 'format' | 'insert' | 'view' | 'tools' | 'collaboration' | 'help' | 'plugin';
  handler: () => void;
  icon?: string;
  shortcut?: string;
};

export type PluginExtension = {
  name: string;
  extension: any;
};

export type PluginPanel = {
  id: string;
  title: string;
  position: 'left' | 'right' | 'bottom';
  render: () => React.ReactNode;
};

export interface PluginAPI {
  metadata: PluginMetadata;
  
  registerCommand(command: PluginCommand): void;
  unregisterCommand(commandId: string): void;
  
  registerExtension(extension: PluginExtension): void;
  unregisterExtension(extensionName: string): void;
  
  registerPanel(panel: PluginPanel): void;
  unregisterPanel(panelId: string): void;
  
  getEditor(): Editor | null;
  setEditor(editor: Editor): void;
  
  getSettings(): ReturnType<typeof useSettingsStore.getState>;
  updateSettings(updates: Partial<ReturnType<typeof useSettingsStore.getState>>): void;
  
  getActiveFile(): { path: string; content: string } | null;
  saveFile(path: string, content: string): Promise<void>;
  
  showNotification(message: string, type: 'info' | 'success' | 'warning' | 'error'): void;
  
  getLocalStorage<T>(key: string): T | null;
  setLocalStorage<T>(key: string, value: T): void;
  
  invokeTauriCommand(command: string, args?: Record<string, unknown>): Promise<any>;
  
  getPluginStorage(): Record<string, any>;
  setPluginStorage(key: string, value: any): void;
}

export interface MarkherePlugin extends PluginMetadata, PluginLifecycle {
  api?: PluginAPI;
}

export function createPluginAPI(metadata: PluginMetadata): PluginAPI {
  const pluginStorage: Record<string, any> = {};
  
  return {
    metadata,
    
    registerCommand: (command) => {
      const { registerCommand } = usePluginStore.getState();
      registerCommand(metadata.id, command);
    },
    
    unregisterCommand: (commandId) => {
      const { unregisterCommand } = usePluginStore.getState();
      unregisterCommand(metadata.id, commandId);
    },
    
    registerExtension: (extension) => {
      const { registerExtension } = usePluginStore.getState();
      registerExtension(metadata.id, extension);
    },
    
    unregisterExtension: (extensionName) => {
      const { unregisterExtension } = usePluginStore.getState();
      unregisterExtension(metadata.id, extensionName);
    },
    
    registerPanel: (panel) => {
      const { registerPanel } = usePluginStore.getState();
      registerPanel(metadata.id, panel);
    },
    
    unregisterPanel: (panelId) => {
      const { unregisterPanel } = usePluginStore.getState();
      unregisterPanel(metadata.id, panelId);
    },
    
    getEditor: () => {
      return usePluginStore.getState().currentEditor;
    },
    
    setEditor: (editor) => {
      usePluginStore.getState().setEditor(editor);
    },
    
    getSettings: () => {
      return useSettingsStore.getState();
    },
    
    updateSettings: (updates) => {
      useSettingsStore.setState(updates);
    },
    
    getActiveFile: () => {
      const { tabs, activeTabId } = useTabsStore.getState();
      if (!activeTabId) return null;
      const tab = tabs.find((t: TabInfo) => t.id === activeTabId);
      if (!tab) return null;
      return { path: tab.path, content: tab.content };
    },
    
    saveFile: async (path, content) => {
      await invoke('save_file', { path, content });
    },
    
    showNotification: (message, type) => {
      console.log(`[${type}] ${message}`);
    },
    
    getLocalStorage: (key) => {
      const value = localStorage.getItem(`plugin:${metadata.id}:${key}`);
      return value ? JSON.parse(value) : null;
    },
    
    setLocalStorage: (key, value) => {
      localStorage.setItem(`plugin:${metadata.id}:${key}`, JSON.stringify(value));
    },
    
    invokeTauriCommand: async (command, args) => {
      return await invoke(command, args);
    },
    
    getPluginStorage: () => {
      return pluginStorage;
    },
    
    setPluginStorage: (key, value) => {
      pluginStorage[key] = value;
    },
  };
}

import { invoke } from '@tauri-apps/api/core';
import React from 'react';
import { useTabsStore, TabInfo } from '../store/tabsStore';
import { usePluginStore } from '../store/pluginStore';