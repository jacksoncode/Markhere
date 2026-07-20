import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadFileIntoEditor } from './fileOpen';
import { useFileStore } from '../store/fileStore';
import { useAutoSaveStore } from '../store/autoSaveStore';
import { useTabsStore } from '../store/tabsStore';
import { useEditorState } from '../store/editorStore';

function resetStores() {
  useFileStore.setState({ currentPath: null, fileName: null, savedContent: '', isNewFile: true });
  useAutoSaveStore.setState({ hasUnsavedChanges: true });
  useTabsStore.setState({ tabs: [], activeTabId: null });
  useEditorState.setState({ editorInstance: null } as any);
}

describe('loadFileIntoEditor (unified open-file sequence)', () => {
  beforeEach(() => {
    resetStores();
    vi.restoreAllMocks();
  });

  it('loads content into the editor, updates file store, marks saved, and opens a tab', () => {
    const setContent = vi.fn();
    const mockEditor: any = { commands: { setContent } };
    useEditorState.setState({ editorInstance: mockEditor } as any);

    // Simulate an unsaved previous document to verify markSaved clears it.
    useAutoSaveStore.setState({ hasUnsavedChanges: true });

    const path = 'C:\\Users\\alice\\Project\\Notes.md';
    const content = '# Hello\n\nWorld';
    loadFileIntoEditor(path, content);

    // 1. Editor got the content (the P0 QuickOpen bug: was previously skipped)
    expect(setContent).toHaveBeenCalledWith(content);

    // 2. File store reflects the new path and correctly parsed name on Windows
    const fs = useFileStore.getState();
    expect(fs.currentPath).toBe(path);
    expect(fs.fileName).toBe('Notes');
    expect(fs.savedContent).toBe(content);
    expect(fs.isNewFile).toBe(false);

    // 3. Unsaved flag from the previous file is cleared (P0: previously leaked)
    expect(useAutoSaveStore.getState().hasUnsavedChanges).toBe(false);

    // 4. Tab registered so the file appears in QuickOpen / TabBar
    const tabs = useTabsStore.getState().tabs;
    expect(tabs).toHaveLength(1);
    expect(tabs[0].path).toBe(path);
    expect(tabs[0].name).toBe('Notes.md');
  });

  it('works when no editor instance is mounted yet', () => {
    useEditorState.setState({ editorInstance: null } as any);
    // Should not throw even though editorInstance is null.
    expect(() => loadFileIntoEditor('/docs/a.md', '# x')).not.toThrow();
    expect(useFileStore.getState().currentPath).toBe('/docs/a.md');
    expect(useAutoSaveStore.getState().hasUnsavedChanges).toBe(false);
  });

  it('opening an already-open tab just activates it (no duplicate tab)', () => {
    const setContent = vi.fn();
    useEditorState.setState({ editorInstance: { commands: { setContent } } as any });
    loadFileIntoEditor('/docs/a.md', '# first');

    // Re-open the same path from QuickOpen "tab" result.
    loadFileIntoEditor('/docs/a.md', '# first');
    expect(useTabsStore.getState().tabs).toHaveLength(1);
    expect(setContent).toHaveBeenCalledTimes(2);
  });
});
