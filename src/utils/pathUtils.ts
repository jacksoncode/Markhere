/**
 * Cross-platform path helpers.
 *
 * The editor stores file paths coming from Tauri, which are platform-native:
 * forward slashes on macOS/Linux and backslashes on Windows (e.g. C:\Users\a.md).
 * Never rely on a hard-coded '/' separator — use these helpers instead so that
 * the "open file" flow works on every target OS.
 */

const SEP_RE = /[\\/]/;

/** Last path segment, preserving the extension (e.g. `C:\a\b.md` -> `b.md`). */
export function basenameOf(path: string | null | undefined): string {
  if (!path) return '';
  const clean = path.split(SEP_RE).pop();
  return clean ?? path;
}

/** File name without the markdown/text extension (e.g. `C:\a\b.md` -> `b`). */
export function fileNameOf(path: string | null | undefined): string {
  return basenameOf(path).replace(/\.(md|markdown|txt)$/i, '');
}
