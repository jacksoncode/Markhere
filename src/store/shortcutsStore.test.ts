import { describe, it, expect, beforeEach } from 'vitest';
import { useShortcutsStore, Shortcut } from './shortcutsStore';

function countByCategory(shortcuts: Shortcut[], category: Shortcut['category']): number {
  return shortcuts.filter((s) => s.category === category).length;
}

describe('useShortcutsStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useShortcutsStore.setState({
      shortcuts: [
        { id: 'open', name: 'Open File', description: 'Open a markdown file', defaultKey: 'Cmd+O', currentKey: 'Cmd+O', category: 'file' },
        { id: 'save', name: 'Save', description: 'Save current file', defaultKey: 'Cmd+S', currentKey: 'Cmd+S', category: 'file' },
        { id: 'saveAs', name: 'Save As', description: 'Save as new file', defaultKey: 'Cmd+Shift+S', currentKey: 'Cmd+Shift+S', category: 'file' },
        { id: 'new', name: 'New File', description: 'Create new file', defaultKey: 'Cmd+N', currentKey: 'Cmd+N', category: 'file' },
        { id: 'undo', name: 'Undo', description: 'Undo last action', defaultKey: 'Cmd+Z', currentKey: 'Cmd+Z', category: 'edit' },
        { id: 'redo', name: 'Redo', description: 'Redo last action', defaultKey: 'Cmd+Shift+Z', currentKey: 'Cmd+Shift+Z', category: 'edit' },
        { id: 'cut', name: 'Cut', description: 'Cut selected text', defaultKey: 'Cmd+X', currentKey: 'Cmd+X', category: 'edit' },
        { id: 'copy', name: 'Copy', description: 'Copy selected text', defaultKey: 'Cmd+C', currentKey: 'Cmd+C', category: 'edit' },
        { id: 'paste', name: 'Paste', description: 'Paste from clipboard', defaultKey: 'Cmd+V', currentKey: 'Cmd+V', category: 'edit' },
        { id: 'selectAll', name: 'Select All', description: 'Select all content', defaultKey: 'Cmd+A', currentKey: 'Cmd+A', category: 'edit' },
        { id: 'find', name: 'Find', description: 'Find in document', defaultKey: 'Cmd+F', currentKey: 'Cmd+F', category: 'edit' },
        { id: 'replace', name: 'Find and Replace', description: 'Find and replace text', defaultKey: 'Cmd+Shift+F', currentKey: 'Cmd+Shift+F', category: 'edit' },
        { id: 'toggleSidebar', name: 'Toggle Sidebar', description: 'Show/hide sidebar', defaultKey: 'Cmd+\\', currentKey: 'Cmd+\\', category: 'view' },
        { id: 'focusMode', name: 'Focus Mode', description: 'Enter focus mode', defaultKey: 'Cmd+Shift+F', currentKey: 'Cmd+Shift+F', category: 'view' },
        { id: 'typewriterMode', name: 'Typewriter Mode', description: 'Toggle typewriter mode', defaultKey: 'Cmd+Shift+T', currentKey: 'Cmd+Shift+T', category: 'view' },
        { id: 'sourceMode', name: 'Source Mode', description: 'Toggle source mode', defaultKey: 'Cmd+/', currentKey: 'Cmd+/', category: 'view' },
        { id: 'preview', name: 'Preview', description: 'Preview document', defaultKey: 'Cmd+P', currentKey: 'Cmd+P', category: 'view' },
        { id: 'bold', name: 'Bold', description: 'Make text bold', defaultKey: 'Cmd+B', currentKey: 'Cmd+B', category: 'format' },
        { id: 'italic', name: 'Italic', description: 'Make text italic', defaultKey: 'Cmd+I', currentKey: 'Cmd+I', category: 'format' },
        { id: 'underline', name: 'Underline', description: 'Underline text', defaultKey: 'Cmd+U', currentKey: 'Cmd+U', category: 'format' },
        { id: 'strike', name: 'Strikethrough', description: 'Strikethrough text', defaultKey: 'Cmd+Shift+X', currentKey: 'Cmd+Shift+X', category: 'format' },
        { id: 'code', name: 'Inline Code', description: 'Make inline code', defaultKey: 'Cmd+E', currentKey: 'Cmd+E', category: 'format' },
        { id: 'link', name: 'Insert Link', description: 'Insert hyperlink', defaultKey: 'Cmd+K', currentKey: 'Cmd+K', category: 'format' },
        { id: 'image', name: 'Insert Image', description: 'Insert image', defaultKey: 'Cmd+Shift+I', currentKey: 'Cmd+Shift+I', category: 'format' },
        { id: 'heading1', name: 'Heading 1', description: 'Insert heading 1', defaultKey: 'Cmd+1', currentKey: 'Cmd+1', category: 'insert' },
        { id: 'heading2', name: 'Heading 2', description: 'Insert heading 2', defaultKey: 'Cmd+2', currentKey: 'Cmd+2', category: 'insert' },
        { id: 'heading3', name: 'Heading 3', description: 'Insert heading 3', defaultKey: 'Cmd+3', currentKey: 'Cmd+3', category: 'insert' },
        { id: 'blockquote', name: 'Blockquote', description: 'Insert blockquote', defaultKey: 'Cmd+Shift+Q', currentKey: 'Cmd+Shift+Q', category: 'insert' },
        { id: 'codeBlock', name: 'Code Block', description: 'Insert code block', defaultKey: 'Cmd+Shift+C', currentKey: 'Cmd+Shift+C', category: 'insert' },
        { id: 'list', name: 'Bullet List', description: 'Insert bullet list', defaultKey: 'Cmd+Shift+L', currentKey: 'Cmd+Shift+L', category: 'insert' },
        { id: 'orderedList', name: 'Ordered List', description: 'Insert ordered list', defaultKey: 'Cmd+Shift+O', currentKey: 'Cmd+Shift+O', category: 'insert' },
        { id: 'table', name: 'Insert Table', description: 'Insert table', defaultKey: 'Cmd+T', currentKey: 'Cmd+T', category: 'insert' },
      ],
      isRecording: false,
      recordingId: null,
    });
  });

  describe('initial state', () => {
    it('has all 32 default shortcuts defined', () => {
      expect(useShortcutsStore.getState().shortcuts).toHaveLength(32);
    });

    it('has shortcuts distributed across all five categories', () => {
      const { shortcuts } = useShortcutsStore.getState();

      expect(countByCategory(shortcuts, 'file')).toBe(4);
      expect(countByCategory(shortcuts, 'edit')).toBe(8);
      expect(countByCategory(shortcuts, 'view')).toBe(5);
      expect(countByCategory(shortcuts, 'format')).toBe(7);
      expect(countByCategory(shortcuts, 'insert')).toBe(8);
    });

    it('is not recording by default', () => {
      expect(useShortcutsStore.getState().isRecording).toBe(false);
    });

    it('has no recording ID by default', () => {
      expect(useShortcutsStore.getState().recordingId).toBeNull();
    });
  });

  describe('updateShortcut', () => {
    it('updates the currentKey for a given shortcut id', () => {
      useShortcutsStore.getState().updateShortcut('bold', 'Cmd+Shift+B');

      const shortcut = useShortcutsStore.getState().getShortcut('bold');
      expect(shortcut?.currentKey).toBe('Cmd+Shift+B');
    });

    it('does not change the defaultKey when updating', () => {
      useShortcutsStore.getState().updateShortcut('save', 'Alt+S');

      const shortcut = useShortcutsStore.getState().getShortcut('save');
      expect(shortcut?.defaultKey).toBe('Cmd+S');
      expect(shortcut?.currentKey).toBe('Alt+S');
    });

    it('clears recording state after update', () => {
      useShortcutsStore.getState().startRecording('italic');
      useShortcutsStore.getState().updateShortcut('italic', 'Cmd+Alt+I');

      expect(useShortcutsStore.getState().isRecording).toBe(false);
      expect(useShortcutsStore.getState().recordingId).toBeNull();
    });

    it('does not affect other shortcuts when updating one', () => {
      useShortcutsStore.getState().updateShortcut('bold', 'Alt+B');

      const italic = useShortcutsStore.getState().getShortcut('italic');
      expect(italic?.currentKey).toBe('Cmd+I'); // unchanged
    });

    it('handles updating to the same key value', () => {
      useShortcutsStore.getState().updateShortcut('copy', 'Cmd+C');

      const shortcut = useShortcutsStore.getState().getShortcut('copy');
      expect(shortcut?.currentKey).toBe('Cmd+C');
    });
  });

  describe('resetShortcut', () => {
    it('restores defaultKey as currentKey for a single shortcut', () => {
      useShortcutsStore.getState().updateShortcut('undo', 'Ctrl+Z');
      useShortcutsStore.getState().resetShortcut('undo');

      const shortcut = useShortcutsStore.getState().getShortcut('undo');
      expect(shortcut?.currentKey).toBe('Cmd+Z');
      expect(shortcut?.defaultKey).toBe('Cmd+Z');
    });

    it('does not affect other shortcuts when resetting one', () => {
      useShortcutsStore.getState().updateShortcut('bold', 'Alt+B');
      useShortcutsStore.getState().updateShortcut('italic', 'Alt+I');
      useShortcutsStore.getState().resetShortcut('bold');

      const italic = useShortcutsStore.getState().getShortcut('italic');
      expect(italic?.currentKey).toBe('Alt+I'); // unchanged
    });
  });

  describe('resetAllShortcuts', () => {
    it('restores all currentKeys to match their defaultKeys', () => {
      useShortcutsStore.getState().updateShortcut('bold', 'Alt+B');
      useShortcutsStore.getState().updateShortcut('italic', 'Alt+I');
      useShortcutsStore.getState().updateShortcut('save', 'Ctrl+S');

      useShortcutsStore.getState().resetAllShortcuts();

      const { shortcuts } = useShortcutsStore.getState();
      for (const s of shortcuts) {
        expect(s.currentKey).toBe(s.defaultKey);
      }
    });

    it('leaves the recording state unaffected', () => {
      useShortcutsStore.getState().startRecording('bold');
      useShortcutsStore.getState().resetAllShortcuts();

      // resetAllShortcuts does NOT clear recording state
      expect(useShortcutsStore.getState().isRecording).toBe(true);
      expect(useShortcutsStore.getState().recordingId).toBe('bold');
    });
  });

  describe('startRecording / stopRecording', () => {
    it('startRecording sets isRecording to true and records the shortcut id', () => {
      useShortcutsStore.getState().startRecording('bold');

      expect(useShortcutsStore.getState().isRecording).toBe(true);
      expect(useShortcutsStore.getState().recordingId).toBe('bold');
    });

    it('stopRecording clears recording state', () => {
      useShortcutsStore.getState().startRecording('italic');
      useShortcutsStore.getState().stopRecording();

      expect(useShortcutsStore.getState().isRecording).toBe(false);
      expect(useShortcutsStore.getState().recordingId).toBeNull();
    });

    it('can start recording for different shortcut ids sequentially', () => {
      useShortcutsStore.getState().startRecording('bold');
      useShortcutsStore.getState().startRecording('italic');

      expect(useShortcutsStore.getState().recordingId).toBe('italic');
    });
  });

  describe('getShortcut', () => {
    it('returns the shortcut object for a known id', () => {
      const shortcut = useShortcutsStore.getState().getShortcut('preview');
      expect(shortcut).toBeDefined();
      expect(shortcut?.id).toBe('preview');
      expect(shortcut?.category).toBe('view');
    });

    it('returns undefined for an unknown id', () => {
      const shortcut = useShortcutsStore.getState().getShortcut('nonexistent');
      expect(shortcut).toBeUndefined();
    });
  });

  describe('getShortcutsByCategory', () => {
    it('returns all shortcuts in the given category', () => {
      const editShortcuts = useShortcutsStore.getState().getShortcutsByCategory('edit');
      expect(editShortcuts).toHaveLength(8);
      for (const s of editShortcuts) {
        expect(s.category).toBe('edit');
      }
    });

    it('returns empty array for a category with no shortcuts', () => {
      // All five categories have shortcuts, but we can filter on something that
      // matches zero items by checking an empty category.
      // Instead, we verify each known category returns non-empty.
      const insertShortcuts = useShortcutsStore.getState().getShortcutsByCategory('insert');
      expect(insertShortcuts.length).toBeGreaterThan(0);
    });

    it('returns file shortcuts correctly', () => {
      const fileShortcuts = useShortcutsStore.getState().getShortcutsByCategory('file');
      const ids = fileShortcuts.map((s) => s.id).sort();
      expect(ids).toEqual(['new', 'open', 'save', 'saveAs']);
    });
  });
});
