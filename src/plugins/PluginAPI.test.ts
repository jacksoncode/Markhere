import { describe, it, expect, beforeEach, vi } from 'vitest';

// Use vi.hoisted so variables are available inside the hoisted vi.mock factories
const {
  mockRegisterCommand,
  mockUnregisterCommand,
  mockRegisterExtension,
  mockUnregisterExtension,
  mockRegisterPanel,
  mockUnregisterPanel,
  mockSetEditor,
  mockSettingsSetState,
  mockTabsState,
} = vi.hoisted(() => ({
  mockRegisterCommand: vi.fn(),
  mockUnregisterCommand: vi.fn(),
  mockRegisterExtension: vi.fn(),
  mockUnregisterExtension: vi.fn(),
  mockRegisterPanel: vi.fn(),
  mockUnregisterPanel: vi.fn(),
  mockSetEditor: vi.fn(),
  mockSettingsSetState: vi.fn(),
  mockTabsState: {
    tabs: [] as { id: string; path: string; content: string }[],
    activeTabId: null as string | null,
  },
}));

vi.mock('../store/pluginStore', () => ({
  usePluginStore: {
    getState: () => ({
      registerCommand: mockRegisterCommand,
      unregisterCommand: mockUnregisterCommand,
      registerExtension: mockRegisterExtension,
      unregisterExtension: mockUnregisterExtension,
      registerPanel: mockRegisterPanel,
      unregisterPanel: mockUnregisterPanel,
      setEditor: mockSetEditor,
      currentEditor: null,
    }),
  },
}));

vi.mock('../store/settingsStore', () => ({
  useSettingsStore: {
    getState: () => ({
      theme: 'light',
      fontSize: 14,
      autoSave: true,
    }),
    setState: mockSettingsSetState,
  },
}));

vi.mock('../store/tabsStore', () => ({
  useTabsStore: {
    getState: () => mockTabsState,
  },
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import { createPluginAPI } from './PluginAPI';
import type { PluginMetadata } from './PluginAPI';

const mockMetadata: PluginMetadata = {
  id: 'com.test.plugin',
  name: 'Test Plugin',
  version: '1.0.0',
  author: 'Test Author',
  description: 'A test plugin',
  license: 'MIT',
  minAppVersion: '0.4.0',
  enabled: true,
};

describe('createPluginAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTabsState.tabs = [];
    mockTabsState.activeTabId = null;
  });

  it('returns an object with the expected API shape', () => {
    const api = createPluginAPI(mockMetadata);

    expect(api).toBeDefined();
    expect(typeof api).toBe('object');
    expect(api.metadata).toEqual(mockMetadata);
    expect(typeof api.registerCommand).toBe('function');
    expect(typeof api.unregisterCommand).toBe('function');
    expect(typeof api.registerExtension).toBe('function');
    expect(typeof api.unregisterExtension).toBe('function');
    expect(typeof api.registerPanel).toBe('function');
    expect(typeof api.unregisterPanel).toBe('function');
    expect(typeof api.getEditor).toBe('function');
    expect(typeof api.setEditor).toBe('function');
    expect(typeof api.getSettings).toBe('function');
    expect(typeof api.updateSettings).toBe('function');
    expect(typeof api.getActiveFile).toBe('function');
    expect(typeof api.saveFile).toBe('function');
    expect(typeof api.showNotification).toBe('function');
    expect(typeof api.getLocalStorage).toBe('function');
    expect(typeof api.setLocalStorage).toBe('function');
    expect(typeof api.invokeTauriCommand).toBe('function');
    expect(typeof api.getPluginStorage).toBe('function');
    expect(typeof api.setPluginStorage).toBe('function');
  });

  describe('command registration', () => {
    it('registerCommand calls pluginStore.registerCommand', () => {
      const api = createPluginAPI(mockMetadata);
      const command = {
        id: 'test.command',
        label: 'Test Command',
        category: 'plugin' as const,
        handler: vi.fn(),
      };

      api.registerCommand(command);

      expect(mockRegisterCommand).toHaveBeenCalledWith(mockMetadata.id, command);
    });

    it('unregisterCommand calls pluginStore.unregisterCommand', () => {
      const api = createPluginAPI(mockMetadata);
      api.unregisterCommand('test.command');
      expect(mockUnregisterCommand).toHaveBeenCalledWith(mockMetadata.id, 'test.command');
    });
  });

  describe('extension registration', () => {
    it('registerExtension calls pluginStore.registerExtension', () => {
      const api = createPluginAPI(mockMetadata);
      const extension = { name: 'testExt', extension: {} };

      api.registerExtension(extension);

      expect(mockRegisterExtension).toHaveBeenCalledWith(mockMetadata.id, extension);
    });

    it('unregisterExtension calls pluginStore.unregisterExtension', () => {
      const api = createPluginAPI(mockMetadata);
      api.unregisterExtension('testExt');
      expect(mockUnregisterExtension).toHaveBeenCalledWith(mockMetadata.id, 'testExt');
    });
  });

  describe('panel registration', () => {
    it('registerPanel calls pluginStore.registerPanel', () => {
      const api = createPluginAPI(mockMetadata);
      const panel = {
        id: 'testPanel',
        title: 'Test Panel',
        position: 'right' as const,
        render: vi.fn(),
      };

      api.registerPanel(panel);

      expect(mockRegisterPanel).toHaveBeenCalledWith(mockMetadata.id, panel);
    });

    it('unregisterPanel calls pluginStore.unregisterPanel', () => {
      const api = createPluginAPI(mockMetadata);
      api.unregisterPanel('testPanel');
      expect(mockUnregisterPanel).toHaveBeenCalledWith(mockMetadata.id, 'testPanel');
    });
  });

  describe('editor management', () => {
    it('getEditor returns the current editor from pluginStore', () => {
      const api = createPluginAPI(mockMetadata);
      const editor = api.getEditor();
      expect(editor).toBeNull();
    });

    it('setEditor calls pluginStore.setEditor', () => {
      const api = createPluginAPI(mockMetadata);
      const mockEditor = {} as any;
      api.setEditor(mockEditor);
      expect(mockSetEditor).toHaveBeenCalledWith(mockEditor);
    });
  });

  describe('settings', () => {
    it('getSettings returns the settings store state', () => {
      const api = createPluginAPI(mockMetadata);
      const settings = api.getSettings();
      expect(settings).toBeDefined();
      expect(settings.theme).toBe('light');
      expect(settings.fontSize).toBe(14);
      expect(settings.autoSave).toBe(true);
    });

    it('updateSettings calls settingsStore.setState', () => {
      const api = createPluginAPI(mockMetadata);
      const updates = { theme: 'dark' as const, fontSize: 16 };

      api.updateSettings(updates);

      expect(mockSettingsSetState).toHaveBeenCalledWith(updates);
    });
  });

  describe('getActiveFile', () => {
    it('returns null when no active tab', () => {
      mockTabsState.tabs = [];
      mockTabsState.activeTabId = null;

      const api = createPluginAPI(mockMetadata);
      expect(api.getActiveFile()).toBeNull();
    });

    it('returns the active tab path and content', () => {
      mockTabsState.tabs = [
        { id: 'tab1', path: '/docs/test.md', content: '# Hello' },
      ];
      mockTabsState.activeTabId = 'tab1';

      const api = createPluginAPI(mockMetadata);
      const file = api.getActiveFile();

      expect(file).not.toBeNull();
      expect(file!.path).toBe('/docs/test.md');
      expect(file!.content).toBe('# Hello');
    });

    it('returns null when active tab id does not match any tab', () => {
      mockTabsState.tabs = [
        { id: 'tab1', path: '/docs/test.md', content: '# Hello' },
      ];
      mockTabsState.activeTabId = 'non-matching-id';

      const api = createPluginAPI(mockMetadata);
      expect(api.getActiveFile()).toBeNull();
    });
  });

  describe('plugin storage', () => {
    it('getPluginStorage returns an initially empty object', () => {
      const api = createPluginAPI(mockMetadata);
      expect(api.getPluginStorage()).toEqual({});
    });

    it('setPluginStorage and getPluginStorage store and retrieve values', () => {
      const api = createPluginAPI(mockMetadata);
      api.setPluginStorage('myKey', { data: 'value' });
      expect(api.getPluginStorage()).toEqual({ myKey: { data: 'value' } });
    });

    it('plugin storage is isolated between different plugin instances', () => {
      const api1 = createPluginAPI(mockMetadata);
      const api2 = createPluginAPI({ ...mockMetadata, id: 'com.other.plugin' });

      api1.setPluginStorage('key1', 'value1');
      api2.setPluginStorage('key2', 'value2');

      expect(api1.getPluginStorage()).toEqual({ key1: 'value1' });
      expect(api2.getPluginStorage()).toEqual({ key2: 'value2' });
    });
  });
});
