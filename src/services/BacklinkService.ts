import { safeInvoke } from './ipcWrapper';

/**
 * Builds a workspace-wide index of `[[wiki links]]` so the editor can show
 * which notes link *to* the current note (backlinks) and which notes it links
 * *out* to (outlinks) — the core Obsidian differentiator.
 *
 * Links are matched by note name (filename without extension), case-insensitive,
 * mirroring how `[[Note Name]]` resolves in most Markdown knowledge tools.
 */

export interface LinkReference {
  /** Absolute path of the note containing the link. */
  sourcePath: string;
  /** Note name the link points at (the part inside [[ ]] before any |). */
  target: string;
  /** A short surrounding-text snippet for context preview. */
  context: string;
  /** Line number (1-based) where the link occurs. */
  line: number;
}

const WIKILINK_RE = /\[\[([^\[\]]+)\]\]/g;

/** Filename (no directory, no extension), lower-cased for matching. */
export function noteKey(path: string): string {
  const base = path.split(/[/\\]/).pop() || path;
  return base.replace(/\.(md|markdown)$/i, '').toLowerCase();
}

function extractLinks(sourcePath: string, content: string): LinkReference[] {
  const refs: LinkReference[] = [];
  const lines = content.split('\n');
  lines.forEach((lineText, idx) => {
    let m: RegExpExecArray | null;
    WIKILINK_RE.lastIndex = 0;
    while ((m = WIKILINK_RE.exec(lineText)) !== null) {
      const target = m[1].split('|')[0].trim();
      if (!target) continue;
      refs.push({
        sourcePath,
        target,
        context: lineText.trim().slice(0, 160),
        line: idx + 1,
      });
    }
  });
  return refs;
}

class BacklinkServiceImpl {
  /** All link references found across the workspace. */
  private index: LinkReference[] = [];
  private indexedDir: string | null = null;
  private building: Promise<void> | null = null;

  /**
   * Scan every Markdown file under `dir` and (re)build the link index.
   * Concurrent calls for the same directory share one in-flight build.
   */
  async buildIndex(dir: string): Promise<void> {
    if (this.building && this.indexedDir === dir) return this.building;
    this.indexedDir = dir;
    this.building = (async () => {
      const refs: LinkReference[] = [];
      try {
        const files = await safeInvoke<string[]>('list_markdown_files', {
          dirPath: dir,
        });
        // Read files in parallel but bounded to avoid a thundering herd.
        const BATCH = 12;
        for (let i = 0; i < files.length; i += BATCH) {
          const batch = files.slice(i, i + BATCH);
          const contents = await Promise.all(
            batch.map((f) =>
              safeInvoke<string>('read_file', { path: f }).catch(() => ''),
            ),
          );
          batch.forEach((f, j) => {
            if (contents[j]) refs.push(...extractLinks(f, contents[j]));
          });
        }
      } catch {
        // Directory unavailable (e.g. no workspace open) — leave index empty.
      }
      this.index = refs;
    })();
    await this.building;
    this.building = null;
  }

  /** Notes linking TO the given file. */
  getBacklinks(filePath: string): LinkReference[] {
    const key = noteKey(filePath);
    return this.index.filter(
      (r) => r.target.toLowerCase() === key && noteKey(r.sourcePath) !== key,
    );
  }

  /** Links FROM the given file out to other notes. */
  getOutlinks(filePath: string): LinkReference[] {
    const key = noteKey(filePath);
    return this.index.filter((r) => noteKey(r.sourcePath) === key);
  }

  /** Directory the index was last built for, or null. */
  get currentDir(): string | null {
    return this.indexedDir;
  }

  /** Test/clear helper. */
  reset(): void {
    this.index = [];
    this.indexedDir = null;
    this.building = null;
  }

  /** Expose the raw index for tests. */
  get size(): number {
    return this.index.length;
  }
}

export const BacklinkService = new BacklinkServiceImpl();
