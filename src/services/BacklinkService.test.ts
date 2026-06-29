import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the IPC layer the service depends on.
const invokeMock = vi.fn();
vi.mock('./ipcWrapper', () => ({
  safeInvoke: (cmd: string, args?: any) => invokeMock(cmd, args),
}));

import { BacklinkService, noteKey } from './BacklinkService';

const FILES: Record<string, string> = {
  '/vault/index.md': 'See [[Project Alpha]] and [[Notes]].',
  '/vault/project alpha.md': 'Alpha details. Links back to [[Index]].',
  '/vault/notes.md': 'Random notes, no links.',
  '/vault/orphan.md': 'Mentions [[Project Alpha|the alpha project]].',
};

beforeEach(() => {
  BacklinkService.reset();
  invokeMock.mockReset();
  invokeMock.mockImplementation((cmd: string, args?: any) => {
    if (cmd === 'list_markdown_files') return Promise.resolve(Object.keys(FILES));
    if (cmd === 'read_file') return Promise.resolve(FILES[args.path] ?? '');
    return Promise.resolve(null);
  });
});

describe('noteKey', () => {
  it('strips directory and extension and lowercases', () => {
    expect(noteKey('/vault/Project Alpha.md')).toBe('project alpha');
    expect(noteKey('C:\\notes\\Foo.markdown')).toBe('foo');
  });
});

describe('BacklinkService', () => {
  it('indexes all wiki links across the workspace', async () => {
    await BacklinkService.buildIndex('/vault');
    // index.md: 2 links, project alpha.md: 1, orphan.md: 1 = 4
    expect(BacklinkService.size).toBe(4);
  });

  it('resolves backlinks by note name, case-insensitive', async () => {
    await BacklinkService.buildIndex('/vault');
    const back = BacklinkService.getBacklinks('/vault/project alpha.md');
    // index.md and orphan.md both link to "Project Alpha"
    const sources = back.map((r) => r.sourcePath).sort();
    expect(sources).toEqual(['/vault/index.md', '/vault/orphan.md']);
  });

  it('excludes self-links from backlinks', async () => {
    await BacklinkService.buildIndex('/vault');
    const back = BacklinkService.getBacklinks('/vault/index.md');
    // project alpha.md links to [[Index]] → 1 backlink, not index.md itself
    expect(back).toHaveLength(1);
    expect(back[0].sourcePath).toBe('/vault/project alpha.md');
  });

  it('resolves outlinks from the current file', async () => {
    await BacklinkService.buildIndex('/vault');
    const out = BacklinkService.getOutlinks('/vault/index.md');
    expect(out.map((r) => r.target).sort()).toEqual(['Notes', 'Project Alpha']);
  });

  it('captures the alias target before the pipe', async () => {
    await BacklinkService.buildIndex('/vault');
    const out = BacklinkService.getOutlinks('/vault/orphan.md');
    expect(out).toHaveLength(1);
    expect(out[0].target).toBe('Project Alpha');
  });
});
