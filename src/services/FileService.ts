import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';

export interface FileResult {
  path: string;
  content: string;
}

export class FileService {
  static async openFile(): Promise<FileResult | null> {
    const path = await open({
      filters: [{ name: 'Markdown', extensions: ['md'] }],
      multiple: false,
    });

    if (!path || typeof path !== 'string') return null;

    const content = await invoke<string>('read_file', { path });
    return { path, content };
  }

  static async saveFile(path: string, content: string): Promise<void> {
    await invoke('save_file', { path, content });
  }

  static async newFile(): Promise<string | null> {
    const path = await save({
      filters: [{ name: 'Markdown', extensions: ['md'] }],
      defaultPath: 'untitled.md',
    });

    return typeof path === 'string' ? path : null;
  }

  static async fileExists(path: string): Promise<boolean> {
    return await invoke<boolean>('file_exists', { path });
  }
}