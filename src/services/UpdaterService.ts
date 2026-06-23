import { check, type Update, type DownloadEvent } from '@tauri-apps/plugin-updater';

export interface UpdaterProgress {
  status: 'checking' | 'available' | 'downloading' | 'ready' | 'error' | 'uptodate';
  update?: Update;
  downloadedBytes?: number;
  totalBytes?: number;
  error?: string;
}

/**
 * Application self-updater. Uses the already-installed Tauri updater plugin
 * to check GitHub releases, download an update if one exists, and install it.
 */
export class UpdaterService {
  /** Check for updates and return progress events. */
  static async check(
    onProgress: (progress: UpdaterProgress) => void = () => {},
  ): Promise<Update | null> {
    onProgress({ status: 'checking' });
    try {
      const update = await check();
      if (!update) {
        onProgress({ status: 'uptodate' });
        return null;
      }
      onProgress({ status: 'available', update });
      return update;
    } catch (e) {
      onProgress({ status: 'error', error: e instanceof Error ? e.message : String(e) });
      return null;
    }
  }

  /** Download an update and report progress. */
  static async downloadAndInstall(
    update: Update,
    onProgress: (progress: UpdaterProgress) => void = () => {},
  ): Promise<void> {
    let downloadedBytes = 0;
    let totalBytes: number | undefined;

    onProgress({ status: 'downloading', update, downloadedBytes: 0 });
    try {
      await update.downloadAndInstall(
        (event: DownloadEvent) => {
          if (event.event === 'Started') {
            totalBytes = event.data.contentLength;
            downloadedBytes = 0;
          } else if (event.event === 'Progress') {
            downloadedBytes += event.data.chunkLength;
          }
          onProgress({
            status: event.event === 'Finished' ? 'ready' : 'downloading',
            update,
            downloadedBytes,
            totalBytes,
          });
        },
      );
    } catch (e) {
      onProgress({ status: 'error', update, error: e instanceof Error ? e.message : String(e) });
      throw e;
    }
  }
}
