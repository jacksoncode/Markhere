import { create } from 'zustand';

export interface CloudProvider {
  name: string;
  icon: string;
  connected: boolean;
  /** Actual filesystem path to the provider's directory */
  path: string;
}

export interface CloudFile {
  name: string;
  path: string;
}

interface CloudState {
  providers: CloudProvider[];
  syncEnabled: boolean;
  lastSync: string | null;
  /** The Markhere/ subdirectory path inside the connected cloud provider */
  cloudPath: string | null;
  /** .md files found in the connected cloud directory */
  cloudFiles: CloudFile[];

  connect: (provider: string) => Promise<void>;
  disconnect: (provider: string) => void;
  sync: () => Promise<void>;
  saveToCloud: (filename: string, content: string) => Promise<string>;
  getCloudFiles: () => CloudFile[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _isTauri(): boolean {
  return !!(window as unknown as { __TAURI__?: unknown }).__TAURI__;
}

/** Map each provider to a list of candidate filesystem paths to try. */
function _providerPathCandidates(home: string, provider: string): string[] {
  switch (provider) {
    case 'iCloud':
      return [`${home}/Library/Mobile Documents/com~apple~CloudDocs`];
    case 'Dropbox':
      return [`${home}/Dropbox`];
    case 'Google Drive':
      return [`${home}/Google Drive`];
    case 'OneDrive':
      return [`${home}/OneDrive`];
    default:
      return [];
  }
}

/**
 * Try to resolve the home directory using Tauri APIs.
 * Falls back to empty string when Tauri is unavailable.
 */
async function _resolveHomeDir(): Promise<string> {
  if (!_isTauri()) return '';
  try {
    const { homeDir } = await import('@tauri-apps/api/path');
    return await homeDir();
  } catch {
    return '';
  }
}

/**
 * Try to find an existing directory among the candidates for this provider.
 * Returns the first existing path, or null.
 */
async function _findProviderPath(candidates: string[]): Promise<string | null> {
  if (!_isTauri()) return candidates[0] || null;

  try {
    const { exists } = await import('@tauri-apps/plugin-fs');
    for (const p of candidates) {
      try {
        if (await exists(p)) return p;
      } catch {
        // Permission denied or scope issue -- try next candidate
        continue;
      }
    }
  } catch {
    // Plugin-fs import itself failed
  }
  return null;
}

async function _ensureDir(path: string): Promise<void> {
  if (!_isTauri()) return;
  try {
    const { exists, mkdir } = await import('@tauri-apps/plugin-fs');
    const alreadyExists = await exists(path).catch(() => false);
    if (!alreadyExists) {
      await mkdir(path, { recursive: true });
    }
  } catch {
    // Directory creation is best-effort
  }
}

async function _readCloudFiles(cloudPath: string): Promise<CloudFile[]> {
  if (!_isTauri()) return [];

  try {
    const { readDir } = await import('@tauri-apps/plugin-fs');
    const entries = await readDir(cloudPath);
    return entries
      .filter((e) => e.isFile && e.name.endsWith('.md'))
      .map((e) => ({
        name: e.name,
        path: `${cloudPath}/${e.name}`,
      }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Default providers
// ---------------------------------------------------------------------------

const defaultProviders: CloudProvider[] = [
  { name: 'iCloud', icon: '\u{1F34E}', connected: false, path: '' },
  { name: 'Dropbox', icon: '\u{1F4E6}', connected: false, path: '' },
  { name: 'Google Drive', icon: '☁️', connected: false, path: '' },
  { name: 'OneDrive', icon: '\u{1F539}', connected: false, path: '' },
];

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useCloudStore = create<CloudState>((set, get) => ({
  providers: defaultProviders,
  syncEnabled: false,
  lastSync: null,
  cloudPath: null,
  cloudFiles: [],

  // -----------------------------------------------------------------------
  // connect
  // -----------------------------------------------------------------------
  connect: async (provider: string) => {
    // Mark the provider as "attempting" by keeping its current connected flag;
    // the actual outcome is decided after the directory checks below.

    try {
      const home = await _resolveHomeDir();

      if (!home) {
        // Web mode or homeDir unavailable -- use placeholder behaviour.
        set((state) => ({
          providers: state.providers.map((p) =>
            p.name === provider ? { ...p, connected: true } : p,
          ),
          syncEnabled: true,
        }));
        return;
      }

      const candidates = _providerPathCandidates(home, provider);
      if (candidates.length === 0) {
        set((state) => ({
          providers: state.providers.map((p) =>
            p.name === provider ? { ...p, connected: true, path: '' } : p,
          ),
          syncEnabled: true,
        }));
        return;
      }

      const foundPath = await _findProviderPath(candidates);

      if (!foundPath) {
        // Provider directory not found on disk -- connect anyway so the user
        // can still see the UI feedback; the path stays empty.
        set((state) => ({
          providers: state.providers.map((p) =>
            p.name === provider ? { ...p, connected: true, path: '' } : p,
          ),
          syncEnabled: true,
        }));
        return;
      }

      // Ensure Markhere/ subdirectory exists
      const markhereDir = `${foundPath}/Markhere`;
      await _ensureDir(markhereDir);

      set((state) => ({
        providers: state.providers.map((p) =>
          p.name === provider
            ? { ...p, connected: true, path: markhereDir }
            : p,
        ),
        syncEnabled: true,
        cloudPath: markhereDir,
      }));
    } catch (err) {
      console.warn(`[cloudStore] Failed to connect to ${provider}:`, err);
      set((state) => ({
        providers: state.providers.map((p) =>
          p.name === provider ? { ...p, connected: true } : p,
        ),
        syncEnabled: true,
      }));
    }
  },

  // -----------------------------------------------------------------------
  // disconnect
  // -----------------------------------------------------------------------
  disconnect: (provider: string) => {
    set((state) => ({
      providers: state.providers.map((p) =>
        p.name === provider ? { ...p, connected: false, path: '' } : p,
      ),
      cloudPath: null,
      cloudFiles: [],
    }));
  },

  // -----------------------------------------------------------------------
  // sync
  // -----------------------------------------------------------------------
  sync: async () => {
    const { cloudPath } = get();

    if (!cloudPath || !_isTauri()) {
      set({ lastSync: new Date().toISOString() });
      return;
    }

    try {
      const files = await _readCloudFiles(cloudPath);
      set({ cloudFiles: files, lastSync: new Date().toISOString() });
    } catch (err) {
      console.warn('[cloudStore] Sync failed:', err);
      set({ lastSync: new Date().toISOString() });
    }
  },

  // -----------------------------------------------------------------------
  // saveToCloud
  // -----------------------------------------------------------------------
  saveToCloud: async (filename: string, content: string): Promise<string> => {
    const { cloudPath } = get();

    if (!cloudPath) {
      throw new Error('No cloud provider connected');
    }

    // Sanitise the filename to prevent directory traversal
    const safeName = filename.replace(/[/\\]/g, '_');
    const filePath = `${cloudPath}/${safeName}`;

    if (_isTauri()) {
      try {
        const { writeTextFile } = await import('@tauri-apps/plugin-fs');
        await writeTextFile(filePath, content);
      } catch (err) {
        throw new Error(
          `Failed to save to cloud: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    } else {
      // Web fallback -- store in localStorage
      localStorage.setItem(`markhere_cloud_${safeName}`, content);
    }

    return filePath;
  },

  // -----------------------------------------------------------------------
  // getCloudFiles
  // -----------------------------------------------------------------------
  getCloudFiles: () => {
    return get().cloudFiles;
  },
}));
