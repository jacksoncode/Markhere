import { safeInvoke } from './ipcWrapper';
import { useUIState } from '../store/uiStore';

const DEV = import.meta.env.DEV;

export interface FileResult {
  path: string;
  content: string;
}

export class LargeFileService {
  private static readonly CHUNK_SIZE = 1024 * 1024; // 1MB
  private static readonly LARGE_FILE_THRESHOLD = 5 * 1024 * 1024; // 5MB

  static async loadFile(path: string): Promise<FileResult | null> {
    try {
      const fileSize = await safeInvoke<number>('get_file_size', { path });

      if (DEV) console.debug(`📄 Loading file: ${path} (${this.formatFileSize(fileSize)})`);

      if (fileSize < this.LARGE_FILE_THRESHOLD) {
        return this.loadSmallFile(path);
      }
      return this.loadLargeFile(path, fileSize);
    } catch (error) {
      if (DEV) console.error('Failed to load file:', error);
      useUIState.getState().showError(`Failed to load file: ${error}`);
      return null;
    }
  }

  private static async loadSmallFile(path: string): Promise<FileResult> {
    const content = await safeInvoke<string>('read_file', { path });
    return { path, content };
  }

  private static async loadLargeFile(
    path: string,
    fileSize: number
  ): Promise<FileResult> {
    const startTime = performance.now();

    useUIState.getState().setLoadingMessage('Loading large file...');
    useUIState.getState().setLoadingProgress(0);

    const chunks: string[] = [];
    const totalChunks = Math.ceil(fileSize / this.CHUNK_SIZE);

    if (DEV) console.debug(`📦 Loading in ${totalChunks} chunks...`);

    for (let i = 0; i < totalChunks; i++) {
      const chunk = await safeInvoke<string>('read_file_chunk', {
        path,
        offset: i * this.CHUNK_SIZE,
        length: this.CHUNK_SIZE,
      });
      chunks.push(chunk);
      useUIState.getState().setLoadingProgress(((i + 1) / totalChunks) * 100);

      // Yield to keep UI responsive
      if (i % 5 === 0) await new Promise(resolve => setTimeout(resolve, 0));
    }

    const content = chunks.join('');
    const loadTime = performance.now() - startTime;

    if (DEV) console.debug(`✅ Loaded ${this.formatFileSize(fileSize)} in ${loadTime.toFixed(0)}ms`);
    if (loadTime > 5000 && DEV) console.warn(`⚠️ Slow file load: ${loadTime}ms for ${fileSize} bytes`);

    useUIState.getState().setLoadingProgress(100);
    useUIState.getState().setLoadingMessage('');

    return { path, content };
  }

  private static formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
}
