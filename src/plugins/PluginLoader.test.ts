import { describe, it, expect, beforeEach, vi } from 'vitest';

// Use vi.hoisted so variables are available inside the hoisted vi.mock factories
const { mockInvoke, mockLoadPlugin } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
  mockLoadPlugin: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: mockInvoke,
}));

vi.mock('../store/pluginStore', () => ({
  usePluginStore: {
    getState: () => ({
      loadPlugin: mockLoadPlugin,
    }),
  },
}));

import {
  loadPluginFromDirectory,
  discoverPlugins,
  loadAllPlugins,
  createPluginManifestTemplate,
  createPluginMainTemplate,
} from './PluginLoader';

const validManifest = {
  id: 'com.test.plugin',
  name: 'Test Plugin',
  version: '1.0.0',
  author: 'Test Author',
  description: 'A test plugin',
  license: 'MIT',
  minAppVersion: '0.4.0',
  enabled: true,
};

// PluginLoader expects main.js content that evaluates to a callable factory function.
// new Function('return ' + content)() returns the function, then pluginFunction() calls it.
const validMainJs = `function() {
  return {
    onLoad: async function(api) {
      api.registerCommand({
        id: 'test.hello',
        label: 'Hello',
        category: 'plugin',
        handler: function() {},
      });
    },
    onUnload: async function() {},
  };
}`;

describe('loadPluginFromDirectory', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    mockLoadPlugin.mockReset();
  });

  it('loads a valid plugin from directory', async () => {
    mockInvoke
      .mockResolvedValueOnce(JSON.stringify(validManifest))
      .mockResolvedValueOnce(validMainJs);

    const plugin = await loadPluginFromDirectory('/plugins/test-plugin');

    expect(plugin).not.toBeNull();
    expect(plugin!.id).toBe('com.test.plugin');
    expect(plugin!.name).toBe('Test Plugin');
    expect(plugin!.version).toBe('1.0.0');
    expect(plugin!.author).toBe('Test Author');
    expect(typeof plugin!.onLoad).toBe('function');
    expect(typeof plugin!.onUnload).toBe('function');
  });

  it('reads manifest.json and main.js from the plugin directory', async () => {
    mockInvoke
      .mockResolvedValueOnce(JSON.stringify(validManifest))
      .mockResolvedValueOnce(validMainJs);

    await loadPluginFromDirectory('/plugins/my-plugin');

    expect(mockInvoke).toHaveBeenCalledWith('read_file', {
      path: '/plugins/my-plugin/manifest.json',
    });
    expect(mockInvoke).toHaveBeenCalledWith('read_file', {
      path: '/plugins/my-plugin/main.js',
    });
  });

  it('returns null when manifest cannot be read', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('File not found'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const plugin = await loadPluginFromDirectory('/plugins/missing-plugin');

    expect(plugin).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('returns null when main.js cannot be read', async () => {
    mockInvoke
      .mockResolvedValueOnce(JSON.stringify(validManifest))
      .mockRejectedValueOnce(new Error('Main file missing'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const plugin = await loadPluginFromDirectory('/plugins/broken-plugin');

    expect(plugin).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('returns null when manifest JSON is invalid', async () => {
    mockInvoke
      .mockResolvedValueOnce('not valid json {')
      .mockResolvedValueOnce(validMainJs);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const plugin = await loadPluginFromDirectory('/plugins/bad-manifest');

    expect(plugin).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});

describe('discoverPlugins', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it('returns a list of plugin paths', async () => {
    mockInvoke.mockResolvedValueOnce(['/plugins/plugin-a', '/plugins/plugin-b']);

    const paths = await discoverPlugins();

    expect(paths).toEqual(['/plugins/plugin-a', '/plugins/plugin-b']);
    expect(mockInvoke).toHaveBeenCalledWith('list_plugins');
  });

  it('returns an empty array on error', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('Discover failed'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const paths = await discoverPlugins();

    expect(paths).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});

describe('loadAllPlugins', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    mockLoadPlugin.mockReset();
  });

  it('discovers and loads all plugins', async () => {
    mockInvoke
      .mockResolvedValueOnce(['/plugins/plugin-a', '/plugins/plugin-b'])
      .mockResolvedValueOnce(JSON.stringify(validManifest))
      .mockResolvedValueOnce(validMainJs)
      .mockResolvedValueOnce(JSON.stringify({ ...validManifest, id: 'com.test.plugin2' }))
      .mockResolvedValueOnce(validMainJs);

    await loadAllPlugins();

    expect(mockLoadPlugin).toHaveBeenCalledTimes(2);
  });

  it('skips plugins that fail to load', async () => {
    mockInvoke
      .mockResolvedValueOnce(['/plugins/plugin-a'])
      .mockRejectedValueOnce(new Error('Cannot read'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await loadAllPlugins();

    expect(mockLoadPlugin).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});

describe('createPluginManifestTemplate', () => {
  it('returns a valid PluginMetadata object', () => {
    const manifest = createPluginManifestTemplate();

    expect(manifest.id).toBe('com.example.plugin');
    expect(manifest.name).toBe('Example Plugin');
    expect(manifest.version).toBe('1.0.0');
    expect(manifest.author).toBe('Your Name');
    expect(manifest.description).toBe('A sample plugin for Markhere');
    expect(manifest.homepage).toBe('https://github.com/example/plugin');
    expect(manifest.repository).toBe('https://github.com/example/plugin');
    expect(manifest.license).toBe('MIT');
    expect(manifest.minAppVersion).toBe('0.4.0');
    expect(manifest.enabled).toBe(false);
  });
});

describe('createPluginMainTemplate', () => {
  it('returns a non-empty string', () => {
    const template = createPluginMainTemplate();
    expect(typeof template).toBe('string');
    expect(template.length).toBeGreaterThan(0);
  });

  it('contains typical plugin lifecycle hooks', () => {
    const template = createPluginMainTemplate();
    expect(template).toContain('onLoad');
    expect(template).toContain('onUnload');
    expect(template).toContain('onEditorReady');
  });

  it('contains command registration example', () => {
    const template = createPluginMainTemplate();
    expect(template).toContain('registerCommand');
    expect(template).toContain('example.hello');
  });
});
