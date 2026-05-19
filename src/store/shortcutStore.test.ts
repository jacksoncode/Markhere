import { describe, it, expect, beforeEach } from 'vitest';
import { useShortcutStore } from './shortcutStore';

describe('useShortcutStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useShortcutStore.setState({
      shortcuts: [
        { action: 'save', key: 's', modifiers: ['Meta'] },
        { action: 'new', key: 'n', modifiers: ['Meta'] },
        { action: 'open', key: 'o', modifiers: ['Meta'] },
        { action: 'search', key: 'f', modifiers: ['Meta'] },
        { action: 'command-palette', key: 'k', modifiers: ['Meta'] },
        { action: 'bold', key: 'b', modifiers: ['Meta'] },
        { action: 'italic', key: 'i', modifiers: ['Meta'] },
        { action: 'underline', key: 'u', modifiers: ['Meta'] },
        { action: 'heading', key: 'h', modifiers: ['Meta'] },
      ],
    });
  });

  describe('initial state', () => {
    it('has 9 default shortcuts defined', () => {
      expect(useShortcutStore.getState().shortcuts).toHaveLength(9);
    });

    it('each shortcut has action, key, and modifiers properties', () => {
      const { shortcuts } = useShortcutStore.getState();
      for (const sc of shortcuts) {
        expect(sc).toHaveProperty('action');
        expect(sc).toHaveProperty('key');
        expect(sc).toHaveProperty('modifiers');
        expect(Array.isArray(sc.modifiers)).toBe(true);
      }
    });

    it('all default shortcuts have Meta modifier', () => {
      const { shortcuts } = useShortcutStore.getState();
      for (const sc of shortcuts) {
        expect(sc.modifiers).toContain('Meta');
      }
    });
  });

  describe('updateShortcut', () => {
    it('updates the key and modifiers for a given action', () => {
      useShortcutStore.getState().updateShortcut('save', {
        action: 'save',
        key: 'z',
        modifiers: ['Meta'],
      });

      const { shortcuts } = useShortcutStore.getState();
      const updated = shortcuts.find((s) => s.action === 'save');
      expect(updated?.key).toBe('z');
    });

    it('updates modifiers for a given action', () => {
      useShortcutStore.getState().updateShortcut('bold', {
        action: 'bold',
        key: 'b',
        modifiers: ['Meta', 'Shift'],
      });

      const { shortcuts } = useShortcutStore.getState();
      const updated = shortcuts.find((s) => s.action === 'bold');
      expect(updated?.modifiers).toEqual(['Meta', 'Shift']);
    });

    it('persists updated shortcuts to localStorage', () => {
      useShortcutStore.getState().updateShortcut('search', {
        action: 'search',
        key: 'g',
        modifiers: ['Meta'],
      });

      const saved = JSON.parse(localStorage.getItem('markhere-shortcuts') || '[]');
      const searchConfig = saved.find((s: { action: string }) => s.action === 'search');
      expect(searchConfig?.key).toBe('g');
    });

    it('does not affect other actions when updating one', () => {
      useShortcutStore.getState().updateShortcut('heading', {
        action: 'heading',
        key: 'j',
        modifiers: ['Meta'],
      });

      const { shortcuts } = useShortcutStore.getState();
      const italic = shortcuts.find((s) => s.action === 'italic');
      expect(italic?.key).toBe('i'); // unchanged
    });
  });

  describe('resetShortcuts', () => {
    it('restores all shortcuts to their default values', () => {
      // First, modify some shortcuts
      useShortcutStore.getState().updateShortcut('save', {
        action: 'save',
        key: 'z',
        modifiers: ['Meta'],
      });
      useShortcutStore.getState().updateShortcut('bold', {
        action: 'bold',
        key: 'x',
        modifiers: ['Meta', 'Shift'],
      });

      useShortcutStore.getState().resetShortcuts();

      const { shortcuts } = useShortcutStore.getState();
      expect(shortcuts).toHaveLength(9);

      const saveConfig = shortcuts.find((s) => s.action === 'save');
      expect(saveConfig?.key).toBe('s');
      expect(saveConfig?.modifiers).toEqual(['Meta']);

      const boldConfig = shortcuts.find((s) => s.action === 'bold');
      expect(boldConfig?.key).toBe('b');
      expect(boldConfig?.modifiers).toEqual(['Meta']);
    });

    it('updates localStorage with default shortcuts', () => {
      useShortcutStore.getState().updateShortcut('open', {
        action: 'open',
        key: 'p',
        modifiers: ['Meta'],
      });
      useShortcutStore.getState().resetShortcuts();

      const saved = JSON.parse(localStorage.getItem('markhere-shortcuts') || '[]');
      const openConfig = saved.find((s: { action: string }) => s.action === 'open');
      expect(openConfig?.key).toBe('o');
    });
  });
});
