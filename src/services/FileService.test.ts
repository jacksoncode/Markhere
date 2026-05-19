import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
  save: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { FileService } from './FileService';

const mockInvoke = vi.mocked(invoke);
const mockOpen = vi.mocked(open);
const mockSave = vi.mocked(save);

describe('FileService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // openFile
  // -----------------------------------------------------------------------
  describe('openFile', () => {
    it('opens file dialog and reads file content', async () => {
      mockOpen.mockResolvedValue('/path/to/document.md');
      mockInvoke.mockResolvedValue('# Hello\n\nThis is some content.');

      const result = await FileService.openFile();

      expect(mockOpen).toHaveBeenCalledWith({
        filters: [{ name: 'Markdown', extensions: ['md'] }],
        multiple: false,
      });
      expect(mockInvoke).toHaveBeenCalledWith('read_file', {
        path: '/path/to/document.md',
      });
      expect(result).toEqual({
        path: '/path/to/document.md',
        content: '# Hello\n\nThis is some content.',
      });
    });

    it('returns null when dialog is cancelled (null)', async () => {
      mockOpen.mockResolvedValue(null);

      const result = await FileService.openFile();

      expect(result).toBeNull();
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('returns null when dialog result is not a string', async () => {
      // The dialog can return null or a path; the code checks typeof
      mockOpen.mockResolvedValue(undefined as unknown as string | null);

      const result = await FileService.openFile();

      expect(result).toBeNull();
    });

    it('throws when invoke fails with file not found', async () => {
      mockOpen.mockResolvedValue('/path/to/file.md');
      mockInvoke.mockRejectedValue(new Error('File not found'));

      await expect(FileService.openFile()).rejects.toThrow('File not found');
    });
  });

  // -----------------------------------------------------------------------
  // saveFile
  // -----------------------------------------------------------------------
  describe('saveFile', () => {
    it('invokes save_file with path and content', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await FileService.saveFile('/path/to/file.md', '# Hello World');

      expect(mockInvoke).toHaveBeenCalledWith('save_file', {
        path: '/path/to/file.md',
        content: '# Hello World',
      });
    });

    it('throws on permission denied', async () => {
      mockInvoke.mockRejectedValue(new Error('Permission denied'));

      await expect(
        FileService.saveFile('/root/restricted.md', 'content')
      ).rejects.toThrow('Permission denied');
    });
  });

  // -----------------------------------------------------------------------
  // newFile
  // -----------------------------------------------------------------------
  describe('newFile', () => {
    it('opens save dialog with default path and returns the chosen path', async () => {
      mockSave.mockResolvedValue('/path/to/new-file.md');

      const result = await FileService.newFile();

      expect(mockSave).toHaveBeenCalledWith({
        filters: [{ name: 'Markdown', extensions: ['md'] }],
        defaultPath: 'untitled.md',
      });
      expect(result).toBe('/path/to/new-file.md');
    });

    it('returns null when save dialog is cancelled', async () => {
      mockSave.mockResolvedValue(null);

      const result = await FileService.newFile();

      expect(result).toBeNull();
    });

    it('returns null when dialog returns non-string value', async () => {
      // The code checks typeof path === 'string'
      mockSave.mockResolvedValue(undefined as unknown as string | null);

      const result = await FileService.newFile();

      expect(result).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // fileExists
  // -----------------------------------------------------------------------
  describe('fileExists', () => {
    it('returns true when file exists', async () => {
      mockInvoke.mockResolvedValue(true);

      const result = await FileService.fileExists('/path/to/file.md');

      expect(mockInvoke).toHaveBeenCalledWith('file_exists', {
        path: '/path/to/file.md',
      });
      expect(result).toBe(true);
    });

    it('returns false when file does not exist', async () => {
      mockInvoke.mockResolvedValue(false);

      const result = await FileService.fileExists('/path/to/nonexistent.md');

      expect(result).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Error handling: file not found / permission denied
  // -----------------------------------------------------------------------
  describe('error handling', () => {
    it('openFile surfaces file I/O errors', async () => {
      mockOpen.mockResolvedValue('/path/to/file.md');
      mockInvoke.mockRejectedValue(new Error('Disk I/O error'));

      await expect(FileService.openFile()).rejects.toThrow('Disk I/O error');
    });

    it('saveFile surfaces write errors', async () => {
      mockInvoke.mockRejectedValue(new Error('Disk full'));

      await expect(
        FileService.saveFile('/path/to/file.md', 'content')
      ).rejects.toThrow('Disk full');
    });

    it('fileExists surfaces errors from the backend', async () => {
      mockInvoke.mockRejectedValue(new Error('Network error'));

      await expect(
        FileService.fileExists('/network/path.md')
      ).rejects.toThrow('Network error');
    });
  });
});
