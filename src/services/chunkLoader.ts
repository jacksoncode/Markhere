import { invoke } from '@tauri-apps/api/core';
import type { Node as PMNode } from '@tiptap/pm/model';

const CHUNK_SIZE = 10000; // 10KB per chunk
const MAX_LOADED_CHUNKS = 10; // Maximum chunks kept in memory

export interface Chunk {
  id: number;
  start: number;
  end: number;
  content: string;
  loaded: boolean;
}

export interface ChunkedFile {
  path: string;
  totalSize: number;
  totalChunks: number;
  chunks: Map<number, Chunk>;
  currentChunkIndex: number;
}

export class ChunkLoader {
  private files: Map<string, ChunkedFile> = new Map();

  async loadFile(path: string): Promise<ChunkedFile> {
    const existing = this.files.get(path);
    if (existing) {
      return existing;
    }

    const content = await this.readFile(path);
    const totalSize = content.length;
    const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);

    const chunkedFile: ChunkedFile = {
      path,
      totalSize,
      totalChunks,
      chunks: new Map(),
      currentChunkIndex: 0,
    };

    this.files.set(path, chunkedFile);

    // Load first chunk immediately
    await this.loadChunk(path, 0);

    return chunkedFile;
  }

  async loadChunk(path: string, chunkIndex: number): Promise<Chunk> {
    const file = this.files.get(path);
    if (!file) {
      throw new Error(`File not loaded: ${path}`);
    }

    const existing = file.chunks.get(chunkIndex);
    if (existing && existing.loaded) {
      return existing;
    }

    // Calculate chunk boundaries
    const start = chunkIndex * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.totalSize);

    // Read chunk content
    const content = await this.readFileChunk(path, start, end);

    const chunk: Chunk = {
      id: chunkIndex,
      start,
      end,
      content,
      loaded: true,
    };

    file.chunks.set(chunkIndex, chunk);

    // Clean up old chunks if we exceed limit
    this.cleanupOldChunks(file, chunkIndex);

    return chunk;
  }

  async preloadAdjacentChunks(path: string, currentChunkIndex: number): Promise<void> {
    const file = this.files.get(path);
    if (!file) return;

    // Preload next 2 chunks
    for (let i = currentChunkIndex + 1; i <= currentChunkIndex + 2 && i < file.totalChunks; i++) {
      if (!file.chunks.has(i)) {
        this.loadChunk(path, i).catch(console.error);
      }
    }

    // Preload previous 1 chunk
    if (currentChunkIndex > 0 && !file.chunks.has(currentChunkIndex - 1)) {
      this.loadChunk(path, currentChunkIndex - 1).catch(console.error);
    }
  }

  getVisibleContent(file: ChunkedFile, startLine: number, endLine: number): string {
    const startChunkIndex = Math.floor(startLine / CHUNK_SIZE);
    const endChunkIndex = Math.floor(endLine / CHUNK_SIZE);

    let content = '';

    for (let i = startChunkIndex; i <= endChunkIndex; i++) {
      const chunk = file.chunks.get(i);
      if (chunk && chunk.loaded) {
        content += chunk.content;
      }
    }

    return content;
  }

  async scrollToPosition(path: string, position: number): Promise<string> {
    const file = this.files.get(path);
    if (!file) {
      return '';
    }

    const chunkIndex = Math.floor(position / CHUNK_SIZE);
    file.currentChunkIndex = chunkIndex;

    // Load current and adjacent chunks
    await this.loadChunk(path, chunkIndex);
    await this.preloadAdjacentChunks(path, chunkIndex);

    // Collect content from loaded chunks
    let content = '';
    for (let i = chunkIndex - 1; i <= chunkIndex + 2; i++) {
      if (i >= 0 && i < file.totalChunks) {
        const chunk = file.chunks.get(i);
        if (chunk && chunk.loaded) {
          content += chunk.content;
        }
      }
    }

    return content;
  }

  private cleanupOldChunks(file: ChunkedFile, currentChunkIndex: number): void {
    if (file.chunks.size <= MAX_LOADED_CHUNKS) {
      return;
    }

    // Remove chunks far from current position
    const keysToRemove: number[] = [];

    file.chunks.forEach((_, index) => {
      const distance = Math.abs(index - currentChunkIndex);
      if (distance > MAX_LOADED_CHUNKS / 2) {
        keysToRemove.push(index);
      }
    });

    keysToRemove.forEach((key) => {
      file.chunks.delete(key);
    });
  }

  private async readFile(path: string): Promise<string> {
    return await invoke<string>('read_file', { path });
  }

  private async readFileChunk(path: string, start: number, end: number): Promise<string> {
    // For now, read entire file and slice
    // In production, would use streaming or seek
    const fullContent = await this.readFile(path);
    return fullContent.slice(start, end);
  }

  unloadFile(path: string): void {
    this.files.delete(path);
  }

  getLoadedFileSize(path: string): number {
    const file = this.files.get(path);
    if (!file) return 0;

    let loadedSize = 0;
    file.chunks.forEach((chunk) => {
      if (chunk.loaded) {
        loadedSize += chunk.content.length;
      }
    });

    return loadedSize;
  }
}

export const chunkLoader = new ChunkLoader();

// ---------------------------------------------------------------------------
// Document-level chunking for virtual scrolling
// ---------------------------------------------------------------------------

/**
 * Metadata for a single document section used by virtual scrolling.
 */
export interface DocumentChunk {
  /** Unique chunk index (0-based). */
  id: number;
  /** ProseMirror document position where this chunk begins. */
  startPos: number;
  /** ProseMirror document position where this chunk ends (exclusive). */
  endPos: number;
  /** Number of top-level block nodes in this chunk. */
  nodeCount: number;
}

/**
 * Split a ProseMirror document into section chunks for virtual scrolling.
 *
 * Sections are delineated by heading nodes.  An optional `chunkSize`
 * parameter further splits sections that exceed the given number of
 * top-level block nodes (default 25).
 *
 * @param doc        The ProseMirror document node.
 * @param chunkSize  Maximum number of top-level block nodes per chunk.
 * @returns          Ordered array of chunk descriptors.
 */
export function getDocumentChunks(
  doc: PMNode,
  chunkSize: number = 25,
): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  let chunkId = 0;
  let chunkStart = 0;
  let chunkNodeCount = 0;

  doc.forEach((node, offset) => {
    const isHeading = node.type.name === 'heading';

    // Start a new chunk at headings (unless it is the very first chunk).
    if (isHeading && chunkNodeCount > 0) {
      chunks.push({
        id: chunkId++,
        startPos: chunkStart,
        endPos: offset,
        nodeCount: chunkNodeCount,
      });
      chunkStart = offset;
      chunkNodeCount = 0;
    }

    chunkNodeCount++;

    // If a non-heading section grows too large, split it.
    if (!isHeading && chunkNodeCount >= chunkSize) {
      chunks.push({
        id: chunkId++,
        startPos: chunkStart,
        endPos: offset + node.nodeSize,
        nodeCount: chunkNodeCount,
      });
      chunkStart = offset + node.nodeSize;
      chunkNodeCount = 0;
    }
  });

  // Final chunk – remainder of the document.
  if (chunkNodeCount > 0) {
    chunks.push({
      id: chunkId++,
      startPos: chunkStart,
      endPos: doc.content.size,
      nodeCount: chunkNodeCount,
    });
  }

  return chunks;
}

/**
 * Convenience: count top-level block nodes in a ProseMirror document.
 */
export function countTopLevelNodes(doc: PMNode): number {
  let count = 0;
  doc.forEach(() => {
    count++;
  });
  return count;
}
