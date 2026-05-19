import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

const mockNotify = vi.fn();

vi.mock('../components/Notification/Notification', () => ({
  useNotificationStore: {
    getState: vi.fn(() => ({
      notify: mockNotify,
    })),
  },
}));

import { invoke } from '@tauri-apps/api/core';
import { useNotificationStore } from '../components/Notification/Notification';
import { safeInvoke, withErrorHandling } from './ipcWrapper';

const mockInvoke = vi.mocked(invoke);

describe('safeInvoke', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns data on success', async () => {
    mockInvoke.mockResolvedValue({ path: '/test/file.md', content: 'hello' });

    const result = await safeInvoke<{ path: string; content: string }>(
      'read_file',
      { path: '/test/file.md' }
    );

    expect(result).toEqual({ path: '/test/file.md', content: 'hello' });
    expect(mockInvoke).toHaveBeenCalledWith('read_file', {
      path: '/test/file.md',
    });
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it('shows error notification on failure', async () => {
    const error = new Error('File not found');
    mockInvoke.mockRejectedValue(error);

    await expect(
      safeInvoke('read_file', { path: '/nonexistent.md' })
    ).rejects.toThrow('File not found');

    expect(mockNotify).toHaveBeenCalledWith(
      'error',
      'File not found',
      'IPC Error: read_file'
    );
  });

  it('re-throws the original error after notification', async () => {
    const error = new Error('Permission denied');
    mockInvoke.mockRejectedValue(error);

    try {
      await safeInvoke('save_file', { path: '/restricted.md', content: '' });
      // Should not reach here
      expect.unreachable('Expected error to be thrown');
    } catch (e) {
      expect(e).toBe(error);
      expect(mockNotify).toHaveBeenCalledWith(
        'error',
        'Permission denied',
        'IPC Error: save_file'
      );
    }
  });

  it('handles non-Error objects in catch', async () => {
    mockInvoke.mockRejectedValue('string error');

    await expect(
      safeInvoke('some_command')
    ).rejects.toBe('string error');

    expect(mockNotify).toHaveBeenCalledWith(
      'error',
      'string error',
      'IPC Error: some_command'
    );
  });

  it('passes arguments through to invoke', async () => {
    mockInvoke.mockResolvedValue('ok');

    const args = { path: '/test.md', content: '# Hello', encoding: 'utf-8' };
    await safeInvoke<string>('write_file', args);

    expect(mockInvoke).toHaveBeenCalledWith('write_file', args);
  });

  it('handles command with no arguments', async () => {
    mockInvoke.mockResolvedValue(true);

    const result = await safeInvoke<boolean>('ping');

    expect(mockInvoke).toHaveBeenCalledWith('ping', undefined);
    expect(result).toBe(true);
  });

  it('handles notification store throwing (store unavailable)', async () => {
    const error = new Error('Something broke');
    mockInvoke.mockRejectedValue(error);

    // Make getState throw
    const mockGetState = vi.mocked(useNotificationStore.getState);
    mockGetState.mockImplementationOnce(() => {
      throw new Error('Store not available');
    });

    // Should still re-throw the original error
    await expect(
      safeInvoke('test_command')
    ).rejects.toThrow('Something broke');
  });
});

// ---------------------------------------------------------------------------
// withErrorHandling
// ---------------------------------------------------------------------------

describe('withErrorHandling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns result on success', async () => {
    const fn = vi.fn().mockResolvedValue({ success: true, data: [1, 2, 3] });

    const result = await withErrorHandling(fn, 'GetData');

    expect(result).toEqual({ success: true, data: [1, 2, 3] });
    expect(fn).toHaveBeenCalledOnce();
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it('catches error, shows notification, and re-throws', async () => {
    const error = new Error('Network timeout');
    const fn = vi.fn().mockRejectedValue(error);

    await expect(
      withErrorHandling(fn, 'SaveDocument')
    ).rejects.toThrow('Network timeout');

    expect(mockNotify).toHaveBeenCalledWith(
      'error',
      'Network timeout',
      'Error (SaveDocument)'
    );
  });

  it('uses "Error" label when no context provided', async () => {
    const error = new Error('Generic failure');
    const fn = vi.fn().mockRejectedValue(error);

    await expect(
      withErrorHandling(fn)
    ).rejects.toThrow('Generic failure');

    expect(mockNotify).toHaveBeenCalledWith(
      'error',
      'Generic failure',
      'Error'
    );
  });

  it('handles non-Error objects in catch', async () => {
    const fn = vi.fn().mockRejectedValue({ code: 500, message: 'Server error' });

    await expect(
      withErrorHandling(fn, 'ApiCall')
    ).rejects.toEqual({ code: 500, message: 'Server error' });

    expect(mockNotify).toHaveBeenCalledWith(
      'error',
      '[object Object]',
      'Error (ApiCall)'
    );
  });

  it('handles notification store unavailable fallback', async () => {
    const error = new Error('Critical failure');
    const fn = vi.fn().mockRejectedValue(error);

    const mockGetState = vi.mocked(useNotificationStore.getState);
    mockGetState.mockImplementationOnce(() => {
      throw new Error('Store not available');
    });

    await expect(
      withErrorHandling(fn, 'Critical')
    ).rejects.toThrow('Critical failure');

    // Should not throw from the notification failure
    // The original error should still propagate
  });
});
