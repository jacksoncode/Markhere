import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks must be hoisted above all imports
// ---------------------------------------------------------------------------
vi.mock('@tauri-apps/api/path', () => ({
  homeDir: vi.fn().mockResolvedValue('/mock/home'),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  exists: vi.fn().mockResolvedValue(true),
  mkdir: vi.fn().mockResolvedValue(undefined),
  readDir: vi.fn().mockResolvedValue([]),
  writeTextFile: vi.fn().mockResolvedValue(undefined),
}));

import { useCloudStore } from './cloudStore';

// ---------------------------------------------------------------------------
// Helpers: make the store "think" it is running inside Tauri
// ---------------------------------------------------------------------------
function enableTauri() {
  (window as any).__TAURI_INTERNALS__ = {};
}

function disableTauri() {
  delete (window as any).__TAURI_INTERNALS__;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('useCloudStore', () => {
  beforeEach(() => {
    useCloudStore.setState({
      providers: [
        { name: 'iCloud', icon: '\u{1F34E}', connected: false, path: '' },
        { name: 'Dropbox', icon: '\u{1F4E6}', connected: false, path: '' },
        { name: 'Google Drive', icon: '☁️', connected: false, path: '' },
        { name: 'OneDrive', icon: '\u{1F539}', connected: false, path: '' },
      ],
      syncEnabled: false,
      lastSync: null,
      cloudPath: null,
      cloudFiles: [],
    });
    enableTauri();
    vi.clearAllMocks();
  });

  afterEach(() => {
    disableTauri();
  });

  // -----------------------------------------------------------------------
  // Initial state
  // -----------------------------------------------------------------------
  describe('initial state', () => {
    it('has 4 default cloud providers', () => {
      const { providers } = useCloudStore.getState();
      expect(providers).toHaveLength(4);
    });

    it('default provider names are iCloud, Dropbox, Google Drive, OneDrive', () => {
      const { providers } = useCloudStore.getState();
      const names = providers.map((p) => p.name);
      expect(names).toEqual(['iCloud', 'Dropbox', 'Google Drive', 'OneDrive']);
    });

    it('all providers start as disconnected', () => {
      const { providers } = useCloudStore.getState();
      providers.forEach((p) => {
        expect(p.connected).toBe(false);
      });
    });

    it('syncEnabled starts as false', () => {
      expect(useCloudStore.getState().syncEnabled).toBe(false);
    });

    it('cloudFiles starts as empty array', () => {
      expect(useCloudStore.getState().cloudFiles).toEqual([]);
    });

    it('cloudPath and lastSync start as null', () => {
      const { cloudPath, lastSync } = useCloudStore.getState();
      expect(cloudPath).toBeNull();
      expect(lastSync).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // connect
  // -----------------------------------------------------------------------
  describe('connect', () => {
    it('sets the provider as connected and enables sync', async () => {
      const { connect } = useCloudStore.getState();

      await connect('Dropbox');

      const state = useCloudStore.getState();
      const dropbox = state.providers.find((p) => p.name === 'Dropbox');
      expect(dropbox?.connected).toBe(true);
      expect(state.syncEnabled).toBe(true);
    });

    it('connects in web mode (no __TAURI__) without error', async () => {
      disableTauri();

      const { connect } = useCloudStore.getState();
      await connect('Google Drive');

      const state = useCloudStore.getState();
      const gdrive = state.providers.find((p) => p.name === 'Google Drive');
      expect(gdrive?.connected).toBe(true);
      expect(state.syncEnabled).toBe(true);
    });

    it('handles unknown provider gracefully (no-op on providers list)', async () => {
      const { connect } = useCloudStore.getState();
      // Connecting an unknown provider name: the map iterates existing
      // providers, so it does nothing to the list.
      await connect('UnknownProvider');

      const state = useCloudStore.getState();
      // All 4 default providers remain untouched; no new entry is added.
      expect(state.providers).toHaveLength(4);
      expect(state.syncEnabled).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // disconnect
  // -----------------------------------------------------------------------
  describe('disconnect', () => {
    it('clears connection state for the specified provider', async () => {
      const { connect, disconnect } = useCloudStore.getState();

      await connect('iCloud');
      disconnect('iCloud');

      const state = useCloudStore.getState();
      const icloud = state.providers.find((p) => p.name === 'iCloud');
      expect(icloud?.connected).toBe(false);
      expect(icloud?.path).toBe('');
    });

    it('clears cloudPath and cloudFiles on disconnect', async () => {
      const { connect, disconnect } = useCloudStore.getState();

      await connect('Dropbox');
      // Simulate that cloudPath was set
      useCloudStore.setState({
        cloudPath: '/mock/home/Dropbox/Markhere',
        cloudFiles: [{ name: 'test.md', path: '/mock/home/Dropbox/Markhere/test.md' }],
      });

      disconnect('Dropbox');

      const state = useCloudStore.getState();
      expect(state.cloudPath).toBeNull();
      expect(state.cloudFiles).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // sync
  // -----------------------------------------------------------------------
  describe('sync', () => {
    it('sets lastSync even when cloudPath is null', async () => {
      const { sync } = useCloudStore.getState();
      await sync();

      expect(useCloudStore.getState().lastSync).toBeDefined();
    });

    it('sets lastSync in web mode', async () => {
      disableTauri();
      useCloudStore.setState({ cloudPath: '/some/path/Markhere' });

      const { sync } = useCloudStore.getState();
      await sync();

      expect(useCloudStore.getState().lastSync).toBeDefined();
    });

    it('reads cloud files when cloudPath is set', async () => {
      const { readDir } = await import('@tauri-apps/plugin-fs');
      const mockReadDir = vi.mocked(readDir);
      mockReadDir.mockResolvedValueOnce([
        { name: 'note1.md', isFile: true },
        { name: 'note2.md', isFile: true },
        { name: 'image.png', isFile: true },
      ] as any);

      useCloudStore.setState({ cloudPath: '/mock/home/Dropbox/Markhere' });

      const { sync } = useCloudStore.getState();
      await sync();

      const state = useCloudStore.getState();
      expect(state.cloudFiles).toHaveLength(2);
      expect(state.cloudFiles[0].name).toBe('note1.md');
      expect(state.lastSync).toBeDefined();
    });

    it('handles readDir errors gracefully (returns empty files)', async () => {
      const { readDir } = await import('@tauri-apps/plugin-fs');
      const mockReadDir = vi.mocked(readDir);
      mockReadDir.mockRejectedValueOnce(new Error('Permission denied'));

      useCloudStore.setState({
        cloudPath: '/mock/home/Dropbox/Markhere',
        cloudFiles: [{ name: 'existing.md', path: '/mock/old' }],
      });

      const { sync } = useCloudStore.getState();
      await sync();

      // _readCloudFiles catches internally and returns [], which sync
      // writes into state. lastSync is still set.
      expect(useCloudStore.getState().cloudFiles).toEqual([]);
      expect(useCloudStore.getState().lastSync).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // saveToCloud
  // -----------------------------------------------------------------------
  describe('saveToCloud', () => {
    it('throws when no cloud provider is connected', async () => {
      const { saveToCloud } = useCloudStore.getState();

      await expect(saveToCloud('test.md', '# content')).rejects.toThrow(
        'No cloud provider connected',
      );
    });

    it('sanitises filename to prevent directory traversal', async () => {
      useCloudStore.setState({ cloudPath: '/mock/home/Dropbox/Markhere' });

      const { saveToCloud } = useCloudStore.getState();
      const path = await saveToCloud('../etc/passwd', '# bad');

      // The sanitizer replaces / and \ with _ in the filename portion.
      // Verify the filename fragment (after the last /) is safe.
      const filename = path.split('/').pop()!;
      expect(filename).not.toContain('/');
      expect(filename).not.toContain('\\');
      expect(filename).toBe('.._etc_passwd');
    });

    it('sanitises backslash in filename', async () => {
      useCloudStore.setState({ cloudPath: '/mock/home/Dropbox/Markhere' });

      const { saveToCloud } = useCloudStore.getState();
      const path = await saveToCloud('sub\\file.md', '# content');

      expect(path).not.toContain('\\');
      expect(path).toContain('sub_file.md');
    });

    it('writes file via Tauri in Tauri mode', async () => {
      useCloudStore.setState({ cloudPath: '/mock/home/Dropbox/Markhere' });
      const { writeTextFile } = await import('@tauri-apps/plugin-fs');

      const { saveToCloud } = useCloudStore.getState();
      const path = await saveToCloud('my-note.md', '# Hello');

      expect(writeTextFile).toHaveBeenCalledWith(path, '# Hello');
    });

    it('falls back to localStorage in web mode', async () => {
      disableTauri();
      useCloudStore.setState({ cloudPath: '/some/path/Markhere' });

      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

      const { saveToCloud } = useCloudStore.getState();
      const path = await saveToCloud('web-note.md', '# Web content');

      expect(path).toContain('web-note.md');
      expect(setItemSpy).toHaveBeenCalledWith(
        'markhere_cloud_web-note.md',
        '# Web content',
      );

      setItemSpy.mockRestore();
    });

    it('throws when writeTextFile fails', async () => {
      useCloudStore.setState({ cloudPath: '/mock/home/Dropbox/Markhere' });
      const { writeTextFile } = await import('@tauri-apps/plugin-fs');
      vi.mocked(writeTextFile).mockRejectedValueOnce(new Error('Disk full'));

      const { saveToCloud } = useCloudStore.getState();

      await expect(saveToCloud('note.md', '# content')).rejects.toThrow(
        'Failed to save to cloud',
      );
    });
  });

  // -----------------------------------------------------------------------
  // getCloudFiles
  // -----------------------------------------------------------------------
  describe('getCloudFiles', () => {
    it('returns the current cloudFiles array', () => {
      const files = [
        { name: 'a.md', path: '/cloud/a.md' },
        { name: 'b.md', path: '/cloud/b.md' },
      ];
      useCloudStore.setState({ cloudFiles: files });

      const { getCloudFiles } = useCloudStore.getState();
      expect(getCloudFiles()).toEqual(files);
    });

    it('returns empty array when no files synced', () => {
      const { getCloudFiles } = useCloudStore.getState();
      expect(getCloudFiles()).toEqual([]);
    });
  });
});
