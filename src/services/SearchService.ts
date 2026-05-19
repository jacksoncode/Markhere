import { readDir, readTextFile } from '@tauri-apps/plugin-fs';

export interface SearchResult {
  from: number;
  to: number;
  text: string;
}

export interface FileSearchResult {
  filePath: string;
  fileName: string;
  matches: SearchResult[];
}

export interface SearchOptions {
  useRegex: boolean;
  caseSensitive: boolean;
  fileExtensions: string[];
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class SearchService {
  static findInDocument(
    content: string,
    query: string,
    options?: Partial<SearchOptions>,
  ): SearchResult[] {
    if (!query.trim()) return [];

    const opts: SearchOptions = {
      useRegex: false,
      caseSensitive: false,
      fileExtensions: ['md'],
      ...options,
    };

    const results: SearchResult[] = [];

    try {
      const pattern = opts.useRegex ? query : escapeRegex(query);
      const flags = opts.caseSensitive ? 'g' : 'gi';
      const regex = new RegExp(pattern, flags);
      let match: RegExpExecArray | null;

      while ((match = regex.exec(content)) !== null) {
        results.push({
          from: match.index,
          to: match.index + match[0].length,
          text: match[0],
        });
      }
    } catch {
      return [];
    }

    return results;
  }

  static highlightMatches(
    content: string,
    query: string,
    options?: Partial<SearchOptions>,
  ): string {
    if (!query.trim()) return content;

    const opts: SearchOptions = {
      useRegex: false,
      caseSensitive: false,
      fileExtensions: ['md'],
      ...options,
    };

    try {
      const pattern = opts.useRegex ? query : escapeRegex(query);
      const flags = opts.caseSensitive ? 'g' : 'gi';
      const regex = new RegExp(`(${pattern})`, flags);
      return content.replace(regex, '<mark class="search-highlight">$1</mark>');
    } catch {
      return content;
    }
  }

  static replaceInDocument(
    content: string,
    query: string,
    replacement: string,
    options?: Partial<SearchOptions>,
  ): string {
    if (!query.trim()) return content;

    const opts: SearchOptions = {
      useRegex: false,
      caseSensitive: false,
      fileExtensions: ['md'],
      ...options,
    };

    try {
      const pattern = opts.useRegex ? query : escapeRegex(query);
      const flags = opts.caseSensitive ? 'g' : 'gi';
      const regex = new RegExp(pattern, flags);
      return content.replace(regex, replacement);
    } catch {
      return content;
    }
  }

  static countMatches(
    content: string,
    query: string,
    options?: Partial<SearchOptions>,
  ): number {
    if (!query.trim()) return 0;

    const opts: SearchOptions = {
      useRegex: false,
      caseSensitive: false,
      fileExtensions: ['md'],
      ...options,
    };

    try {
      const pattern = opts.useRegex ? query : escapeRegex(query);
      const flags = opts.caseSensitive ? 'g' : 'gi';
      const regex = new RegExp(pattern, flags);
      const matches = content.match(regex);
      return matches ? matches.length : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Extract a text snippet surrounding a match position for preview display.
   * @param content Full document content
   * @param from Match start index
   * @param to Match end index
   * @param contextChars Number of characters of context on each side (default 30)
   */
  static getContext(
    content: string,
    from: number,
    to: number,
    contextChars: number = 30,
  ): string {
    const start = Math.max(0, from - contextChars);
    const end = Math.min(content.length, to + contextChars);
    let context = content.substring(start, end);
    if (start > 0) context = '…' + context;
    if (end < content.length) context = context + '…';
    return context;
  }

  /**
   * Recursively search all files matching the extension filter in a directory.
   * @param dirPath Absolute path to the directory
   * @param query Search query string
   * @param options Search configuration (regex toggle, case sensitivity, file extensions)
   * @param onProgress Optional callback reporting (current, total) files scanned
   * @returns Array of FileSearchResult, one entry per file that had matches
   */
  static async searchInDirectory(
    dirPath: string,
    query: string,
    options?: Partial<SearchOptions>,
    onProgress?: (current: number, total: number) => void,
  ): Promise<FileSearchResult[]> {
    const opts: SearchOptions = {
      useRegex: false,
      caseSensitive: false,
      fileExtensions: ['md'],
      ...options,
    };

    if (!query.trim()) return [];

    const filePaths = await SearchService.collectFiles(dirPath, opts.fileExtensions);

    if (filePaths.length === 0) return [];

    const results: FileSearchResult[] = [];

    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i];
      onProgress?.(i + 1, filePaths.length);

      try {
        const content = await readTextFile(filePath);
        const matches = SearchService.findInDocument(content, query, opts);

        if (matches.length > 0) {
          results.push({
            filePath,
            fileName: filePath.split('/').pop() || filePath,
            matches,
          });
        }
      } catch {
        // Skip files that cannot be read (permissions, binary, etc.)
      }
    }

    return results;
  }

  /**
   * Recursively collect all file paths matching the given extensions under dirPath.
   * Skips hidden directories (starting with '.') and node_modules.
   */
  private static async collectFiles(
    dirPath: string,
    extensions: string[],
  ): Promise<string[]> {
    const filePaths: string[] = [];

    try {
      const entries = await readDir(dirPath);

      for (const entry of entries) {
        const separator = dirPath.endsWith('/') ? '' : '/';
        const fullPath = `${dirPath}${separator}${entry.name}`;

        if (entry.isDirectory) {
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            const subFiles = await SearchService.collectFiles(fullPath, extensions);
            filePaths.push(...subFiles);
          }
        } else if (entry.isFile) {
          const ext = entry.name.split('.').pop()?.toLowerCase() || '';
          if (extensions.includes(ext)) {
            filePaths.push(fullPath);
          }
        }
      }
    } catch {
      // Skip directories that cannot be read (permissions, etc.)
    }

    return filePaths;
  }

  /**
   * Returns a debounced version of the provided function.
   * The returned function delays invoking fn until after `delay` milliseconds
   * have elapsed since the last invocation.
   */
  static debounce<T extends (...args: any[]) => void>(
    fn: T,
    delay: number,
  ): (...args: Parameters<T>) => void {
    let timer: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<T>): void => {
      if (timer !== null) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => {
        timer = null;
        fn(...args);
      }, delay);
    };
  }
}
