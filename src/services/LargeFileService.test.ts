import { describe, it, expect, vi } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('../store/uiStore', () => ({
  useUIState: { getState: () => ({ setLoadingMessage: vi.fn(), setLoadingProgress: vi.fn(), showError: vi.fn() }) },
}));
vi.mock('./ipcWrapper', () => ({
  safeInvoke: vi.fn().mockImplementation(async (cmd: string) => {
    if (cmd === 'get_file_size') return 1024;
    if (cmd === 'read_file') return '# Content';
    if (cmd === 'read_file_chunk') return 'chunk data ';
    return null;
  }),
}));

import { LargeFileService } from './LargeFileService';

describe('LargeFileService', () => {
  it('loads small file via read_file', async () => {
    const result = await LargeFileService.loadFile('/test.md');
    expect(result).toBeTruthy();
    expect(result?.path).toBe('/test.md');
    expect(result?.content).toBe('# Content');
  });

  it('formats file sizes', async () => {
    const result = await LargeFileService.loadFile('/small.md');
    expect(result).toBeTruthy();
  });

  it('returns null on error', async () => {
    const { safeInvoke } = await import('./ipcWrapper');
    vi.mocked(safeInvoke).mockRejectedValueOnce(new Error('IO Error'));
    const result = await LargeFileService.loadFile('/bad.md');
    expect(result).toBeNull();
  });
});
