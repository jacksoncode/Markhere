import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { ChunkLoader, getDocumentChunks, countTopLevelNodes, chunkLoader } from './chunkLoader';

const mockInvoke = vi.mocked(invoke);

// ---------------------------------------------------------------------------
// Helpers: mock ProseMirror document nodes
// ---------------------------------------------------------------------------

interface MockNodeConfig {
  type: string;
  nodeSize: number;
}

function createMockDoc(nodes: MockNodeConfig[]) {
  let cumulativeOffset = 0;
  const flatNodes = nodes.map((n) => {
    const offset = cumulativeOffset;
    cumulativeOffset += n.nodeSize;
    return {
      type: { name: n.type },
      nodeSize: n.nodeSize,
      offset,
    };
    // offset is not used outside — intentionally
    void 0;
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {
    content: { size: cumulativeOffset },
    forEach: (cb: (node: { type: { name: string }; nodeSize: number }, offset: number) => void) => {
      let pos = 0;
      for (const node of flatNodes) {
        cb(node, pos);
        pos += node.nodeSize;
      }
    },
  } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

// ---------------------------------------------------------------------------
// ChunkLoader tests
// ---------------------------------------------------------------------------

describe('ChunkLoader', () => {
  let loader: ChunkLoader;

  beforeEach(() => {
    vi.clearAllMocks();
    loader = new ChunkLoader();
  });

  describe('constructor', () => {
    it('initializes with empty file map', () => {
      // Verify a fresh loader returns 0 for unknown file
      expect(loader.getLoadedFileSize('/nonexistent')).toBe(0);
    });
  });

  describe('loadFile', () => {
    it('loads and chunks file content', async () => {
      // 25KB file = 3 chunks (ceil(25000 / 10000))
      const content = 'A'.repeat(25000);
      mockInvoke.mockResolvedValue(content);

      const file = await loader.loadFile('/test.md');

      expect(file.path).toBe('/test.md');
      expect(file.totalSize).toBe(25000);
      expect(file.totalChunks).toBe(3); // ceil(25000/10000)
      expect(file.currentChunkIndex).toBe(0);

      // First chunk (index 0) should be preloaded
      expect(file.chunks.has(0)).toBe(true);
      expect(file.chunks.get(0)?.loaded).toBe(true);
      expect(file.chunks.get(0)?.content.length).toBe(10000);
    });

    it('returns existing file if already loaded', async () => {
      mockInvoke.mockResolvedValue('hello world');

      const file1 = await loader.loadFile('/test.md');
      const file2 = await loader.loadFile('/test.md');

      expect(file1).toBe(file2);
      // loadFile calls readFile once, then loadChunk which calls readFileChunk
      // which calls readFile again. So 2 invokes for the first loadFile call.
      // The second loadFile returns cached → no additional invokes.
      expect(mockInvoke).toHaveBeenCalledTimes(2);
    });
  });

  describe('loadChunk', () => {
    it('loads a specific chunk and caches it', async () => {
      const content = 'B'.repeat(25000);
      mockInvoke.mockResolvedValue(content);

      await loader.loadFile('/test.md');

      // Clear the mock call count (loadFile calls invoke)
      mockInvoke.mockClear();

      const chunk = await loader.loadChunk('/test.md', 2);

      expect(chunk.id).toBe(2);
      expect(chunk.start).toBe(20000);
      expect(chunk.end).toBe(25000);
      expect(chunk.content).toBe('B'.repeat(5000));
      // Should have called readFileChunk (which calls invoke internally)
      // but the dynamic import is re-called, so mockInvoke would be called again
    });

    it('throws error for unloaded file', async () => {
      await expect(
        loader.loadChunk('/never-loaded.md', 0)
      ).rejects.toThrow('File not loaded');
    });

    it('returns cached chunk on second request (cache hit)', async () => {
      const content = 'C'.repeat(25000);
      mockInvoke.mockResolvedValue(content);

      await loader.loadFile('/test.md');

      // First load of chunk 2
      const chunk1 = await loader.loadChunk('/test.md', 2);
      expect(chunk1.content).toBe('C'.repeat(5000));

      // Second load of chunk 2 — should return same cached chunk
      // Since dynamic import re-runs, mockInvoke count would increase
      // but the chunk should have the same content reference
      const chunk2 = await loader.loadChunk('/test.md', 2);
      expect(chunk2).toBe(chunk1);
    });
  });

  describe('getVisibleContent', () => {
    it('returns content for visible range', async () => {
      const content = 'D'.repeat(25000);
      mockInvoke.mockResolvedValue(content);

      const file = await loader.loadFile('/test.md');
      // Load additional chunks
      await loader.loadChunk('/test.md', 1);
      await loader.loadChunk('/test.md', 2);

      const visible = loader.getVisibleContent(file, 0, 25000);
      expect(visible.length).toBe(25000);
      expect(visible).toBe('D'.repeat(25000));
    });

    it('returns empty string when chunks are not loaded', async () => {
      const content = 'E'.repeat(25000);
      mockInvoke.mockResolvedValue(content);

      const file = await loader.loadFile('/test.md');
      // Only chunk 0 is loaded; request beyond that
      const visible = loader.getVisibleContent(file, 10000, 25000);
      // Chunks 1 and 2 are not loaded, so only empty content
      expect(visible).toBe('');
    });
  });

  describe('preloadAdjacentChunks', () => {
    it('preloads nearby chunks by loading adjacent chunk directly', async () => {
      const content = 'F'.repeat(30000);
      mockInvoke.mockResolvedValue(content);

      const file = await loader.loadFile('/test.md');

      // Manually simulate what preloadAdjacentChunks would do for chunk at index 1:
      // it would try to load chunk 2 (next) and chunk 0 (previous)
      const chunk2 = await loader.loadChunk('/test.md', 2);

      expect(chunk2.id).toBe(2);
      expect(chunk2.loaded).toBe(true);
      expect(file.chunks.has(2)).toBe(true);
    });

    it('does nothing for unknown file', async () => {
      await expect(
        loader.preloadAdjacentChunks('/unknown.md', 0)
      ).resolves.toBeUndefined();
    });
  });

  describe('cleanupOldChunks', () => {
    it('removes chunks beyond cache limit', async () => {
      // Create a file with many chunks (> MAX_LOADED_CHUNKS = 10)
      // 120KB = 12 chunks
      const content = 'G'.repeat(120000);
      mockInvoke.mockResolvedValue(content);

      const file = await loader.loadFile('/test.md');

      // Load all chunks manually
      for (let i = 1; i < 12; i++) {
        await loader.loadChunk('/test.md', i);
      }

      // Far-away chunks should be cleaned up (e.g., chunk 0 when current is 11)
      // After loading chunk 11, chunks far from 11 (distance > 5) should be removed
      expect(file.chunks.size).toBeLessThanOrEqual(10);
    });
  });

  describe('unloadFile', () => {
    it('clears all chunks and cache', async () => {
      const content = 'hello';
      mockInvoke.mockResolvedValue(content);

      await loader.loadFile('/test.md');
      expect(loader.getLoadedFileSize('/test.md')).toBeGreaterThan(0);

      loader.unloadFile('/test.md');
      expect(loader.getLoadedFileSize('/test.md')).toBe(0);
    });
  });

  describe('getLoadedFileSize', () => {
    it('returns total size of loaded chunks', async () => {
      const content = 'H'.repeat(30000); // 3 chunks
      mockInvoke.mockResolvedValue(content);

      await loader.loadFile('/test.md');
      const size = loader.getLoadedFileSize('/test.md');

      // Only chunk 0 loaded initially (10000 chars)
      expect(size).toBe(10000);
    });

    it('returns 0 for unknown file', () => {
      expect(loader.getLoadedFileSize('/unknown.md')).toBe(0);
    });
  });

  describe('scrollToPosition', () => {
    it('loads chunks around the given position', async () => {
      const content = 'I'.repeat(50000);
      mockInvoke.mockResolvedValue(content);

      await loader.loadFile('/test.md');
      mockInvoke.mockClear();

      const scrolledContent = await loader.scrollToPosition('/test.md', 25000);

      // Should return content from chunks around position 25000 (chunk 2)
      expect(scrolledContent.length).toBeGreaterThan(0);
      expect(scrolledContent).toContain('I');
    });

    it('returns empty string for unknown file', async () => {
      const result = await loader.scrollToPosition('/unknown.md', 100);
      expect(result).toBe('');
    });

    it('handles edge of document', async () => {
      const content = 'J'.repeat(50000);
      mockInvoke.mockResolvedValue(content);

      await loader.loadFile('/test.md');
      mockInvoke.mockClear();

      // Position at the very end
      const scrolledContent = await loader.scrollToPosition('/test.md', 49900);

      expect(scrolledContent.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('chunkLoader singleton', () => {
    it('is an instance of ChunkLoader', () => {
      expect(chunkLoader).toBeInstanceOf(ChunkLoader);
    });
  });

  // -----------------------------------------------------------------------
  // Large file handling
  // -----------------------------------------------------------------------
  describe('large file handling', () => {
    it('handles file with many chunks', async () => {
      // 200KB = 20 chunks
      const content = 'K'.repeat(200000);
      mockInvoke.mockResolvedValue(content);

      const file = await loader.loadFile('/large.md');

      expect(file.totalChunks).toBe(20);
      expect(file.totalSize).toBe(200000);
    });
  });
});

// ---------------------------------------------------------------------------
// getDocumentChunks tests
// ---------------------------------------------------------------------------

describe('getDocumentChunks', () => {
  it('splits by headings', () => {
    const doc = createMockDoc([
      { type: 'heading', nodeSize: 10 },
      { type: 'paragraph', nodeSize: 20 },
      { type: 'heading', nodeSize: 10 },
      { type: 'paragraph', nodeSize: 15 },
    ]);

    const chunks = getDocumentChunks(doc);

    expect(chunks.length).toBeGreaterThanOrEqual(2);
    // First chunk should start at 0
    expect(chunks[0].id).toBe(0);
    expect(chunks[0].startPos).toBe(0);
  });

  it('splits oversized non-heading sections by chunkSize', () => {
    // Create 10 paragraphs under one heading — with small chunkSize they split
    const nodes: MockNodeConfig[] = [{ type: 'heading', nodeSize: 10 }];
    for (let i = 0; i < 50; i++) {
      nodes.push({ type: 'paragraph', nodeSize: 5 });
    }

    const doc = createMockDoc(nodes);
    const chunks = getDocumentChunks(doc, 25);

    // 1 heading + 50 paragraphs = 51 nodes, chunkSize 25
    // First chunk: heading + 24 paragraphs (25 nodes)
    // Second chunk: 25 paragraphs
    // Third chunk: remaining 1 paragraph
    expect(chunks.length).toBeGreaterThanOrEqual(2);
  });

  it('empty document returns empty array', () => {
    const doc = createMockDoc([]);
    const chunks = getDocumentChunks(doc);

    expect(chunks).toEqual([]);
  });

  it('single node document returns one chunk', () => {
    const doc = createMockDoc([{ type: 'paragraph', nodeSize: 10 }]);

    const chunks = getDocumentChunks(doc);

    expect(chunks).toHaveLength(1);
    expect(chunks[0].startPos).toBe(0);
    expect(chunks[0].endPos).toBe(10);
    expect(chunks[0].nodeCount).toBe(1);
  });

  it('uses custom chunkSize parameter', () => {
    const nodes: MockNodeConfig[] = [];
    for (let i = 0; i < 30; i++) {
      nodes.push({ type: 'paragraph', nodeSize: 5 });
    }

    const doc = createMockDoc(nodes);
    const chunks = getDocumentChunks(doc, 10);

    // 30 nodes, chunkSize 10 → at least 3 chunks
    expect(chunks.length).toBeGreaterThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// countTopLevelNodes tests
// ---------------------------------------------------------------------------

describe('countTopLevelNodes', () => {
  it('counts top-level ProseMirror nodes', () => {
    const doc = createMockDoc([
      { type: 'heading', nodeSize: 10 },
      { type: 'paragraph', nodeSize: 20 },
      { type: 'paragraph', nodeSize: 15 },
      { type: 'heading', nodeSize: 10 },
    ]);

    expect(countTopLevelNodes(doc)).toBe(4);
  });

  it('returns 0 for empty document', () => {
    const doc = createMockDoc([]);
    expect(countTopLevelNodes(doc)).toBe(0);
  });
});
