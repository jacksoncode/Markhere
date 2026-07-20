import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { QuickOpenPanel } from './QuickOpenPanel';
import { useEditorState } from '../../store/editorStore';
import { useTabsStore } from '../../store/tabsStore';
import { useFileStore } from '../../store/fileStore';
import { useAutoSaveStore } from '../../store/autoSaveStore';
import { invoke } from '@tauri-apps/api/core';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

const mockedInvoke = vi.mocked(invoke);

function resetStores() {
  const setContent = vi.fn();
  useEditorState.setState({ editorInstance: { commands: { setContent } } as any } as any);
  useTabsStore.setState({ tabs: [], activeTabId: null });
  useFileStore.setState({ currentPath: null, fileName: null, savedContent: '', isNewFile: true });
  useAutoSaveStore.setState({ hasUnsavedChanges: true });
  localStorage.removeItem('markhere-recent-files');
  vi.restoreAllMocks();
}

beforeEach(resetStores);

describe('QuickOpenPanel (open-file entry)', () => {
  it('opening a file via Cmd+P loads content into the editor and clears the dirty flag', async () => {
    const winPath = 'C:\\Users\\alice\\Project\\Doc.md';
    localStorage.setItem('markhere-recent-files', JSON.stringify([winPath]));
    mockedInvoke.mockResolvedValue('# Windows content');

    const onClose = vi.fn();
    const { container } = render(<QuickOpenPanel isOpen onClose={onClose} />);

    const input = container.querySelector('.quick-open-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Doc' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      const setContent = (useEditorState.getState().editorInstance as any).commands.setContent;
      expect(setContent).toHaveBeenCalledWith('# Windows content');
    });

    // Editor content + path + clean dirty flag all set by loadFileIntoEditor.
    expect(useFileStore.getState().currentPath).toBe(winPath);
    expect(useFileStore.getState().savedContent).toBe('# Windows content');
    expect(useAutoSaveStore.getState().hasUnsavedChanges).toBe(false);
    expect(onClose).toHaveBeenCalled();
  });

  it('switching to an already-open tab loads its content (regression for P0)', async () => {
    useTabsStore.setState({
      tabs: [{ id: 't1', path: '/docs/open.md', name: 'open.md', content: '# already open', isDirty: false, lastAccessed: Date.now() }],
      activeTabId: null,
    });

    const onClose = vi.fn();
    const { container } = render(<QuickOpenPanel isOpen onClose={onClose} />);

    const input = container.querySelector('.quick-open-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'open' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      const setContent = (useEditorState.getState().editorInstance as any).commands.setContent;
      expect(setContent).toHaveBeenCalledWith('# already open');
    });

    // No file read should be issued when the target is an open tab.
    expect(mockedInvoke).not.toHaveBeenCalled();
    expect(useAutoSaveStore.getState().hasUnsavedChanges).toBe(false);
  });
});
