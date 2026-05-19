import { describe, it, expect } from 'vitest';
import { SearchService } from '../services/SearchService';

describe('SearchService', () => {
  describe('findInDocument', () => {
    it('finds all matches of a word', () => {
      const results = SearchService.findInDocument(
        'hello world hello universe',
        'hello'
      );

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ from: 0, to: 5, text: 'hello' });
      expect(results[1]).toEqual({ from: 12, to: 17, text: 'hello' });
    });

    it('returns empty array for empty query', () => {
      const results = SearchService.findInDocument('hello world', '');

      expect(results).toEqual([]);
    });

    it('returns empty array for whitespace-only query', () => {
      const results = SearchService.findInDocument('hello world', '   ');

      expect(results).toEqual([]);
    });

    it('returns empty array when there are no matches', () => {
      const results = SearchService.findInDocument('hello world', 'xyz');

      expect(results).toEqual([]);
    });

    it('is case-insensitive', () => {
      const results = SearchService.findInDocument('Hello World hello', 'hello');

      expect(results).toHaveLength(2);
    });

    it('escapes regex special characters by default', () => {
      // Special chars like '.' are escaped, so '.' matches only a literal dot.
      const results = SearchService.findInDocument('hello.world', '.');

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({ from: 5, to: 6, text: '.' });
    });

    it('supports raw regex with useRegex option', () => {
      // When useRegex is true, special chars are NOT escaped and work as regex.
      const results = SearchService.findInDocument('hello world', '.+', {
        useRegex: true,
      });

      expect(results).toHaveLength(1);
      expect(results[0].text).toBe('hello world');
    });

    it('finds matches in multiline content', () => {
      const results = SearchService.findInDocument(
        'line one\nline two\nanother line',
        'line'
      );

      expect(results).toHaveLength(3);
    });
  });

  describe('highlightMatches', () => {
    it('wraps matches in <mark> tags', () => {
      const result = SearchService.highlightMatches(
        'hello world hello',
        'hello'
      );

      expect(result).toBe(
        '<mark class="search-highlight">hello</mark> world <mark class="search-highlight">hello</mark>'
      );
    });

    it('returns original content for empty query', () => {
      const result = SearchService.highlightMatches('hello world', '');

      expect(result).toBe('hello world');
    });

    it('returns original content for whitespace query', () => {
      const result = SearchService.highlightMatches('hello world', '  ');

      expect(result).toBe('hello world');
    });

    it('returns original content unchanged when there are no matches', () => {
      const result = SearchService.highlightMatches('hello world', 'xyz');

      expect(result).toBe('hello world');
    });
  });

  describe('replaceInDocument', () => {
    it('replaces all occurrences of the query', () => {
      const result = SearchService.replaceInDocument(
        'hello world hello universe',
        'hello',
        'hi'
      );

      expect(result).toBe('hi world hi universe');
    });

    it('returns original content for empty query', () => {
      const result = SearchService.replaceInDocument('hello world', '', 'x');

      expect(result).toBe('hello world');
    });

    it('returns original content when there are no matches', () => {
      const result = SearchService.replaceInDocument('hello world', 'xyz', 'abc');

      expect(result).toBe('hello world');
    });

    it('is case-insensitive', () => {
      const result = SearchService.replaceInDocument(
        'Hello World',
        'hello',
        'hi'
      );

      expect(result).toBe('hi World');
    });
  });

  describe('countMatches', () => {
    it('returns the correct count of matches', () => {
      const count = SearchService.countMatches(
        'the cat in the hat',
        'the'
      );

      expect(count).toBe(2);
    });

    it('returns 0 when there are no matches', () => {
      const count = SearchService.countMatches('hello world', 'xyz');

      expect(count).toBe(0);
    });

    it('returns 0 for empty query', () => {
      const count = SearchService.countMatches('hello world', '');

      expect(count).toBe(0);
    });

    it('is case-insensitive', () => {
      const count = SearchService.countMatches('Hello hello HELLO', 'hello');

      expect(count).toBe(3);
    });
  });
});
