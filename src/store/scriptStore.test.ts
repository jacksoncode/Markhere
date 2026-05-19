import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useScriptStore, Script } from './scriptStore';

describe('useScriptStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useScriptStore.setState({ scripts: [] });

    // Mock Tauri invoke on window
    (window as any).__TAURI__ = {
      invoke: vi.fn().mockResolvedValue('mock execution result'),
    };
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
      const mockInvoke = (window as any).__TAURI__.invoke;
      mockInvoke.mockResolvedValueOnce('output from script');

      useScriptStore.getState().addScript({
        name: 'test',
        path: '/test.sh',
        args: ['--verbose'],
      });

      const result = await useScriptStore.getState().executeScript('test');

      expect(result).toBe('output from script');
      expect(mockInvoke).toHaveBeenCalledWith('run_script', {
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
      delete (window as any).__TAURI__;

      useScriptStore.getState().addScript({
        name: 'test',
        path: '/test.sh',
        args: [],
      });

      await expect(
        useScriptStore.getState().executeScript('test')
      ).rejects.toThrow('Tauri not available');
    });
  });
});
