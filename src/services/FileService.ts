import { safeInvoke } from './ipcWrapper';
import { open, save } from '@tauri-apps/plugin-dialog';
import { LargeFileService } from './LargeFileService';
import { FileWatcherService } from './FileWatcherService';

export interface FileResult {
  path: string;
  content: string;
}

// File dialog filters. Include .md/.markdown/.txt so common note formats are
// visible and selectable; "All Files" keeps the picker usable for anything else.
export const FILE_FILTERS = [
  { name: 'Markdown', extensions: ['md', 'markdown', 'txt'] },
  { name: 'All Files', extensions: ['*'] },
];

export class FileService {
  static async openFile(): Promise<FileResult | null> {
    const path = await open({
      filters: FILE_FILTERS,
      multiple: false,
    });

    if (!path || typeof path !== 'string') return null;

    // 使用 LargeFileService 加载文件，自动检测大文件并按需分块。
    // 文件监听由 useExternalFileChange 根据 currentPath 统一接管。
    return LargeFileService.loadFile(path);
  }

  static async saveFile(path: string, content: string): Promise<void> {
    // Suppress the file-changed echo produced by our own write.
    FileWatcherService.notifySelfSave();
    await safeInvoke('save_file', { path, content });
  }

  static async newFile(): Promise<string | null> {
    const path = await save({
      filters: FILE_FILTERS,
      defaultPath: 'untitled.md',
    });

    return typeof path === 'string' ? path : null;
  }

  static async fileExists(path: string): Promise<boolean> {
    return await safeInvoke<boolean>('file_exists', { path });
  }

  /** Read raw file content from disk without touching the editor state. */
  static async readFile(path: string): Promise<string> {
    return await safeInvoke<string>('read_file', { path });
  }
}