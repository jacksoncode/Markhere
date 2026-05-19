import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks – must be hoisted above all imports
// ---------------------------------------------------------------------------
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}));

import { usePluginStore } from '../store/pluginStore';
import type {
  MarkherePlugin,
  PluginCommand,
  PluginExtension,
  PluginPanel,
} from '../plugins/PluginAPI';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function createTestPlugin(overrides: Partial<MarkherePlugin> = {}): MarkherePlugin {
  return {
    id: 'test-plugin',
    name: 'Test Plugin',
    version: '1.0.0',
    author: 'Tester',
    description: 'A test plugin',
    license: 'MIT',
    minAppVersion: '0.1.0',
    enabled: true,
    ...overrides,
  };
}

function createTestCommand(overrides: Partial<PluginCommand> = {}): PluginCommand {
  return {
    id: 'test-cmd',
    label: 'Test Command',
    category: 'tools',
    handler: vi.fn(),
    ...overrides,
  };
}

function createTestExtension(overrides: Partial<PluginExtension> = {}): PluginExtension {
  return {
    name: 'test-ext',
    extension: {},
    ...overrides,
  };
}

function createTestPanel(overrides: Partial<PluginPanel> = {}): PluginPanel {
  return {
    id: 'test-panel',
    title: 'Test Panel',
    position: 'left',
    render: vi.fn(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('usePluginStore', () => {
  beforeEach(() => {
    usePluginStore.setState({
      plugins: new Map(),
      enabledPlugins: [],
      commands: new Map(),
      extensions: new Map(),
      panels: new Map(),
      currentEditor: null,
    });
    localStorage.clear();
  });

  // -----------------------------------------------------------------------
  // Initial state
  // -----------------------------------------------------------------------
  describe('initial state', () => {
    it('has empty plugins map', () => {
      const state = usePluginStore.getState();
      expect(state.plugins.size).toBe(0);
    });

    it('has empty enabledPlugins array', () => {
      const state = usePluginStore.getState();
      expect(state.enabledPlugins).toEqual([]);
    });

    it('has empty commands, extensions, panels maps', () => {
      const state = usePluginStore.getState();
      expect(state.commands.size).toBe(0);
      expect(state.extensions.size).toBe(0);
      expect(state.panels.size).toBe(0);
    });

    it('has null currentEditor', () => {
      const state = usePluginStore.getState();
      expect(state.currentEditor).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // loadPlugin
  // -----------------------------------------------------------------------
  describe('loadPlugin', () => {
    it('adds a plugin to the plugins map', async () => {
      const { loadPlugin } = usePluginStore.getState();
      const plugin = createTestPlugin({ id: 'my-plugin' });

      await loadPlugin(plugin);

      const state = usePluginStore.getState();
      expect(state.plugins.has('my-plugin')).toBe(true);
      expect(state.plugins.get('my-plugin')).toBe(plugin);
    });

    it('calls onLoad when plugin has onLoad callback', async () => {
      const onLoad = vi.fn();
      const plugin = createTestPlugin({ id: 'with-load', onLoad });

      const { loadPlugin } = usePluginStore.getState();
      await loadPlugin(plugin);

      expect(onLoad).toHaveBeenCalledTimes(1);
      expect(onLoad).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: plugin }),
      );
    });

    it('calls onEditorReady when currentEditor is already set', async () => {
      const mockEditor = { commands: {}, state: {} } as any;
      usePluginStore.setState({ currentEditor: mockEditor });

      const onEditorReady = vi.fn();
      const plugin = createTestPlugin({ id: 'editor-plugin', onEditorReady });

      const { loadPlugin } = usePluginStore.getState();
      await loadPlugin(plugin);

      expect(onEditorReady).toHaveBeenCalledTimes(1);
      expect(onEditorReady).toHaveBeenCalledWith(mockEditor);
    });

    it('does NOT call onEditorReady when currentEditor is null', async () => {
      const onEditorReady = vi.fn();
      const plugin = createTestPlugin({ id: 'no-editor-plugin', onEditorReady });

      const { loadPlugin } = usePluginStore.getState();
      await loadPlugin(plugin);

      expect(onEditorReady).not.toHaveBeenCalled();
    });

    it('skips loading when plugin.enabled is false', async () => {
      const onLoad = vi.fn();
      const plugin = createTestPlugin({ id: 'disabled-plugin', enabled: false, onLoad });

      const { loadPlugin } = usePluginStore.getState();
      await loadPlugin(plugin);

      const state = usePluginStore.getState();
      expect(state.plugins.has('disabled-plugin')).toBe(false);
      expect(onLoad).not.toHaveBeenCalled();
    });

    it('skips loading when plugin.enabled is undefined', async () => {
      const plugin = { ...createTestPlugin({ id: 'undefined-enabled' }), enabled: undefined } as any;

      const { loadPlugin } = usePluginStore.getState();
      await loadPlugin(plugin);

      expect(usePluginStore.getState().plugins.has('undefined-enabled')).toBe(false);
    });

    it('replaces existing plugin with same id', async () => {
      const { loadPlugin } = usePluginStore.getState();
      const plugin1 = createTestPlugin({ id: 'same-id', name: 'Version 1' });
      const plugin2 = createTestPlugin({ id: 'same-id', name: 'Version 2' });

      await loadPlugin(plugin1);
      await loadPlugin(plugin2);

      const state = usePluginStore.getState();
      expect(state.plugins.size).toBe(1);
      expect(state.plugins.get('same-id')!.name).toBe('Version 2');
    });
  });

  // -----------------------------------------------------------------------
  // unloadPlugin
  // -----------------------------------------------------------------------
  describe('unloadPlugin', () => {
    it('removes the plugin from the plugins map', async () => {
      const { loadPlugin } = usePluginStore.getState();
      const plugin = createTestPlugin({ id: 'to-unload' });
      await loadPlugin(plugin);

      const { unloadPlugin } = usePluginStore.getState();
      await unloadPlugin('to-unload');

      expect(usePluginStore.getState().plugins.has('to-unload')).toBe(false);
    });

    it('calls onUnload when plugin has onUnload callback', async () => {
      const onUnload = vi.fn();
      const plugin = createTestPlugin({ id: 'with-unload', onUnload });

      const { loadPlugin } = usePluginStore.getState();
      await loadPlugin(plugin);

      const { unloadPlugin } = usePluginStore.getState();
      await unloadPlugin('with-unload');

      expect(onUnload).toHaveBeenCalledTimes(1);
    });

    it('removes all commands registered by the plugin', async () => {
      const { loadPlugin, registerCommand } = usePluginStore.getState();
      const plugin = createTestPlugin({ id: 'unload-cmd' });
      await loadPlugin(plugin);

      registerCommand('unload-cmd', createTestCommand({ id: 'cmd-1' }));
      registerCommand('unload-cmd', createTestCommand({ id: 'cmd-2' }));

      const { unloadPlugin } = usePluginStore.getState();
      await unloadPlugin('unload-cmd');

      const state = usePluginStore.getState();
      expect(state.commands.has('unload-cmd')).toBe(false);
      expect(state.getCommands()).toHaveLength(0);
    });

    it('removes all extensions registered by the plugin', async () => {
      const { loadPlugin, registerExtension } = usePluginStore.getState();
      const plugin = createTestPlugin({ id: 'unload-ext' });
      await loadPlugin(plugin);

      registerExtension('unload-ext', createTestExtension({ name: 'ext-1' }));

      const { unloadPlugin } = usePluginStore.getState();
      await unloadPlugin('unload-ext');

      const state = usePluginStore.getState();
      expect(state.extensions.has('unload-ext')).toBe(false);
      expect(state.getExtensions()).toHaveLength(0);
    });

    it('removes all panels registered by the plugin', async () => {
      const { loadPlugin, registerPanel } = usePluginStore.getState();
      const plugin = createTestPlugin({ id: 'unload-panel' });
      await loadPlugin(plugin);

      registerPanel('unload-panel', createTestPanel({ id: 'panel-1' }));

      const { unloadPlugin } = usePluginStore.getState();
      await unloadPlugin('unload-panel');

      const state = usePluginStore.getState();
      expect(state.panels.has('unload-panel')).toBe(false);
      expect(state.getPanels()).toHaveLength(0);
    });

    it('does nothing when unloading a non-existent plugin', async () => {
      const { unloadPlugin } = usePluginStore.getState();
      await unloadPlugin('does-not-exist');

      const state = usePluginStore.getState();
      expect(state.plugins.size).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // enablePlugin / disablePlugin
  // -----------------------------------------------------------------------
  describe('enablePlugin / disablePlugin', () => {
    it('enablePlugin adds pluginId to enabledPlugins', async () => {
      const { loadPlugin } = usePluginStore.getState();
      const plugin = createTestPlugin({ id: 'to-enable', enabled: true });
      await loadPlugin(plugin);

      // Reset enabledPlugins to empty first (simulate persistent state)
      usePluginStore.setState({ enabledPlugins: [] });

      const { enablePlugin } = usePluginStore.getState();
      enablePlugin('to-enable');

      const state = usePluginStore.getState();
      expect(state.enabledPlugins).toContain('to-enable');
      expect(state.plugins.get('to-enable')!.enabled).toBe(true);
    });

    it('calls onActivate when enabling', async () => {
      const onActivate = vi.fn();
      const plugin = createTestPlugin({ id: 'activate-test', onActivate });

      const { loadPlugin } = usePluginStore.getState();
      await loadPlugin(plugin);

      const { enablePlugin } = usePluginStore.getState();
      enablePlugin('activate-test');

      expect(onActivate).toHaveBeenCalledTimes(1);
    });

    it('disablePlugin removes pluginId from enabledPlugins', async () => {
      const { loadPlugin } = usePluginStore.getState();
      const plugin = createTestPlugin({ id: 'to-disable', enabled: true });
      await loadPlugin(plugin);

      usePluginStore.setState({ enabledPlugins: ['to-disable'] });

      const { disablePlugin } = usePluginStore.getState();
      disablePlugin('to-disable');

      const state = usePluginStore.getState();
      expect(state.enabledPlugins).not.toContain('to-disable');
      expect(state.plugins.get('to-disable')!.enabled).toBe(false);
    });

    it('calls onDeactivate when disabling', async () => {
      const onDeactivate = vi.fn();
      const plugin = createTestPlugin({ id: 'deactivate-test', onDeactivate });

      const { loadPlugin } = usePluginStore.getState();
      await loadPlugin(plugin);

      usePluginStore.setState({ enabledPlugins: ['deactivate-test'] });

      const { disablePlugin } = usePluginStore.getState();
      disablePlugin('deactivate-test');

      expect(onDeactivate).toHaveBeenCalledTimes(1);
    });

    it('enablePlugin does nothing for non-existent plugin', () => {
      const { enablePlugin } = usePluginStore.getState();
      enablePlugin('does-not-exist');

      expect(usePluginStore.getState().enabledPlugins).toEqual([]);
    });

    it('disablePlugin does nothing for non-existent plugin', () => {
      const { disablePlugin } = usePluginStore.getState();
      disablePlugin('does-not-exist');

      expect(usePluginStore.getState().enabledPlugins).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // registerCommand / unregisterCommand
  // -----------------------------------------------------------------------
  describe('registerCommand / unregisterCommand', () => {
    it('registers a command under the plugin id', () => {
      const { registerCommand } = usePluginStore.getState();
      const cmd = createTestCommand({ id: 'cmd-save' });

      registerCommand('plugin-a', cmd);

      const state = usePluginStore.getState();
      expect(state.commands.has('plugin-a')).toBe(true);
      expect(state.commands.get('plugin-a')).toEqual([cmd]);
    });

    it('registers multiple commands for the same plugin', () => {
      const { registerCommand } = usePluginStore.getState();
      const cmd1 = createTestCommand({ id: 'cmd-1' });
      const cmd2 = createTestCommand({ id: 'cmd-2' });

      registerCommand('plugin-a', cmd1);
      registerCommand('plugin-a', cmd2);

      const commands = usePluginStore.getState().commands.get('plugin-a');
      expect(commands).toHaveLength(2);
      expect(commands![0].id).toBe('cmd-1');
      expect(commands![1].id).toBe('cmd-2');
    });

    it('registers commands for different plugins independently', () => {
      const { registerCommand } = usePluginStore.getState();

      registerCommand('plugin-a', createTestCommand({ id: 'a-cmd' }));
      registerCommand('plugin-b', createTestCommand({ id: 'b-cmd' }));

      const state = usePluginStore.getState();
      expect(state.commands.has('plugin-a')).toBe(true);
      expect(state.commands.has('plugin-b')).toBe(true);
    });

    it('unregisters a specific command by id', () => {
      const { registerCommand, unregisterCommand } = usePluginStore.getState();
      const cmd1 = createTestCommand({ id: 'cmd-1' });
      const cmd2 = createTestCommand({ id: 'cmd-2' });

      registerCommand('plugin-a', cmd1);
      registerCommand('plugin-a', cmd2);

      unregisterCommand('plugin-a', 'cmd-1');

      const commands = usePluginStore.getState().commands.get('plugin-a');
      expect(commands).toHaveLength(1);
      expect(commands![0].id).toBe('cmd-2');
    });

    it('unregisterCommand is safe when plugin has no commands', () => {
      const { unregisterCommand } = usePluginStore.getState();

      // Should not throw
      expect(() => unregisterCommand('unknown-plugin', 'some-cmd')).not.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // registerExtension / unregisterExtension
  // -----------------------------------------------------------------------
  describe('registerExtension / unregisterExtension', () => {
    it('registers an extension under the plugin id', () => {
      const { registerExtension } = usePluginStore.getState();
      const ext = createTestExtension({ name: 'highlight-extension' });

      registerExtension('plugin-a', ext);

      const state = usePluginStore.getState();
      expect(state.extensions.has('plugin-a')).toBe(true);
      expect(state.extensions.get('plugin-a')).toEqual([ext]);
    });

    it('registerExtension supports multiple extensions per plugin', () => {
      const { registerExtension } = usePluginStore.getState();
      const ext1 = createTestExtension({ name: 'ext-1' });
      const ext2 = createTestExtension({ name: 'ext-2' });

      registerExtension('plugin-a', ext1);
      registerExtension('plugin-a', ext2);

      const extensions = usePluginStore.getState().extensions.get('plugin-a');
      expect(extensions).toHaveLength(2);
    });

    it('unregisterExtension removes extension by name', () => {
      const { registerExtension, unregisterExtension } = usePluginStore.getState();
      const ext1 = createTestExtension({ name: 'ext-a' });
      const ext2 = createTestExtension({ name: 'ext-b' });

      registerExtension('plugin-a', ext1);
      registerExtension('plugin-a', ext2);

      unregisterExtension('plugin-a', 'ext-a');

      const extensions = usePluginStore.getState().extensions.get('plugin-a');
      expect(extensions).toHaveLength(1);
      expect(extensions![0].name).toBe('ext-b');
    });

    it('unregisterExtension is safe when plugin has no extensions', () => {
      const { unregisterExtension } = usePluginStore.getState();

      // Should not throw
      expect(() => unregisterExtension('unknown', 'some-ext')).not.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // registerPanel / unregisterPanel
  // -----------------------------------------------------------------------
  describe('registerPanel / unregisterPanel', () => {
    it('registers a panel under the plugin id', () => {
      const { registerPanel } = usePluginStore.getState();
      const panel = createTestPanel({ id: 'settings-panel' });

      registerPanel('plugin-a', panel);

      const state = usePluginStore.getState();
      expect(state.panels.has('plugin-a')).toBe(true);
      expect(state.panels.get('plugin-a')).toEqual([panel]);
    });

    it('registerPanel supports multiple panels per plugin', () => {
      const { registerPanel } = usePluginStore.getState();
      const panel1 = createTestPanel({ id: 'panel-1' });
      const panel2 = createTestPanel({ id: 'panel-2' });

      registerPanel('plugin-a', panel1);
      registerPanel('plugin-a', panel2);

      const panels = usePluginStore.getState().panels.get('plugin-a');
      expect(panels).toHaveLength(2);
    });

    it('unregisterPanel removes panel by id', () => {
      const { registerPanel, unregisterPanel } = usePluginStore.getState();
      const panel1 = createTestPanel({ id: 'panel-a' });
      const panel2 = createTestPanel({ id: 'panel-b' });

      registerPanel('plugin-a', panel1);
      registerPanel('plugin-a', panel2);

      unregisterPanel('plugin-a', 'panel-a');

      const panels = usePluginStore.getState().panels.get('plugin-a');
      expect(panels).toHaveLength(1);
      expect(panels![0].id).toBe('panel-b');
    });

    it('unregisterPanel is safe when plugin has no panels', () => {
      const { unregisterPanel } = usePluginStore.getState();

      // Should not throw
      expect(() => unregisterPanel('unknown', 'some-panel')).not.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // setEditor
  // -----------------------------------------------------------------------
  describe('setEditor', () => {
    it('stores the editor reference', () => {
      const mockEditor = { commands: {}, state: {} } as any;

      const { setEditor } = usePluginStore.getState();
      setEditor(mockEditor);

      expect(usePluginStore.getState().currentEditor).toBe(mockEditor);
    });

    it('calls onEditorReady on plugins where plugin.enabled is true', async () => {
      const onEditorReadyA = vi.fn();
      const onEditorReadyB = vi.fn();

      const { loadPlugin } = usePluginStore.getState();

      await loadPlugin(createTestPlugin({ id: 'a', onEditorReady: onEditorReadyA, enabled: true }));
      await loadPlugin(createTestPlugin({ id: 'b', onEditorReady: onEditorReadyB, enabled: true }));

      // Manually disable plugin B by mutating its enabled flag
      const pluginBInStore = usePluginStore.getState().plugins.get('b');
      if (pluginBInStore) {
        pluginBInStore.enabled = false;
      }

      const mockEditor = { commands: {} } as any;

      const { setEditor } = usePluginStore.getState();
      setEditor(mockEditor);

      // onEditorReady is called by loadPlugin only when currentEditor is set.
      // Since currentEditor starts null, it is only called once via setEditor.
      expect(onEditorReadyA).toHaveBeenCalledTimes(1);
      // onEditorReadyB: plugin B is disabled so it is skipped by setEditor
      expect(onEditorReadyB).toHaveBeenCalledTimes(0);
    });
  });

  // -----------------------------------------------------------------------
  // getCommands / getExtensions / getPanels
  // -----------------------------------------------------------------------
  describe('aggregated getters', () => {
    it('getCommands aggregates commands from all plugins', () => {
      const { registerCommand } = usePluginStore.getState();

      registerCommand('plugin-a', createTestCommand({ id: 'a-cmd' }));
      registerCommand('plugin-b', createTestCommand({ id: 'b-cmd' }));
      registerCommand('plugin-b', createTestCommand({ id: 'b-cmd-2' }));

      const { getCommands } = usePluginStore.getState();
      const allCommands = getCommands();

      expect(allCommands).toHaveLength(3);
      const ids = allCommands.map((c) => c.id);
      expect(ids).toContain('a-cmd');
      expect(ids).toContain('b-cmd');
      expect(ids).toContain('b-cmd-2');
    });

    it('getCommands returns empty array when no commands registered', () => {
      const { getCommands } = usePluginStore.getState();

      expect(getCommands()).toEqual([]);
    });

    it('getExtensions aggregates extensions from all plugins', () => {
      const { registerExtension } = usePluginStore.getState();

      registerExtension('plugin-a', createTestExtension({ name: 'ext-a' }));
      registerExtension('plugin-b', createTestExtension({ name: 'ext-b' }));

      const { getExtensions } = usePluginStore.getState();
      const allExtensions = getExtensions();

      expect(allExtensions).toHaveLength(2);
      const names = allExtensions.map((e) => e.name);
      expect(names).toContain('ext-a');
      expect(names).toContain('ext-b');
    });

    it('getExtensions returns empty array when no extensions registered', () => {
      const { getExtensions } = usePluginStore.getState();

      expect(getExtensions()).toEqual([]);
    });

    it('getPanels aggregates panels from all plugins', () => {
      const { registerPanel } = usePluginStore.getState();

      registerPanel('plugin-a', createTestPanel({ id: 'panel-a' }));
      registerPanel('plugin-b', createTestPanel({ id: 'panel-b' }));

      const { getPanels } = usePluginStore.getState();
      const allPanels = getPanels();

      expect(allPanels).toHaveLength(2);
      const ids = allPanels.map((p) => p.id);
      expect(ids).toContain('panel-a');
      expect(ids).toContain('panel-b');
    });

    it('getPanels returns empty array when no panels registered', () => {
      const { getPanels } = usePluginStore.getState();

      expect(getPanels()).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // persistence partialize
  // -----------------------------------------------------------------------
  describe('persistence', () => {
    it('only persists enabledPlugins, not Maps', () => {
      const { registerCommand } = usePluginStore.getState();
      registerCommand('plugin-a', createTestCommand({ id: 'test-cmd' }));

      usePluginStore.setState({ enabledPlugins: ['plugin-a', 'plugin-b'] });

      const state = usePluginStore.getState();

      // enabledPlugins is persisted
      expect(state.enabledPlugins).toEqual(['plugin-a', 'plugin-b']);

      // maps have entries (but won't be in persisted state)
      expect(state.commands.size).toBe(1);
      expect(state.plugins.size).toBe(0);
    });
  });
});
