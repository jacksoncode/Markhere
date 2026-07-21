import { describe, it, expect, beforeEach, vi } from 'vitest';
import { switchToTab } from './tabSwitch';
import { useFileStore } from '../store/fileStore';
import { useAutoSaveStore } from '../store/autoSaveStore';
import { useTabsStore } from '../store/tabsStore';
import { useEditorState } from '../store/editorStore';

vi.mock('./FileService', () => ({
  FileService: {
    saveFile: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../workers/SaveWorker', () => ({
  saveWorker: {
    cancel: vi.fn(),
    triggerSave: vi.fn(),
    immediateSave: vi.fn(),
  },
}));

import { FileService } from './FileService';
import { saveWorker } from '../workers/SaveWorker';

/**
 * Build a minimal fake editor whose markdown storage returns `markdown` and
 * whose `setContent` records what it was asked to render.
 */
function makeEditor(markdown: string) {
  const setContent = vi.fn();
  const editor: any = {
    commands: { setContent },
    storage: { markdown: { getMarkdown: () => markdown } },
  };
  return { editor, setContent };
}

function resetStores() {
  useFileStore.setState({ currentPath: null, fileName: null, savedContent: '', isNewFile: true });
  useAutoSaveStore.setState({ hasUnsavedChanges: false });
  useTabsStore.setState({ tabs: [], activeTabId: null, closedTabs: [] });
  useEditorState.setState({ editorInstance: null } as any);
}

describe('switchToTab (tab switch swaps editor content)', () => {
  beforeEach(() => {
    resetStores();
    vi.clearAllMocks();
  });

  it('loads the target tab content into the editor and syncs file store', () => {
    // Two tabs already open; A is active.
    useTabsStore.setState({
      tabs: [
        { id: 'a', path: '/a.md', name: 'a.md', content: '# A', isDirty: false, lastAccessed: 1 },
        { id: 'b', path: '/b.md', name: 'b.md', content: '# B', isDirty: false, lastAccessed: 2 },
      ],
      activeTabId: 'a',
    });
    useFileStore.setState({ currentPath: '/a.md', fileName: 'a', savedContent: '# A', isNewFile: false });

    const { editor, setContent } = makeEditor('# A');
    useEditorState.setState({ editorInstance: editor } as any);

    switchToTab('b');

    // Editor swapped to B's content (the core bug: content used to stay on A).
    expect(setContent).toHaveBeenCalledWith('# B');
    // Active tab flipped.
    expect(useTabsStore.getState().activeTabId).toBe('b');
    // File store now points at B.
    const fs = useFileStore.getState();
    expect(fs.currentPath).toBe('/b.md');
    expect(fs.savedContent).toBe('# B');
  });

  it('caches unsaved edits of the outgoing tab and persists them to disk', () => {
    useTabsStore.setState({
      tabs: [
        { id: 'a', path: '/a.md', name: 'a.md', content: '# A', isDirty: false, lastAccessed: 1 },
        { id: 'b', path: '/b.md', name: 'b.md', content: '# B', isDirty: false, lastAccessed: 2 },
      ],
      activeTabId: 'a',
    });
    useFileStore.setState({ currentPath: '/a.md', fileName: 'a', savedContent: '# A', isNewFile: false });
    // A has unsaved edits currently in the editor.
    useAutoSaveStore.setState({ hasUnsavedChanges: true });

    const { editor } = makeEditor('# A edited');
    useEditorState.setState({ editorInstance: editor } as any);

    switchToTab('b');

    // Outgoing tab A keeps the latest editor content in memory.
    const tabA = useTabsStore.getState().getTabById('a');
    expect(tabA?.content).toBe('# A edited');
    // Pending debounced save cancelled to avoid writing B's content to A's path.
    expect(saveWorker.cancel).toHaveBeenCalled();
    // Unsaved edits persisted to disk with A's captured path+content.
    expect(FileService.saveFile).toHaveBeenCalledWith('/a.md', '# A edited');
  });

  it('restores the dirty flag of the incoming tab', () => {
    useTabsStore.setState({
      tabs: [
        { id: 'a', path: '/a.md', name: 'a.md', content: '# A', isDirty: false, lastAccessed: 1 },
        { id: 'b', path: '/b.md', name: 'b.md', content: '# B dirty', isDirty: true, lastAccessed: 2 },
      ],
      activeTabId: 'a',
    });
    useFileStore.setState({ currentPath: '/a.md', fileName: 'a', savedContent: '# A', isNewFile: false });

    const { editor } = makeEditor('# A');
    useEditorState.setState({ editorInstance: editor } as any);

    switchToTab('b');

    // B was dirty, so the unsaved flag is restored after switching.
    expect(useAutoSaveStore.getState().hasUnsavedChanges).toBe(true);
  });

  it('is a no-op when re-selecting the already-active tab', () => {
    useTabsStore.setState({
      tabs: [{ id: 'a', path: '/a.md', name: 'a.md', content: '# A', isDirty: false, lastAccessed: 1 }],
      activeTabId: 'a',
    });
    const { editor, setContent } = makeEditor('# A');
    useEditorState.setState({ editorInstance: editor } as any);

    switchToTab('a');

    expect(setContent).not.toHaveBeenCalled();
    expect(saveWorker.cancel).not.toHaveBeenCalled();
  });

  it('does not throw when no editor is mounted', () => {
    useTabsStore.setState({
      tabs: [
        { id: 'a', path: '/a.md', name: 'a.md', content: '# A', isDirty: false, lastAccessed: 1 },
        { id: 'b', path: '/b.md', name: 'b.md', content: '# B', isDirty: false, lastAccessed: 2 },
      ],
      activeTabId: 'a',
    });
    useEditorState.setState({ editorInstance: null } as any);

    expect(() => switchToTab('b')).not.toThrow();
    expect(useTabsStore.getState().activeTabId).toBe('b');
    expect(useFileStore.getState().currentPath).toBe('/b.md');
  });
});
