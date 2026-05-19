import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SearchService } from '../../services/SearchService';
import { readDir, readTextFile } from '@tauri-apps/plugin-fs';

// Mock Tauri FS module at the top level
vi.mock('@tauri-apps/plugin-fs', () => ({
  readDir: vi.fn(),
  readTextFile: vi.fn(),
}));

const MARKDOWN_CONTENT = `# Test Document

This is a sample markdown document.
It contains the word "search" multiple times.

## Search Section

We search for terms in this document.
The search function should find all occurrences.
Search is case-insensitive by default.

Another paragraph with SEARCH in uppercase.
And another with Search in title case.

\`\`\`javascript
// search in code block too
const result = "search string";
\`\`\`
`;

describe('Search Module', () => {
  describe('findInDocument', () => {
    it('returns correct matches in real markdown content', () => {
      const results = SearchService.findInDocument(MARKDOWN_CONTENT, 'search');

      expect(results.length).toBeGreaterThan(0);
      // Should find case-insensitive matches: "search", "Search", "SEARCH"
      // plus the ones in code block
      expect(results.every((r) => r.from < r.to)).toBe(true);
      expect(results.every((r) => r.text.length > 0)).toBe(true);
    });

    it('returns correct from/to positions for matches', () => {
      const results = SearchService.findInDocument(
        MARKDOWN_CONTENT,
        'sample',
      );

      expect(results.length).toBeGreaterThan(0);
      const match = results[0];
      const snippet = MARKDOWN_CONTENT.substring(match.from, match.to);
      expect(snippet).toBe('sample');
    });

    it('returns empty array for empty query', () => {
      const results = SearchService.findInDocument(MARKDOWN_CONTENT, '');
      expect(results).toEqual([]);
    });

    it('returns empty array for whitespace-only query', () => {
      const results = SearchService.findInDocument(MARKDOWN_CONTENT, '   ');
      expect(results).toEqual([]);
    });

    it('returns empty array for non-matching query', () => {
      const results = SearchService.findInDocument(
        MARKDOWN_CONTENT,
        'xyznonexistent123',
      );
      expect(results).toEqual([]);
    });
  });

  describe('highlightMatches', () => {
    it('wraps matches in <mark> tags with correct attributes', () => {
      const result = SearchService.highlightMatches(
        'Hello World, hello universe',
        'hello',
      );

      expect(result).toContain('<mark class="search-highlight">');
      expect(result).toContain('</mark>');
      // Should match both "Hello" and "hello" (case-insensitive default)
      const markCount = (result.match(/<mark class="search-highlight">/g) || [])
        .length;
      expect(markCount).toBe(2);
    });

    it('returns original content when query is empty', () => {
      const content = 'Some content';
      const result = SearchService.highlightMatches(content, '');
      expect(result).toBe(content);
    });

    it('escapes special regex characters when useRegex is false', () => {
      const result = SearchService.highlightMatches(
        'Price is $50.00 (discount)',
        '$50.00',
      );

      // $ and . should be escaped, so only literal "$50.00" is matched
      expect(result).toContain('<mark class="search-highlight">$50.00</mark>');
      expect(result).toBe(
        'Price is <mark class="search-highlight">$50.00</mark> (discount)',
      );
    });
  });

  describe('replaceInDocument', () => {
    it('replaces all occurrences of a query', () => {
      const result = SearchService.replaceInDocument(
        'cat dog cat bird cat',
        'cat',
        'tiger',
      );

      expect(result).toBe('tiger dog tiger bird tiger');
    });

    it('returns original content when query is empty', () => {
      const content = 'Some text here';
      const result = SearchService.replaceInDocument(
        content,
        '',
        'replacement',
      );
      expect(result).toBe(content);
    });

    it('replaces with case-sensitive option', () => {
      const result = SearchService.replaceInDocument(
        'Cat cat CAT cat',
        'cat',
        'dog',
        { caseSensitive: true },
      );

      // Only lowercase "cat" should be replaced
      expect(result).toBe('Cat dog CAT dog');
    });
  });

  describe('countMatches', () => {
    it('returns correct count', () => {
      const count = SearchService.countMatches(
        'apple banana Apple APPLE apricot',
        'apple',
      );

      // Default case-insensitive: should count apple, Apple, APPLE
      expect(count).toBe(3);
    });

    it('returns 0 for empty query', () => {
      const count = SearchService.countMatches('some text', '');
      expect(count).toBe(0);
    });

    it('respects caseSensitive option', () => {
      const count = SearchService.countMatches(
        'Test test TEST test',
        'test',
        { caseSensitive: true },
      );

      // Only lowercase "test" should be counted
      expect(count).toBe(2);
    });
  });

  describe('getContext', () => {
    it('returns surrounding text for a match', () => {
      const content =
        'This is a long document with some searching capability built in. The target word is somewhere in the middle of this text.';
      // "target" starts at a known position
      const targetFrom = content.indexOf('target');
      const targetTo = targetFrom + 'target'.length;

      const context = SearchService.getContext(content, targetFrom, targetTo);

      expect(context).toContain('target');
      expect(context.startsWith('…')).toBe(true);
      expect(context.endsWith('…')).toBe(true);
    });

    it('does not prepend ellipsis when match is near start', () => {
      const content = 'Start of document with some stuff';
      // "Start" starts at position 0
      const context = SearchService.getContext(content, 0, 5);

      expect(context).toContain('Start');
      expect(context.startsWith('…')).toBe(false);
    });

    it('does not append ellipsis when match is near end', () => {
      const content = 'some stuff at the end';
      const endFrom = content.indexOf('end');
      const endTo = endFrom + 'end'.length;

      const context = SearchService.getContext(content, endFrom, endTo);

      expect(context).toContain('end');
      expect(context.endsWith('…')).toBe(false);
    });
  });

  describe('SearchOptions', () => {
    it('useRegex=true enables regex patterns', () => {
      // Match "cat" or "dog" with regex alternation
      const results = SearchService.findInDocument(
        'cat dog bird',
        'cat|dog',
        { useRegex: true },
      );

      expect(results).toHaveLength(2);
      expect(results[0].text).toBe('cat');
      expect(results[1].text).toBe('dog');
    });

    it('useRegex=false escapes special regex characters', () => {
      // With useRegex=false, "cat|dog" is treated as literal text
      const results = SearchService.findInDocument(
        'cat|dog bird',
        'cat|dog',
        { useRegex: false },
      );

      // Should find the literal string "cat|dog"
      expect(results).toHaveLength(1);
      expect(results[0].text).toBe('cat|dog');
    });

    it('caseSensitive option works correctly', () => {
      const caseSensitive = SearchService.findInDocument(
        'Hello HELLO hello',
        'hello',
        { caseSensitive: true },
      );

      const caseInsensitive = SearchService.findInDocument(
        'Hello HELLO hello',
        'hello',
        { caseSensitive: false },
      );

      expect(caseSensitive).toHaveLength(1);
      expect(caseInsensitive).toHaveLength(3);
    });
  });

  describe('Combined flow', () => {
    it('find → get context → highlight produces consistent results', () => {
      const content = `# Project Overview

This project is a Markdown editor built for cross-platform use.
It supports real-time search and replace functionality.
The search engine is optimized for large documents.`;

      const query = 'search';

      // Step 1: Find matches
      const matches = SearchService.findInDocument(content, query);
      expect(matches.length).toBeGreaterThan(0);

      // Step 2: Get context for each match
      for (const match of matches) {
        const context = SearchService.getContext(
          content,
          match.from,
          match.to,
        );
        expect(context).toContain(query.toLowerCase());
      }

      // Step 3: Highlight matches
      const highlighted = SearchService.highlightMatches(content, query);
      expect(highlighted).toContain('<mark class="search-highlight">');
      // The highlighted content should contain the original text (plus markup)
      const strippedHighlight = highlighted.replace(/<[^>]+>/g, '');
      expect(strippedHighlight).toBe(content);
    });
  });

  describe('searchInDirectory', () => {
    const mockFiles: Record<string, string> = {
      '/test/dir/file1.md': '# Alpha\n## Searchable\nhello world',
      '/test/dir/file2.md': '# Beta\nNo results here',
      '/test/dir/subdir/file3.md': '# Gamma\nAnother searchable file',
    };

    beforeEach(() => {
      vi.clearAllMocks();

      // Setup readDir mock to handle recursive directory scanning
      (readDir as ReturnType<typeof vi.fn>).mockImplementation(
        async (dirPath: string) => {
          if (dirPath === '/test/dir') {
            return [
              { name: 'file1.md', isDirectory: false, isFile: true },
              { name: 'file2.md', isDirectory: false, isFile: true },
              { name: 'subdir', isDirectory: true, isFile: false },
              { name: '.hidden', isDirectory: true, isFile: false },
              { name: 'node_modules', isDirectory: true, isFile: false },
              { name: 'image.png', isDirectory: false, isFile: true },
            ];
          }
          if (dirPath === '/test/dir/subdir') {
            return [
              { name: 'file3.md', isDirectory: false, isFile: true },
            ];
          }
          return [];
        },
      );

      // Setup readTextFile mock
      (readTextFile as ReturnType<typeof vi.fn>).mockImplementation(
        async (filePath: string) => {
          return mockFiles[filePath] || '';
        },
      );
    });

    it('searches across a mock file collection and returns results', async () => {
      const results = await SearchService.searchInDirectory(
        '/test/dir',
        'searchable',
        { fileExtensions: ['md'] },
      );

      // Should find matches in file1.md and file3.md, not in file2.md
      expect(results).toHaveLength(2);
      expect(results.map((r) => r.fileName).sort()).toEqual([
        'file1.md',
        'file3.md',
      ]);

      // Verify match details for file1
      const file1 = results.find((r) => r.fileName === 'file1.md')!;
      expect(file1.matches.length).toBeGreaterThan(0);
      expect(file1.matches[0].text).toBeDefined();
    });

    it('reports progress via onProgress callback', async () => {
      const progressCalls: Array<{ current: number; total: number }> = [];
      const onProgress = (current: number, total: number) => {
        progressCalls.push({ current, total });
      };

      await SearchService.searchInDirectory(
        '/test/dir',
        'searchable',
        { fileExtensions: ['md'] },
        onProgress,
      );

      // Progress should be reported for each scanned file
      expect(progressCalls.length).toBe(3); // file1.md, file2.md, file3.md
      // Final call should indicate all files scanned
      expect(progressCalls[progressCalls.length - 1].current).toBe(3);
      expect(progressCalls[progressCalls.length - 1].total).toBe(3);
    });

    it('returns empty array when no files match', async () => {
      const results = await SearchService.searchInDirectory(
        '/test/dir',
        'nonexistent',
        { fileExtensions: ['md'] },
      );

      expect(results).toEqual([]);
    });

    it('returns empty array for empty query', async () => {
      const results = await SearchService.searchInDirectory(
        '/test/dir',
        '',
        { fileExtensions: ['md'] },
      );

      expect(results).toEqual([]);
    });

    it('filters files by extension', async () => {
      const results = await SearchService.searchInDirectory(
        '/test/dir',
        'hello',
        { fileExtensions: ['png'] },
      );

      // No files match the png extension filter (image.png has no matching content anyway)
      expect(results).toEqual([]);

      // Verify readDir was called with the directory path at least once
      expect(readDir).toHaveBeenCalledWith('/test/dir');
    });
  });
});
