import { describe, it, expect, beforeEach, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { safeInvoke, withErrorHandling } from '../../services/ipcWrapper';
import { FileService } from '../../services/FileService';
import { ExportService } from '../../services/ExportService';
import { useFileStore } from '../../store/fileStore';
import { useNotificationStore } from '../../components/Notification/Notification';

// ---- Mocks ----

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
  save: vi.fn(),
}));

// ---- Helpers ----

const fileStoreDefaults = {
  currentPath: null as string | null,
  fileName: null as string | null,
  savedContent: '',
  isNewFile: true,
};

// ---- Tests ----

describe('safeInvoke chain', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset notification store to a clean state
    useNotificationStore.setState({ notifications: [] });
    useFileStore.setState({ ...fileStoreDefaults });
  });

  it('simple invoke success: safeInvoke returns the result', async () => {
    const mockedInvoke = vi.mocked(invoke);
    mockedInvoke.mockResolvedValue({ status: 'ok', data: 42 });

    const result = await safeInvoke<{ status: string; data: number }>('read_config');

    expect(mockedInvoke).toHaveBeenCalledWith('read_config', undefined);
    expect(result).toEqual({ status: 'ok', data: 42 });
  });

  it('simple invoke success with arguments', async () => {
    const mockedInvoke = vi.mocked(invoke);
    mockedInvoke.mockResolvedValue('file content here');

    const result = await safeInvoke<string>('read_file', { path: '/doc.md' });

    expect(mockedInvoke).toHaveBeenCalledWith('read_file', { path: '/doc.md' });
    expect(result).toBe('file content here');
  });

  it('invoke failure: safeInvoke triggers a toast notification and re-throws', async () => {
    const mockedInvoke = vi.mocked(invoke);
    mockedInvoke.mockRejectedValue(new Error('Connection refused'));

    // Spy on notify before calling safeInvoke
    const notifySpy = vi.spyOn(useNotificationStore.getState(), 'notify');
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      safeInvoke('connect_to_server', { host: 'localhost' }),
    ).rejects.toThrow('Connection refused');

    expect(mockedInvoke).toHaveBeenCalledWith('connect_to_server', { host: 'localhost' });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[IPC] Command "connect_to_server" failed:'),
      expect.any(Error),
    );
    expect(notifySpy).toHaveBeenCalledWith(
      'error',
      'Connection refused',
      'IPC Error: connect_to_server',
    );

    consoleErrorSpy.mockRestore();
  });

  it('invoke failure: non-Error rejection is converted to string for notification', async () => {
    const mockedInvoke = vi.mocked(invoke);
    mockedInvoke.mockRejectedValue('Something went wrong');

    const notifySpy = vi.spyOn(useNotificationStore.getState(), 'notify');
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      safeInvoke('risky_command'),
    ).rejects.toBe('Something went wrong');

    expect(notifySpy).toHaveBeenCalledWith(
      'error',
      'Something went wrong',
      'IPC Error: risky_command',
    );
  });

  it('invoke failure: notification store is unavailable (graceful degradation)', async () => {
    const mockedInvoke = vi.mocked(invoke);
    mockedInvoke.mockRejectedValue(new Error('Fatal error'));

    // Simulate notification store being broken
    const brokenNotify = vi.fn().mockImplementation(() => {
      throw new Error('Store not initialized');
    });
    vi.spyOn(useNotificationStore, 'getState').mockReturnValueOnce({
      notify: brokenNotify,
      notifications: [],
      dismiss: vi.fn(),
      clearAll: vi.fn(),
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Should still throw the original error even if notify fails
    await expect(safeInvoke('test')).rejects.toThrow('Fatal error');
  });

  it('chained invokes: read file → modify content → save file', async () => {
    const mockedInvoke = vi.mocked(invoke);

    // Mock read
    mockedInvoke.mockResolvedValueOnce('# Original Content');
    // Mock save
    mockedInvoke.mockResolvedValueOnce(undefined);

    // Step 1: use safeInvoke to read a file
    const fileContent = await safeInvoke<string>('read_file', { path: '/docs/note.md' });
    expect(fileContent).toBe('# Original Content');

    // Step 2: modify content
    const modifiedContent = fileContent + '\n\n## Appended Section';

    // Step 3: use safeInvoke to save modified content
    await safeInvoke('save_file', { path: '/docs/note.md', content: modifiedContent });

    expect(mockedInvoke).toHaveBeenCalledTimes(2);
    expect(mockedInvoke).toHaveBeenNthCalledWith(1, 'read_file', { path: '/docs/note.md' });
    expect(mockedInvoke).toHaveBeenNthCalledWith(2, 'save_file', {
      path: '/docs/note.md',
      content: '# Original Content\n\n## Appended Section',
    });
  });

  it('chained invokes: intermediate failure prevents subsequent operations', async () => {
    const mockedInvoke = vi.mocked(invoke);

    // First invoke succeeds (read)
    mockedInvoke.mockResolvedValueOnce('content');
    // Second invoke fails (save)
    mockedInvoke.mockRejectedValueOnce(new Error('Disk full'));

    const notifySpy = vi.spyOn(useNotificationStore.getState(), 'notify');
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Read succeeds
    const content = await safeInvoke<string>('read_file', { path: '/f.md' });
    expect(content).toBe('content');

    // Save fails — the chain is broken, caller must handle
    await expect(
      safeInvoke('save_file', { path: '/f.md', content: content + ' extra' }),
    ).rejects.toThrow('Disk full');

    // Notification was fired for the failure
    expect(notifySpy).toHaveBeenCalledWith(
      'error',
      'Disk full',
      'IPC Error: save_file',
    );

    // Only two invokes happened (the chain stopped)
    expect(mockedInvoke).toHaveBeenCalledTimes(2);
  });
});

describe('withErrorHandling chain', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useNotificationStore.setState({ notifications: [] });
  });

  it('wraps a function that succeeds and returns its result', async () => {
    const asyncTask = vi.fn().mockResolvedValue({ done: true, items: 5 });

    const result = await withErrorHandling(asyncTask, 'batch-process');

    expect(asyncTask).toHaveBeenCalledOnce();
    expect(result).toEqual({ done: true, items: 5 });
  });

  it('wraps a function that throws, catches the error, fires notification, and re-throws', async () => {
    const asyncTask = vi.fn().mockRejectedValue(new Error('Network timeout'));

    const notifySpy = vi.spyOn(useNotificationStore.getState(), 'notify');
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      withErrorHandling(asyncTask, 'api-sync'),
    ).rejects.toThrow('Network timeout');

    expect(notifySpy).toHaveBeenCalledWith(
      'error',
      'Network timeout',
      'Error (api-sync)',
    );
  });

  it('wraps a function that throws without context string', async () => {
    const asyncTask = vi.fn().mockRejectedValue(new Error('Boom!'));

    const notifySpy = vi.spyOn(useNotificationStore.getState(), 'notify');
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      withErrorHandling(asyncTask),
    ).rejects.toThrow('Boom!');

    // Without context, the label defaults to 'Error'
    expect(notifySpy).toHaveBeenCalledWith('error', 'Boom!', 'Error');
  });

  it('wraps a function that throws a non-Error value', async () => {
    const asyncTask = vi.fn().mockRejectedValue('plain string error');

    const notifySpy = vi.spyOn(useNotificationStore.getState(), 'notify');
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      withErrorHandling(asyncTask, 'task'),
    ).rejects.toBe('plain string error');

    expect(notifySpy).toHaveBeenCalledWith(
      'error',
      'plain string error',
      'Error (task)',
    );
  });
});

describe('File I/O chains', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useFileStore.setState({ ...fileStoreDefaults });
  });

  it('Open-save lifecycle: open file → modify content → save back to same path', async () => {
    const mockedOpen = vi.mocked(open);
    mockedOpen.mockResolvedValue('/projects/report.md');

    const mockedInvoke = vi.mocked(invoke);
    mockedInvoke.mockResolvedValueOnce(0);                                        // get_file_size (0 = small file)
    mockedInvoke.mockResolvedValueOnce('# Quarterly Report\n\nData: Q1 2025');   // read_file
    mockedInvoke.mockResolvedValueOnce(undefined);                               // save_file

    // 1. Open file via FileService
    const fileResult = await FileService.openFile();
    expect(fileResult).not.toBeNull();
    if (!fileResult) return; // type guard

    // 2. Update store with opened file info
    useFileStore.getState().setCurrentPath(fileResult.path);
    useFileStore.getState().setSavedContent(fileResult.content);

    expect(useFileStore.getState().currentPath).toBe('/projects/report.md');
    expect(useFileStore.getState().savedContent).toBe('# Quarterly Report\n\nData: Q1 2025');

    // 3. Modify content (simulate user editing)
    const updatedContent = fileResult.content + '\n\n## Revised Forecast\n\nUpdated projections.';

    // 4. Save modified content back
    await FileService.saveFile(fileResult.path, updatedContent);

    expect(mockedInvoke).toHaveBeenCalledWith('save_file', {
      path: '/projects/report.md',
      content: expect.stringContaining('Revised Forecast'),
    });
  });

  it('Open-save lifecycle: handles cancellation at open stage', async () => {
    const mockedOpen = vi.mocked(open);
    mockedOpen.mockResolvedValue(null);

    const result = await FileService.openFile();

    expect(result).toBeNull();
    // Store should remain in initial state
    expect(useFileStore.getState().currentPath).toBeNull();
    expect(useFileStore.getState().savedContent).toBe('');
  });

  it('Export chain: render markdown → export to PDF via safeInvoke pattern', async () => {
    const mockedSave = vi.mocked(save);
    mockedSave.mockResolvedValue('/output/final.pdf');

    const mockedInvoke = vi.mocked(invoke);
    mockedInvoke.mockResolvedValue('/output/final.pdf');

    const markdown = '# Final Report\n\nThis is the conclusion.';
    const result = await ExportService.exportToPDF(markdown, 'FinalReport');

    expect(mockedSave).toHaveBeenCalled();
    expect(mockedInvoke).toHaveBeenCalledWith('export_to_pdf', {
      markdown,
      outputPath: '/output/final.pdf',
    });
    expect(result).toBe('/output/final.pdf');
  });

  it('Export chain: handles dialog cancellation by returning null', async () => {
    const mockedSave = vi.mocked(save);
    mockedSave.mockResolvedValue(null);

    const result = await ExportService.exportToHTML('<p>content</p>', 'Test');

    expect(result).toBeNull();
    expect(invoke).not.toHaveBeenCalled();
  });
});

describe('Error recovery chains', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useNotificationStore.setState({ notifications: [] });
    useFileStore.setState({ ...fileStoreDefaults });
  });

  it('safeInvoke failure: error notification is fired, fileStore state remains unchanged', async () => {
    // Set up fileStore with known state
    useFileStore.setState({
      currentPath: '/docs/important.md',
      fileName: 'important',
      savedContent: '# Critical Data',
      isNewFile: false,
    });

    const mockedInvoke = vi.mocked(invoke);
    mockedInvoke.mockRejectedValueOnce(new Error('Permission denied'));

    const notifySpy = vi.spyOn(useNotificationStore.getState(), 'notify');
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Attempt a save that fails
    await expect(
      safeInvoke('save_file', { path: '/docs/important.md', content: 'new' }),
    ).rejects.toThrow('Permission denied');

    // Notification was fired
    expect(notifySpy).toHaveBeenCalledWith(
      'error',
      'Permission denied',
      'IPC Error: save_file',
    );

    // fileStore state should NOT have changed (the save failed)
    const storeAfter = useFileStore.getState();
    expect(storeAfter.currentPath).toBe('/docs/important.md');
    expect(storeAfter.savedContent).toBe('# Critical Data');
    expect(storeAfter.fileName).toBe('important');
  });

  it('safeInvoke failure: caller catches error and can implement fallback logic', async () => {
    const mockedInvoke = vi.mocked(invoke);
    mockedInvoke.mockRejectedValueOnce(new Error('Network unreachable'));

    vi.spyOn(console, 'error').mockImplementation(() => {});

    let caughtError: Error | null = null;
    let fallbackExecuted = false;

    try {
      await safeInvoke('fetch_remote', { url: 'https://example.com/data.json' });
    } catch (err) {
      caughtError = err instanceof Error ? err : new Error(String(err));
      // Fallback: use cached data
      fallbackExecuted = true;
    }

    expect(caughtError?.message).toBe('Network unreachable');
    expect(fallbackExecuted).toBe(true);

    // Store should be untouched
    expect(useFileStore.getState().savedContent).toBe('');
  });

  it('withErrorHandling failure: network-like error during fetch is handled with context notification', async () => {
    const unstableTask = vi.fn().mockRejectedValue(new Error('fetch failed: ECONNREFUSED'));

    const notifySpy = vi.spyOn(useNotificationStore.getState(), 'notify');
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      withErrorHandling(unstableTask, 'link-validation'),
    ).rejects.toThrow('fetch failed: ECONNREFUSED');

    expect(notifySpy).toHaveBeenCalledWith(
      'error',
      'fetch failed: ECONNREFUSED',
      'Error (link-validation)',
    );
  });

  it('multiple sequential safeInvoke failures: each one fires its own notification', async () => {
    const mockedInvoke = vi.mocked(invoke);
    mockedInvoke
      .mockRejectedValueOnce(new Error('First failure'))
      .mockRejectedValueOnce(new Error('Second failure'));

    const notifySpy = vi.spyOn(useNotificationStore.getState(), 'notify');
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(safeInvoke('cmd_a')).rejects.toThrow('First failure');
    await expect(safeInvoke('cmd_b')).rejects.toThrow('Second failure');

    expect(notifySpy).toHaveBeenCalledTimes(2);
    expect(notifySpy).toHaveBeenNthCalledWith(1, 'error', 'First failure', 'IPC Error: cmd_a');
    expect(notifySpy).toHaveBeenNthCalledWith(2, 'error', 'Second failure', 'IPC Error: cmd_b');
  });
});
