import { describe, it, expect, beforeEach } from 'vitest';
import { useStarStore } from './starStore';

describe('StarStore', () => {
  beforeEach(() => useStarStore.setState({ starred: [] }));

  it('toggles star on a file', () => {
    useStarStore.getState().toggle('/notes/test.md');
    expect(useStarStore.getState().isStarred('/notes/test.md')).toBe(true);
    useStarStore.getState().toggle('/notes/test.md');
    expect(useStarStore.getState().isStarred('/notes/test.md')).toBe(false);
  });

  it('returns all starred files', () => {
    useStarStore.getState().toggle('/a.md');
    useStarStore.getState().toggle('/b.md');
    expect(useStarStore.getState().getAll()).toEqual(['/a.md', '/b.md']);
  });
});
