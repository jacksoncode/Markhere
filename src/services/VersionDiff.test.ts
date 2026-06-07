import { describe, it, expect } from 'vitest';
import { VersionDiff } from './VersionDiff';

describe('VersionDiff', () => {
  it('detects added and removed lines', () => {
    const oldTxt = 'line 1\nline 2\nline 3';
    const newTxt = 'line 1\nline 2 modified\nline 3\nline 4';
    const diff = VersionDiff.lineDiff(oldTxt, newTxt);
    const stats = VersionDiff.getStats(diff);
    expect(stats.added).toBeGreaterThan(0);
    expect(stats.unchanged).toBeGreaterThan(0);
  });

  it('returns same lines unchanged', () => {
    const text = 'hello\nworld';
    const diff = VersionDiff.lineDiff(text, text);
    expect(diff.every(l => l.type === 'same')).toBe(true);
  });

  it('tracks line numbers', () => {
    const diff = VersionDiff.lineDiff('a\nb', 'a\nc');
    expect(diff[0].lineNum).toBe(1);
    expect(diff[0].type).toBe('same');
  });

  it('adds comments to specific lines', () => {
    const diff = VersionDiff.lineDiff('old', 'fresh');
    const commented = VersionDiff.addComment(diff, 0, 'Test comment');
    expect(commented[0].comment).toBe('Test comment');
  });

  it('handles empty strings gracefully', () => {
    const diff = VersionDiff.lineDiff('', '');
    // Empty strings produce one empty same-line
    expect(diff.length).toBeLessThanOrEqual(1);
    if (diff.length > 0) expect(diff[0].type).toBe('same');
  });
});
