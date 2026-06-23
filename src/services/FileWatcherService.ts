import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { safeInvoke } from './ipcWrapper';

/**
 * Watches the currently-open file for external modifications via the Rust
 * `watch_file` / `unwatch_file` commands and the `file-changed` event.
 *
 * Our own saves touch the file too, so the service suppresses events that
 * arrive shortly after a save we initiated (`notifySelfSave`). Remaining
 * events are genuine external changes and are forwarded to the registered
 * callback.
 */

type FileChangedHandler = (path: string) => void;

// Window after a self-initiated save during which file-changed events are
// treated as our own write and ignored. The Rust watcher debounces at 400ms,
// so this must comfortably exceed that.
const SELF_SAVE_SUPPRESS_MS = 900;

class FileWatcherServiceImpl {
  private unlisten: UnlistenFn | null = null;
  private handler: FileChangedHandler | null = null;
  private watchedPath: string | null = null;
  private lastSelfSaveAt = 0;

  /** Register the callback invoked on a genuine external change. */
  onExternalChange(handler: FileChangedHandler): void {
    this.handler = handler;
    void this.ensureListening();
  }

  private async ensureListening(): Promise<void> {
    if (this.unlisten) return;
    try {
      this.unlisten = await listen<{ path: string }>('file-changed', (event) => {
        const changedPath = event.payload?.path;
        if (!changedPath || changedPath !== this.watchedPath) return;
        // Ignore the echo of our own save.
        if (Date.now() - this.lastSelfSaveAt < SELF_SAVE_SUPPRESS_MS) return;
        this.handler?.(changedPath);
      });
    } catch {
      // Running outside Tauri (e.g. web preview) — watching is unavailable.
    }
  }

  /** Start watching `path`, replacing any previous watch. */
  async watch(path: string): Promise<void> {
    if (this.watchedPath === path) return;
    this.watchedPath = path;
    try {
      await safeInvoke('watch_file', { path });
    } catch {
      // Non-fatal: editor still works without external-change detection.
      this.watchedPath = null;
    }
  }

  /** Stop watching the current file. */
  async unwatch(): Promise<void> {
    this.watchedPath = null;
    try {
      await safeInvoke('unwatch_file');
    } catch {
      /* ignore */
    }
  }

  /** Call right before/after a save we initiate to suppress the echo. */
  notifySelfSave(): void {
    this.lastSelfSaveAt = Date.now();
  }

  /** Tear down the event listener (e.g. on app teardown). */
  dispose(): void {
    this.unlisten?.();
    this.unlisten = null;
    this.handler = null;
    this.watchedPath = null;
  }

  /** Exposed for tests. */
  get currentPath(): string | null {
    return this.watchedPath;
  }
}

export const FileWatcherService = new FileWatcherServiceImpl();
