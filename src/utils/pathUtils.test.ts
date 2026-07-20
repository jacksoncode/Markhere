import { describe, it, expect } from 'vitest';
import { basenameOf, fileNameOf } from './pathUtils';

describe('pathUtils (cross-platform)', () => {
  it('extracts basename on Windows backslash paths', () => {
    expect(basenameOf('C:\\Users\\alice\\notes\\Idea.md')).toBe('Idea.md');
    expect(basenameOf('D:\\a.md')).toBe('a.md');
  });

  it('extracts basename on POSIX forward-slash paths', () => {
    expect(basenameOf('/home/user/docs/readme.md')).toBe('readme.md');
    expect(basenameOf('/a/b/c.txt')).toBe('c.txt');
  });

  it('strips the markdown/text extension for fileNameOf on both platforms', () => {
    expect(fileNameOf('C:\\Users\\alice\\Idea.md')).toBe('Idea');
    expect(fileNameOf('/home/user/readme.markdown')).toBe('readme');
    expect(fileNameOf('/home/user/note.txt')).toBe('note');
  });

  it('handles empty / null / undefined input', () => {
    expect(basenameOf('')).toBe('');
    expect(basenameOf(null)).toBe('');
    expect(basenameOf(undefined)).toBe('');
    expect(fileNameOf('')).toBe('');
  });

  it('does not choke on paths that have no extension', () => {
    expect(basenameOf('C:\\Users\\alice\\Makefile')).toBe('Makefile');
    expect(fileNameOf('C:\\Users\\alice\\Makefile')).toBe('Makefile');
  });
});
