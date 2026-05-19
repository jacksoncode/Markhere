import { describe, it, expect, beforeEach } from 'vitest';
import { useRecentFilesStore } from './recentFilesStore';

const STORAGE_KEY = 'recent_files';

describe('useRecentFilesStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useRecentFilesStore.setState({ files: [] });
  });

  describe('initial state', () => {
    it('has an empty files array when localStorage is empty', () => {
      expect(useRecentFilesStore.getState().files).toEqual([]);
    });

    it('has maxFiles set to 10', () => {
      expect(useRecentFilesStore.getState().maxFiles).toBe(10);
    });
  });

  describe('addFile', () => {
    it('adds a file with path, name, and timestamp', () => {
      const before = Date.now();
      useRecentFilesStore.getState().addFile('/home/doc.md', 'doc.md');
      const after = Date.now();

      const { files } = useRecentFilesStore.getState();
      expect(files).toHaveLength(1);
      expect(files[0].path).toBe('/home/doc.md');
      expect(files[0].name).toBe('doc.md');
      expect(files[0].lastOpened).toBeGreaterThanOrEqual(before);
      expect(files[0].lastOpened).toBeLessThanOrEqual(after);
    });

    it('deduplicates entries by path and moves the re-opened file to the front', () => {
      useRecentFilesStore.getState().addFile('/a.md', 'a.md');
      useRecentFilesStore.getState().addFile('/b.md', 'b.md');
      useRecentFilesStore.getState().addFile('/a.md', 'a.md');

      const { files } = useRecentFilesStore.getState();
      expect(files).toHaveLength(2);
      expect(files[0].path).toBe('/a.md'); // moved to front
      expect(files[1].path).toBe('/b.md');
    });

    it('persists files to localStorage after adding', () => {
      useRecentFilesStore.getState().addFile('/test.md', 'test.md');

      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      expect(saved).toHaveLength(1);
      expect(saved[0].path).toBe('/test.md');
      expect(saved[0].name).toBe('test.md');
    });

    it('enforces the maxFiles limit of 10', () => {
      for (let i = 0; i < 15; i++) {
        useRecentFilesStore.getState().addFile(`/file${i}.md`, `file${i}.md`);
      }

      const { files } = useRecentFilesStore.getState();
      expect(files.length).toBeLessThanOrEqual(10);
    });

    it('keeps the most recent files when the limit is exceeded', () => {
      for (let i = 0; i < 12; i++) {
        useRecentFilesStore.getState().addFile(`/file${i}.md`, `file${i}.md`);
      }

      const { files } = useRecentFilesStore.getState();
      expect(files).toHaveLength(10);
      // The most recent should be file11 (last added)
      expect(files[0].path).toBe('/file11.md');
      // The oldest should be dropped (file0, file1 should be gone)
      const paths = files.map((f) => f.path);
      expect(paths).not.toContain('/file0.md');
      expect(paths).not.toContain('/file1.md');
    });
  });

  describe('removeFile', () => {
    it('removes a file by its path', () => {
      useRecentFilesStore.getState().addFile('/keep.md', 'keep.md');
      useRecentFilesStore.getState().addFile('/remove.md', 'remove.md');

      useRecentFilesStore.getState().removeFile('/remove.md');

      const { files } = useRecentFilesStore.getState();
      expect(files).toHaveLength(1);
      expect(files[0].path).toBe('/keep.md');
    });

    it('updates localStorage after removing a file', () => {
      useRecentFilesStore.getState().addFile('/a.md', 'a.md');
      useRecentFilesStore.getState().addFile('/b.md', 'b.md');
      useRecentFilesStore.getState().removeFile('/a.md');

      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      expect(saved).toHaveLength(1);
      expect(saved[0].path).toBe('/b.md');
    });

    it('does nothing when the path does not exist', () => {
      useRecentFilesStore.getState().addFile('/exists.md', 'exists.md');
      useRecentFilesStore.getState().removeFile('/nonexistent.md');

      expect(useRecentFilesStore.getState().files).toHaveLength(1);
    });
  });

  describe('clearFiles', () => {
    it('empties the files array', () => {
      useRecentFilesStore.getState().addFile('/a.md', 'a.md');
      useRecentFilesStore.getState().addFile('/b.md', 'b.md');
      useRecentFilesStore.getState().addFile('/c.md', 'c.md');

      useRecentFilesStore.getState().clearFiles();

      expect(useRecentFilesStore.getState().files).toEqual([]);
    });

    it('removes the localStorage key entirely', () => {
      useRecentFilesStore.getState().addFile('/doc.md', 'doc.md');
      useRecentFilesStore.getState().clearFiles();

      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });
});
