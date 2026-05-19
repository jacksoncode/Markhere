import { describe, it, expect, beforeEach } from 'vitest';
import { useAutoSaveStore, formatTimeAgo, shouldRecover } from '../store/autoSaveStore';

const initialState = {
  content: '',
  lastSaved: null,
  currentPath: null,
  hasUnsavedChanges: false,
  drafts: [],
  autoSaveEnabled: true,
  autoSaveInterval: 30000,
};

describe('useAutoSaveStore', () => {
  beforeEach(() => {
    useAutoSaveStore.setState({ ...initialState });
  });

  describe('saveBackup', () => {
    it('stores content, path, and lastSaved', () => {
      const { saveBackup } = useAutoSaveStore.getState();

      saveBackup('# My Document', '/test/doc.md');

      const state = useAutoSaveStore.getState();
      expect(state.content).toBe('# My Document');
      expect(state.currentPath).toBe('/test/doc.md');
      expect(state.lastSaved).toBeGreaterThan(0);
      expect(state.hasUnsavedChanges).toBe(false);
    });

    it('handles null path', () => {
      const { saveBackup } = useAutoSaveStore.getState();

      saveBackup('# Content', null);

      const state = useAutoSaveStore.getState();
      expect(state.content).toBe('# Content');
      expect(state.currentPath).toBeNull();
    });
  });

  describe('clearBackup', () => {
    it('resets all state to defaults', () => {
      const { saveBackup, clearBackup } = useAutoSaveStore.getState();

      saveBackup('# Doc', '/test/doc.md');
      useAutoSaveStore.getState().markDirty();

      clearBackup();

      const state = useAutoSaveStore.getState();
      expect(state.content).toBe('');
      expect(state.lastSaved).toBeNull();
      expect(state.currentPath).toBeNull();
      expect(state.hasUnsavedChanges).toBe(false);
    });
  });

  describe('markDirty / markSaved', () => {
    it('markDirty sets hasUnsavedChanges to true', () => {
      const { markDirty } = useAutoSaveStore.getState();

      markDirty();

      expect(useAutoSaveStore.getState().hasUnsavedChanges).toBe(true);
    });

    it('markSaved clears hasUnsavedChanges and updates lastSaved', () => {
      const { markDirty, markSaved } = useAutoSaveStore.getState();

      markDirty();
      expect(useAutoSaveStore.getState().hasUnsavedChanges).toBe(true);

      markSaved();

      const state = useAutoSaveStore.getState();
      expect(state.hasUnsavedChanges).toBe(false);
      expect(state.lastSaved).toBeGreaterThan(0);
    });
  });

  describe('saveDraft', () => {
    it('creates a draft with correct structure', () => {
      const { saveDraft } = useAutoSaveStore.getState();

      const draftId = saveDraft('# My Draft', '/test/draft.md', 'My Draft');

      const state = useAutoSaveStore.getState();
      expect(state.drafts).toHaveLength(1);

      const draft = state.drafts[0];
      expect(draft.id).toBe(draftId);
      expect(draft.content).toBe('# My Draft');
      expect(draft.path).toBe('/test/draft.md');
      expect(draft.title).toBe('My Draft');
      expect(draft.timestamp).toBeGreaterThan(0);
      expect(state.lastSaved).toBeGreaterThan(0);
    });

    it('uses filename as title when no title is provided', () => {
      const { saveDraft } = useAutoSaveStore.getState();

      saveDraft('# Content', '/test/myfile.md');

      const draft = useAutoSaveStore.getState().drafts[0];
      expect(draft.title).toBe('myfile.md');
    });

    it('uses "Untitled" as title when no path or title is provided', () => {
      const { saveDraft } = useAutoSaveStore.getState();

      saveDraft('# Content');

      const draft = useAutoSaveStore.getState().drafts[0];
      expect(draft.title).toBe('Untitled');
    });

    it('returns the draft id', () => {
      const { saveDraft } = useAutoSaveStore.getState();

      const id = saveDraft('# Content');

      expect(id).toBeTruthy();
      expect(typeof id).toBe('string');
      expect(id.startsWith('draft_')).toBe(true);
    });

    it('prepends new drafts to the list', () => {
      const { saveDraft } = useAutoSaveStore.getState();

      saveDraft('# First');
      saveDraft('# Second');

      const drafts = useAutoSaveStore.getState().drafts;
      expect(drafts).toHaveLength(2);
      expect(drafts[0].content).toBe('# Second');
      expect(drafts[1].content).toBe('# First');
    });
  });

  describe('deleteDraft', () => {
    it('removes a draft by id', () => {
      const { saveDraft, deleteDraft } = useAutoSaveStore.getState();

      const id1 = saveDraft('# Draft 1');
      const id2 = saveDraft('# Draft 2');

      deleteDraft(id1);

      const state = useAutoSaveStore.getState();
      expect(state.drafts).toHaveLength(1);
      expect(state.drafts[0].id).toBe(id2);
    });

    it('does nothing when deleting a non-existent id', () => {
      const { saveDraft, deleteDraft } = useAutoSaveStore.getState();

      saveDraft('# Draft');
      deleteDraft('non-existent-id');

      expect(useAutoSaveStore.getState().drafts).toHaveLength(1);
    });
  });

  describe('getRecentDrafts', () => {
    it('returns drafts within the expiry period', () => {
      const { saveDraft, getRecentDrafts } = useAutoSaveStore.getState();

      saveDraft('# Recent');

      const recent = getRecentDrafts();
      expect(recent).toHaveLength(1);
      expect(recent[0].content).toBe('# Recent');
    });

    it('filters out expired drafts (older than 7 days)', () => {
      const now = Date.now();
      const eightDaysAgo = now - 8 * 24 * 60 * 60 * 1000;

      // Manually inject an expired draft into the store state
      useAutoSaveStore.setState(() => ({
        drafts: [
          {
            id: 'expired-draft',
            content: '# Expired',
            timestamp: eightDaysAgo,
            title: 'Expired',
          },
          {
            id: 'recent-draft',
            content: '# Recent',
            timestamp: now,
            title: 'Recent',
          },
        ],
      }));

      const { getRecentDrafts } = useAutoSaveStore.getState();
      const recent = getRecentDrafts();

      expect(recent).toHaveLength(1);
      expect(recent[0].id).toBe('recent-draft');
    });

    it('respects the limit parameter', () => {
      useAutoSaveStore.setState(() => ({
        drafts: [
          { id: '1', content: '#1', timestamp: Date.now(), title: 'One' },
          { id: '2', content: '#2', timestamp: Date.now(), title: 'Two' },
          { id: '3', content: '#3', timestamp: Date.now(), title: 'Three' },
        ],
      }));

      const { getRecentDrafts } = useAutoSaveStore.getState();
      const limited = getRecentDrafts(2);

      expect(limited).toHaveLength(2);
    });
  });

  describe('MAX_DRAFTS limit', () => {
    it('enforces the maximum number of drafts (20)', () => {
      const { saveDraft } = useAutoSaveStore.getState();

      for (let i = 0; i < 25; i++) {
        saveDraft(`# Draft ${i}`);
      }

      const state = useAutoSaveStore.getState();
      expect(state.drafts.length).toBeLessThanOrEqual(20);
    });
  });

  describe('setAutoSaveEnabled', () => {
    it('toggles autoSaveEnabled', () => {
      const { setAutoSaveEnabled } = useAutoSaveStore.getState();

      setAutoSaveEnabled(false);
      expect(useAutoSaveStore.getState().autoSaveEnabled).toBe(false);

      setAutoSaveEnabled(true);
      expect(useAutoSaveStore.getState().autoSaveEnabled).toBe(true);
    });
  });

  describe('setAutoSaveInterval', () => {
    it('updates the auto-save interval', () => {
      const { setAutoSaveInterval } = useAutoSaveStore.getState();

      setAutoSaveInterval(60000);

      expect(useAutoSaveStore.getState().autoSaveInterval).toBe(60000);
    });
  });
});

describe('formatTimeAgo', () => {
  it('returns empty string for null timestamp', () => {
    expect(formatTimeAgo(null)).toBe('');
  });

  it('returns seconds for timestamps under 60 seconds ago', () => {
    const ts = Date.now() - 30 * 1000;
    const result = formatTimeAgo(ts);
    expect(result).toMatch(/^\d+s ago$/);
  });

  it('returns minutes for timestamps under 3600 seconds ago', () => {
    const ts = Date.now() - 5 * 60 * 1000;
    const result = formatTimeAgo(ts);
    expect(result).toMatch(/^\d+m ago$/);
  });

  it('returns hours for timestamps under 86400 seconds ago', () => {
    const ts = Date.now() - 3 * 3600 * 1000;
    const result = formatTimeAgo(ts);
    expect(result).toMatch(/^\d+h ago$/);
  });

  it('returns days for timestamps 86400 seconds or more ago', () => {
    const ts = Date.now() - 5 * 86400 * 1000;
    const result = formatTimeAgo(ts);
    expect(result).toMatch(/^\d+d ago$/);
  });
});

describe('shouldRecover', () => {
  function makeState(overrides: Partial<ReturnType<typeof useAutoSaveStore.getState>>) {
    return { ...initialState, ...overrides } as ReturnType<typeof useAutoSaveStore.getState>;
  }

  it('returns true when content exists and has unsaved changes', () => {
    expect(shouldRecover(makeState({ content: 'text', hasUnsavedChanges: true }))).toBe(true);
  });

  it('returns false when content is empty', () => {
    expect(shouldRecover(makeState({ content: '', hasUnsavedChanges: true }))).toBe(false);
  });

  it('returns false when there are no unsaved changes', () => {
    expect(shouldRecover(makeState({ content: 'text', hasUnsavedChanges: false }))).toBe(false);
  });

  it('returns false when both content is empty and no unsaved changes', () => {
    expect(shouldRecover(makeState({ content: '', hasUnsavedChanges: false }))).toBe(false);
  });
});
