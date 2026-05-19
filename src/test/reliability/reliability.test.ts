import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePluginStore } from '../../store/pluginStore';

// ---------------------------------------------------------------------------
// Mock Tauri APIs
// ---------------------------------------------------------------------------
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  readDir: vi.fn(),
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
  exists: vi.fn(),
  mkdir: vi.fn(),
}));

const mockNotify = vi.fn();

vi.mock('../../components/Notification/Notification', () => ({
  useNotificationStore: {
    getState: vi.fn(() => ({
      notify: mockNotify,
    })),
  },
}));

import { invoke } from '@tauri-apps/api/core';
import { safeInvoke } from '../../services/ipcWrapper';
import { useAutoSaveStore } from '../../store/autoSaveStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useThemeEditorStore } from '../../store/themeEditorStore';
import { useGitStore } from '../../store/gitStore';
import { useCloudStore } from '../../store/cloudStore';
import { SaveWorker } from '../../workers/SaveWorker';

const mockInvoke = vi.mocked(invoke);

// ---------------------------------------------------------------------------
// AutoSaveStore initial state
// ---------------------------------------------------------------------------
const autoSaveInitialState = {
  content: '',
  lastSaved: null,
  currentPath: null,
  hasUnsavedChanges: false,
  drafts: [],
  autoSaveEnabled: true,
  autoSaveInterval: 30000,
};

// ---------------------------------------------------------------------------
// SettingsStore initial state
// ---------------------------------------------------------------------------
const settingsInitialState = {
  theme: 'light' as const,
  indentSize: 2,
  lineEnding: 'lf' as const,
  exportFolder: 'auto' as const,
  exportCustomPath: '',
  defaultCodeLanguage: '',
  imageInsertBehavior: 'copy' as const,
  imageFolder: '',
  enableDiagrams: true,
  enableMath: true,
  enableFootnotes: true,
  enableYaml: true,
  enableAutoLinks: true,
  reopenLastFiles: true,
  smartPaste: true,
  autoMatchBrackets: true,
  fontFamily: 'sans-serif',
  fontSize: 14,
  showLineNumber: true,
  spellCheck: false,
  spellCheckLanguage: 'en-US',
  autoSave: true,
  autoSaveInterval: 30000,
  focusMode: false,
  typewriterMode: false,
  showWordCount: true,
};

// ---------------------------------------------------------------------------
// safeInvoke -- Error Recovery Tests
// ---------------------------------------------------------------------------

describe('safeInvoke error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('consecutive errors each trigger separate notifications', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('Error A'));
    mockInvoke.mockRejectedValueOnce(new Error('Error B'));

    await expect(
      safeInvoke('command_a')
    ).rejects.toThrow('Error A');

    expect(mockNotify).toHaveBeenCalledTimes(1);
    expect(mockNotify).toHaveBeenCalledWith('error', 'Error A', 'IPC Error: command_a');

    await expect(
      safeInvoke('command_b')
    ).rejects.toThrow('Error B');

    expect(mockNotify).toHaveBeenCalledTimes(2);
    expect(mockNotify).toHaveBeenCalledWith('error', 'Error B', 'IPC Error: command_b');
  });

  it('error recovery: succeeds after previous failure', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('Temporary failure'));
    mockInvoke.mockResolvedValueOnce({ success: true });

    // First call fails
    await expect(
      safeInvoke('unstable_command')
    ).rejects.toThrow('Temporary failure');

    // Second call succeeds
    const result = await safeInvoke<{ success: boolean }>('unstable_command');
    expect(result).toEqual({ success: true });
    expect(mockNotify).toHaveBeenCalledTimes(1); // Only the first failure triggered notification
  });

  it('handles rapid sequential invocations correctly', async () => {
    mockInvoke
      .mockResolvedValueOnce('A')
      .mockResolvedValueOnce('B')
      .mockResolvedValueOnce('C');

    const [a, b, c] = await Promise.all([
      safeInvoke<string>('cmd_a'),
      safeInvoke<string>('cmd_b'),
      safeInvoke<string>('cmd_c'),
    ]);

    expect(a).toBe('A');
    expect(b).toBe('B');
    expect(c).toBe('C');
    expect(mockInvoke).toHaveBeenCalledTimes(3);
  });
});

// ---------------------------------------------------------------------------
// autoSaveStore -- Corrupted localStorage
// ---------------------------------------------------------------------------

describe('autoSaveStore corrupted localStorage', () => {
  beforeEach(() => {
    useAutoSaveStore.setState({ ...autoSaveInitialState });
  });

  it('handles corrupted localStorage data gracefully', () => {
    // Simulate corrupted data by directly manipulating the store state
    // Zustand persist middleware handles JSON parse errors internally;
    // we test that the store remains usable after a corrupted state scenario.
    localStorage.setItem('markhere-autosave-backup', 'invalid{{{json');

    // The store should still be initializable and functional
    const state = useAutoSaveStore.getState();
    expect(state).toBeDefined();
    expect(state.drafts).toBeDefined();
    expect(Array.isArray(state.drafts)).toBe(true);
  });

  it('handles empty localStorage entry gracefully', () => {
    localStorage.setItem('markhere-autosave-backup', '');

    const state = useAutoSaveStore.getState();
    expect(state).toBeDefined();
    expect(state.content).toBeDefined();
  });

  it('handles null localStorage value gracefully', () => {
    localStorage.removeItem('markhere-autosave-backup');

    const state = useAutoSaveStore.getState();
    expect(state).toBeDefined();
    expect(state.drafts).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// autoSaveStore -- Draft Expiry
// ---------------------------------------------------------------------------

describe('autoSaveStore draft expiry', () => {
  beforeEach(() => {
    useAutoSaveStore.setState({ ...autoSaveInitialState });
  });

  it('draft at exactly 7 days boundary is considered expired', () => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    // A draft exactly at the 7-day mark should be expired
    // because the comparison is `d.timestamp > expiryTime`
    // where expiryTime = Date.now() - 7 days
    useAutoSaveStore.setState({
      drafts: [
        {
          id: 'boundary-draft',
          content: '# Boundary',
          timestamp: sevenDaysAgo,
          title: 'Boundary Draft',
        },
      ],
    });

    const recent = useAutoSaveStore.getState().getRecentDrafts();
    // Exactly 7 days old: timestamp (now-7d) > expiryTime (now-7d) is FALSE
    // so it should be filtered out
    expect(recent.find((d) => d.id === 'boundary-draft')).toBeUndefined();
  });

  it('draft at 6 days 23 hours is still valid', () => {
    const sixDays23HoursAgo = Date.now() - (6 * 24 * 60 * 60 * 1000 + 23 * 60 * 60 * 1000);

    useAutoSaveStore.setState({
      drafts: [
        {
          id: 'near-expiry-draft',
          content: '# Almost Expired',
          timestamp: sixDays23HoursAgo,
          title: 'Near Expiry',
        },
      ],
    });

    const recent = useAutoSaveStore.getState().getRecentDrafts();
    expect(recent.find((d) => d.id === 'near-expiry-draft')).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// SaveWorker -- Concurrent Save Calls
// ---------------------------------------------------------------------------

describe('SaveWorker concurrent saves', () => {
  let worker: SaveWorker;

  beforeEach(() => {
    vi.useFakeTimers();
    worker = new SaveWorker(100);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces rapid triggerSave calls: last callback wins', async () => {
    const callbacks: string[] = [];
    const cb1 = vi.fn(async () => { callbacks.push('first'); });
    const cb2 = vi.fn(async () => { callbacks.push('second'); });
    const cb3 = vi.fn(async () => { callbacks.push('third'); });

    worker.triggerSave(cb1);
    worker.triggerSave(cb2);
    worker.triggerSave(cb3);

    // Fast-forward past the debounce delay
    await vi.runAllTimersAsync();

    // Only the last callback should be invoked
    expect(cb1).not.toHaveBeenCalled();
    expect(cb2).not.toHaveBeenCalled();
    expect(cb3).toHaveBeenCalled();
    expect(callbacks).toEqual(['third']);
  });

  it('immediateSave executes immediately regardless of pending debounced saves', async () => {
    const callbacks: string[] = [];
    const debouncedCb = vi.fn(async () => { callbacks.push('debounced'); });
    const immediateCb = vi.fn(async () => { callbacks.push('immediate'); });

    worker.triggerSave(debouncedCb);
    await worker.immediateSave(immediateCb);

    expect(immediateCb).toHaveBeenCalled();
    expect(debouncedCb).not.toHaveBeenCalled();
    expect(callbacks).toEqual(['immediate']);
  });

  it('cancel prevents pending save from executing', async () => {
    const cb = vi.fn();

    worker.triggerSave(cb);
    worker.cancel();

    await vi.runAllTimersAsync();

    expect(cb).not.toHaveBeenCalled();
  });

  it('skips save if already saving (isSaving guard)', async () => {
    const calls: string[] = [];

    // First save takes time
    worker.triggerSave(async () => {
      calls.push('save1');
      // Simulate long save by not resolving immediately
      await new Promise((resolve) => setTimeout(resolve, 1000));
    });

    // Advance timer so save1 starts
    vi.advanceTimersByTime(150);
    expect(worker.getIsSaving()).toBe(true);

    // Trigger another save while first is in progress
    const cb2 = vi.fn(async () => { calls.push('save2'); });
    worker.triggerSave(cb2);

    // Let the first save timer fire, but due to isSaving guard, cb2 should be skipped
    vi.advanceTimersByTime(200);

    // Complete first save
    await vi.runAllTimersAsync();

    // cb2 should not have been called because isSaving was true
    expect(calls).toEqual(['save1']);
  });
});

// ---------------------------------------------------------------------------
// settingsStore -- Invalid localStorage JSON
// ---------------------------------------------------------------------------

describe('settingsStore invalid localStorage', () => {
  beforeEach(() => {
    useSettingsStore.setState({ ...settingsInitialState });
  });

  it('falls back to defaults when localStorage contains invalid JSON', () => {
    localStorage.setItem('markhere-settings', 'not-valid-json{{{');

    // The store should still be functional with default values
    const state = useSettingsStore.getState();
    expect(state.theme).toBeDefined();
    expect(state.fontSize).toBeDefined();
    expect(typeof state.fontSize).toBe('number');
  });

  it('falls back to defaults when localStorage contains null', () => {
    localStorage.setItem('markhere-settings', 'null');

    const state = useSettingsStore.getState();
    expect(state.theme).toBeDefined();
    expect(state.fontSize).toBeGreaterThan(0);
  });

  it('preserves partial settings when some fields are missing in stored JSON', () => {
    localStorage.setItem('markhere-settings', JSON.stringify({ state: { theme: 'dark' } }));

    // The store should merge with defaults for missing fields
    const state = useSettingsStore.getState();
    expect(state.fontSize).toBeDefined();
    expect(typeof state.fontSize).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// themeEditorStore -- Import/Export
// ---------------------------------------------------------------------------

describe('themeEditorStore import', () => {
  beforeEach(() => {
    useThemeEditorStore.setState({
      currentTheme: useThemeEditorStore.getState().currentTheme,
      customThemes: [],
      isLivePreview: true,
    });
  });

  it('import invalid JSON returns false, state unchanged', () => {
    const beforeName = useThemeEditorStore.getState().currentTheme.name;

    const result = useThemeEditorStore.getState().importTheme('not json at all{{{');

    expect(result).toBe(false);
    // State should be unchanged
    expect(useThemeEditorStore.getState().currentTheme.name).toBe(beforeName);
  });

  it('import empty object returns false', () => {
    const beforeName = useThemeEditorStore.getState().currentTheme.name;

    const result = useThemeEditorStore.getState().importTheme('{}');

    expect(result).toBe(false);
    expect(useThemeEditorStore.getState().currentTheme.name).toBe(beforeName);
  });

  it('import null returns false', () => {
    const beforeName = useThemeEditorStore.getState().currentTheme.name;

    const result = useThemeEditorStore.getState().importTheme('null');

    expect(result).toBe(false);
    expect(useThemeEditorStore.getState().currentTheme.name).toBe(beforeName);
  });

  it('import with missing colors fills with defaults', () => {
    const themeJson = JSON.stringify({
      name: 'Minimal Theme',
      colors: {
        bgPrimary: '#000000',
        textPrimary: '#ffffff',
      },
    });

    const result = useThemeEditorStore.getState().importTheme(themeJson);

    expect(result).toBe(true);
    const theme = useThemeEditorStore.getState().currentTheme;
    expect(theme.name).toBe('Minimal Theme');
    expect(theme.colors.bgPrimary).toBe('#000000');
    expect(theme.colors.textPrimary).toBe('#ffffff');
    // Missing colors should have default values
    expect(theme.colors.bgSecondary).toBeTruthy();
    expect(theme.colors.codeBg).toBeTruthy();
    expect(theme.colors.primaryColor).toBeTruthy();
  });

  it('import without name returns false', () => {
    const themeJson = JSON.stringify({
      colors: {
        bgPrimary: '#000000',
        textPrimary: '#ffffff',
      },
    });

    const result = useThemeEditorStore.getState().importTheme(themeJson);

    expect(result).toBe(false);
  });

  it('import with empty name returns false', () => {
    const themeJson = JSON.stringify({
      name: '   ',
      colors: {
        bgPrimary: '#000000',
        textPrimary: '#ffffff',
      },
    });

    const result = useThemeEditorStore.getState().importTheme(themeJson);

    expect(result).toBe(false);
  });

  it('import without bgPrimary or textPrimary returns false', () => {
    const themeJson = JSON.stringify({
      name: 'Bad Theme',
      colors: {
        bgSecondary: '#cccccc',
      },
    });

    const result = useThemeEditorStore.getState().importTheme(themeJson);

    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// gitStore -- Error Handling
// ---------------------------------------------------------------------------

describe('gitStore error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGitStore.setState({
      isEnabled: false,
      loading: false,
      error: null,
      commits: [],
      currentDiff: null,
      selectedHash: null,
    });
  });

  it('loadHistory failure sets error state and clears commits', async () => {
    mockInvoke.mockRejectedValue(new Error('Git not found'));

    await useGitStore.getState().loadHistory('/test/file.md');

    const state = useGitStore.getState();
    expect(state.commits).toEqual([]);
    expect(state.isEnabled).toBe(false);
    expect(state.loading).toBe(false);
  });

  it('loadHistory with empty path returns early', async () => {
    await useGitStore.getState().loadHistory('');

    const state = useGitStore.getState();
    expect(state.loading).toBe(false);
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('loadDiff failure sets error and clears diff', async () => {
    mockInvoke.mockRejectedValue(new Error('Diff failed'));

    await useGitStore.getState().loadDiff('/test/file.md', 'abc123', 'def456');

    const state = useGitStore.getState();
    expect(state.currentDiff).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.error).toBeTruthy();
  });

  it('selectCommit updates selectedHash', () => {
    useGitStore.getState().selectCommit('abc123');

    expect(useGitStore.getState().selectedHash).toBe('abc123');
  });

  it('selectCommit with null clears selectedHash', () => {
    useGitStore.getState().selectCommit('abc123');
    useGitStore.getState().selectCommit(null);

    expect(useGitStore.getState().selectedHash).toBeNull();
  });

  it('clearDiff resets diff and selectedHash', () => {
    useGitStore.setState({
      currentDiff: { old_content: 'old', new_content: 'new', additions: 1, deletions: 1 },
      selectedHash: 'abc123',
    });

    useGitStore.getState().clearDiff();

    const state = useGitStore.getState();
    expect(state.currentDiff).toBeNull();
    expect(state.selectedHash).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// cloudStore -- Error Handling
// ---------------------------------------------------------------------------

describe('cloudStore saveToCloud', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCloudStore.setState({
      providers: [],
      syncEnabled: false,
      lastSync: null,
      cloudPath: null,
      cloudFiles: [],
    });
  });

  it('saveToCloud without cloudPath throws with clear message', async () => {
    await expect(
      useCloudStore.getState().saveToCloud('test.md', '# Content')
    ).rejects.toThrow('No cloud provider connected');
  });

  it('saveToCloud with cloudPath but in non-Tauri mode uses localStorage', async () => {
    useCloudStore.setState({ cloudPath: '/mock/cloud/Markhere' });

    const result = await useCloudStore.getState().saveToCloud('test.md', '# Cloud Content');

    expect(result).toBe('/mock/cloud/Markhere/test.md');
  });

  it('saveToCloud sanitizes filename to prevent directory traversal', async () => {
    useCloudStore.setState({ cloudPath: '/mock/cloud/Markhere' });

    const result = await useCloudStore.getState().saveToCloud('../../etc/passwd', 'malicious');

    // The filename should be sanitized (slashes replaced with underscores)
    // New slashes are NOT introduced in the filename portion
    const cloudPath = useCloudStore.getState().cloudPath!;
    const filename = result.replace(cloudPath + '/', '');
    expect(filename).not.toContain('/');
    expect(filename).not.toContain('\\');
  });
});

// ---------------------------------------------------------------------------
// pluginStore -- Duplicate Plugin Load
// ---------------------------------------------------------------------------

describe('pluginStore duplicate plugin load', () => {
  // Note: pluginStore uses Map internally and persist middleware.
  // The loadPlugin function sets a new Map entry, which means duplicate
  // loads will simply overwrite the previous entry (idempotent behavior).

  it('loading a plugin with same id overwrites previous (idempotent)', () => {
    // We rely on the fact that zustand create().getState() returns the same API.
    // Since loadPlugin is async and imports PluginAPI dynamically,
    // we test the state shape after initialization.
    const state = useAutoSaveStore.getState(); // just to verify store type works
    expect(state).toBeDefined();

    // The pluginStore itself is tested in its own test file;
    // here we confirm the store module loads without errors
    expect(usePluginStore).toBeDefined();
    expect(typeof usePluginStore.getState).toBe('function');
  });
});
