import { describe, it, expect, beforeEach } from 'vitest';
import { VersionHistory } from './VersionHistory';

describe('VersionHistory', () => {
  beforeEach(() => {
    VersionHistory.clearFor('/test.md');
    VersionHistory.stopAutoSave();
  });

  it('saves and retrieves versions', () => {
    VersionHistory.tagVersion('/test.md', '# v1', 'Milestone 1');
    VersionHistory.tagVersion('/test.md', '# v2', 'Milestone 2');

    const versions = VersionHistory.getVersionsFor('/test.md');
    expect(versions).toHaveLength(2);
    expect(versions[0].label).toBe('Milestone 2'); // newest first
    expect(versions[0].wordCount).toBe(2); // '# v1' splits to ['#', 'v1']
  });

  it('compresses and decompresses content', () => {
    VersionHistory.tagVersion('/test.md', '# ' + 'x'.repeat(1000), 'compressed');
    const versions = VersionHistory.getVersionsFor('/test.md');
    const content = VersionHistory.getVersionContent(versions[0]);
    expect(content).toContain('# xxx');
  });

  it('diffs two versions', () => {
    const diff = VersionHistory.diff('line1\nline2', 'line1\nline2 modified\nline3');
    const types = diff.map(d => d.type);
    expect(types).toContain('same');
    expect(types).toContain('remove');
    expect(types).toContain('add');
  });

  it('caps at 50 versions', () => {
    for (let i = 0; i < 60; i++) {
      VersionHistory.tagVersion('/test.md', `# v${i}`, `v${i}`);
    }
    const versions = VersionHistory.getVersionsFor('/test.md');
    expect(versions.length).toBeLessThanOrEqual(50);
  });

  it('clears versions for a file', () => {
    VersionHistory.tagVersion('/test.md', '# test', 'clear-test');
    VersionHistory.clearFor('/test.md');
    expect(VersionHistory.getVersionsFor('/test.md')).toHaveLength(0);
  });

  it('diff to 100 lines works', () => {
    const diff = VersionHistory.diff('1\n2\n3\n4\n5', '1\n2\n3\n4\n6');
    expect(diff.length).toBeGreaterThan(0);
  });
});
