import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useScriptStore, Script } from './scriptStore';

// Mock @tauri-apps/api/core for Tauri v2 dynamic import pattern
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue('mock execution result'),
}));

describe('useScriptStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useScriptStore.setState({ scripts: [] });
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('has an empty scripts array', () => {
      expect(useScriptStore.getState().scripts).toEqual([]);
    });
  });

  describe('addScript', () => {
    it('adds a script entry to the store', () => {
      const script: Script = {
        name: 'lint',
        path: '/usr/local/bin/eslint',
        args: ['--fix', 'src/'],
      };

      useScriptStore.getState().addScript(script);

      const { scripts } = useScriptStore.getState();
      expect(scripts).toHaveLength(1);
      expect(scripts[0]).toEqual(script);
    });

    it('persists scripts to localStorage after adding', () => {
      useScriptStore.getState().addScript({
        name: 'build',
        path: '/usr/bin/make',
        args: [],
      });

      const saved = JSON.parse(localStorage.getItem('markhere-scripts') || '[]');
      expect(saved).toHaveLength(1);
      expect(saved[0].name).toBe('build');
      expect(saved[0].path).toBe('/usr/bin/make');
    });

    it('adds multiple scripts', () => {
      useScriptStore.getState().addScript({ name: 'one', path: '/one.sh', args: [] });
      useScriptStore.getState().addScript({ name: 'two', path: '/two.sh', args: [] });

      expect(useScriptStore.getState().scripts).toHaveLength(2);
    });
  });

  describe('removeScript', () => {
    it('removes a script by name', () => {
      useScriptStore.getState().addScript({ name: 'keep', path: '/keep.sh', args: [] });
      useScriptStore.getState().addScript({ name: 'delete', path: '/delete.sh', args: [] });

      useScriptStore.getState().removeScript('delete');

      const { scripts } = useScriptStore.getState();
      expect(scripts).toHaveLength(1);
      expect(scripts[0].name).toBe('keep');
    });

    it('does nothing when the script name does not exist', () => {
      useScriptStore.getState().addScript({ name: 'existing', path: '/e.sh', args: [] });

      useScriptStore.getState().removeScript('nonexistent');

      const { scripts } = useScriptStore.getState();
      expect(scripts).toHaveLength(1);
    });

    it('updates localStorage after removing a script', () => {
      useScriptStore.getState().addScript({ name: 'a', path: '/a.sh', args: [] });
      useScriptStore.getState().addScript({ name: 'b', path: '/b.sh', args: [] });
      useScriptStore.getState().removeScript('a');

      const saved = JSON.parse(localStorage.getItem('markhere-scripts') || '[]');
      expect(saved).toHaveLength(1);
      expect(saved[0].name).toBe('b');
    });
  });

  describe('executeScript', () => {
    it('returns the result from Tauri invoke when script exists', async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      (invoke as ReturnType<typeof vi.fn>).mockResolvedValueOnce('output from script');

      useScriptStore.getState().addScript({
        name: 'test',
        path: '/test.sh',
        args: ['--verbose'],
      });

      const result = await useScriptStore.getState().executeScript('test');

      expect(result).toBe('output from script');
      expect(invoke).toHaveBeenCalledWith('run_script', {
        scriptPath: '/test.sh',
        args: ['--verbose'],
      });
    });

    it('throws an error when the script name is not found', async () => {
      await expect(
        useScriptStore.getState().executeScript('nonexistent')
      ).rejects.toThrow('Script not found');
    });

    it('throws an error when Tauri is not available', async () => {
      // Re-mock to simulate import failure
      vi.doMock('@tauri-apps/api/core', () => {
        throw new Error('Module not available');
      });

      useScriptStore.getState().addScript({
        name: 'test',
        path: '/test.sh',
        args: [],
      });

      // Import the store fresh with the failed mock
      const { useScriptStore: freshStore } = await import('./scriptStore');
      freshStore.setState({
        scripts: [{ name: 'test', path: '/test.sh', args: [] }],
      });

      await expect(
        freshStore.getState().executeScript('test')
      ).rejects.toThrow('Tauri not available');
    });
  });
});
