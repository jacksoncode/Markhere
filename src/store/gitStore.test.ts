import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks must be hoisted above all imports
// ---------------------------------------------------------------------------
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { useGitStore } from './gitStore';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('useGitStore', () => {
  beforeEach(() => {
    useGitStore.setState({
      isEnabled: false,
      loading: false,
      error: null,
      commits: [],
      currentDiff: null,
      selectedHash: null,
    });
    vi.mocked(invoke).mockClear();
  });

  // -----------------------------------------------------------------------
  // Initial state
  // -----------------------------------------------------------------------
  describe('initial state', () => {
    it('has empty commits array', () => {
      expect(useGitStore.getState().commits).toEqual([]);
    });

    it('has loading=false and error=null', () => {
      const { loading, error } = useGitStore.getState();
      expect(loading).toBe(false);
      expect(error).toBeNull();
    });

    it('has isEnabled=false', () => {
      expect(useGitStore.getState().isEnabled).toBe(false);
    });

    it('has null currentDiff and selectedHash', () => {
      const { currentDiff, selectedHash } = useGitStore.getState();
      expect(currentDiff).toBeNull();
      expect(selectedHash).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // loadHistory
  // -----------------------------------------------------------------------
  describe('loadHistory', () => {
    const mockCommits = [
      {
        hash: 'abc123def456',
        short_hash: 'abc123d',
        author: 'Jane Doe',
        date: '2025-01-15T10:30:00Z',
        message: 'Initial commit',
      },
      {
        hash: 'def789abc012',
        short_hash: 'def789a',
        author: 'John Smith',
        date: '2025-01-16T14:00:00Z',
        message: 'Add Markdown parser',
      },
    ];

    it('sets loading=true during async operation', async () => {
      vi.mocked(invoke).mockResolvedValueOnce(mockCommits);

      const { loadHistory } = useGitStore.getState();

      const promise = loadHistory('/path/to/file.md');

      // After calling, before await, loading should be true
      expect(useGitStore.getState().loading).toBe(true);

      await promise;
    });

    it('populates commits on success', async () => {
      vi.mocked(invoke).mockResolvedValueOnce(mockCommits);

      const { loadHistory } = useGitStore.getState();
      await loadHistory('/path/to/file.md');

      const state = useGitStore.getState();
      expect(state.commits).toEqual(mockCommits);
      expect(state.isEnabled).toBe(true);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('calls invoke with correct arguments', async () => {
      vi.mocked(invoke).mockResolvedValueOnce(mockCommits);

      const { loadHistory } = useGitStore.getState();
      await loadHistory('/documents/notes.md');

      expect(invoke).toHaveBeenCalledWith('get_git_history', {
        filePath: '/documents/notes.md',
      });
    });

    it('handles failure gracefully', async () => {
      vi.mocked(invoke).mockRejectedValueOnce(new Error('Not a git repository'));

      const { loadHistory } = useGitStore.getState();
      await loadHistory('/invalid/path.md');

      const state = useGitStore.getState();
      expect(state.commits).toEqual([]);
      expect(state.isEnabled).toBe(false);
      expect(state.loading).toBe(false);
    });

    it('does nothing when path is empty', async () => {
      const { loadHistory } = useGitStore.getState();
      await loadHistory('');

      expect(invoke).not.toHaveBeenCalled();
      expect(useGitStore.getState().loading).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // loadDiff
  // -----------------------------------------------------------------------
  describe('loadDiff', () => {
    const mockDiff = {
      old_content: '# Old\n',
      new_content: '# New\n## Added section\n',
      additions: 1,
      deletions: 0,
    };

    it('sets loading=true and clears previous error and diff', async () => {
      useGitStore.setState({
        error: 'Previous error',
        currentDiff: { old_content: '', new_content: '', additions: 0, deletions: 0 },
      });
      vi.mocked(invoke).mockResolvedValueOnce(mockDiff);

      const { loadDiff } = useGitStore.getState();
      const promise = loadDiff('/file.md', 'hash1', 'hash2');

      expect(useGitStore.getState().loading).toBe(true);
      expect(useGitStore.getState().error).toBeNull();
      expect(useGitStore.getState().currentDiff).toBeNull();

      await promise;
    });

    it('populates currentDiff on success', async () => {
      vi.mocked(invoke).mockResolvedValueOnce(mockDiff);

      const { loadDiff } = useGitStore.getState();
      await loadDiff('/file.md', 'abc123', 'def456');

      const state = useGitStore.getState();
      expect(state.currentDiff).toEqual(mockDiff);
      expect(state.loading).toBe(false);
    });

    it('sets error on failure', async () => {
      vi.mocked(invoke).mockRejectedValueOnce(new Error('Invalid commit hash'));

      const { loadDiff } = useGitStore.getState();
      await loadDiff('/file.md', 'badhash1', 'badhash2');

      const state = useGitStore.getState();
      expect(state.currentDiff).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.error).toContain('Invalid commit hash');
    });

    it('calls invoke with correct parameters', async () => {
      vi.mocked(invoke).mockResolvedValueOnce(mockDiff);

      const { loadDiff } = useGitStore.getState();
      await loadDiff('/notes.md', 'oldHash123', 'newHash456');

      expect(invoke).toHaveBeenCalledWith('get_git_diff', {
        filePath: '/notes.md',
        oldHash: 'oldHash123',
        newHash: 'newHash456',
      });
    });
  });

  // -----------------------------------------------------------------------
  // selectCommit
  // -----------------------------------------------------------------------
  describe('selectCommit', () => {
    it('sets selectedHash', () => {
      const { selectCommit } = useGitStore.getState();
      selectCommit('abc123');

      expect(useGitStore.getState().selectedHash).toBe('abc123');
    });

    it('allows setting selectedHash to null', () => {
      useGitStore.setState({ selectedHash: 'abc123' });

      const { selectCommit } = useGitStore.getState();
      selectCommit(null);

      expect(useGitStore.getState().selectedHash).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // clearDiff
  // -----------------------------------------------------------------------
  describe('clearDiff', () => {
    it('resets currentDiff and selectedHash to null', () => {
      useGitStore.setState({
        currentDiff: {
          old_content: 'old',
          new_content: 'new',
          additions: 5,
          deletions: 3,
        },
        selectedHash: 'abc123',
      });

      const { clearDiff } = useGitStore.getState();
      clearDiff();

      const state = useGitStore.getState();
      expect(state.currentDiff).toBeNull();
      expect(state.selectedHash).toBeNull();
    });
  });
});
