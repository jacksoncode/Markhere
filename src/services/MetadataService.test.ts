import { describe, it, expect } from 'vitest';
import { MetadataService } from './MetadataService';

describe('MetadataService', () => {
  it('indexes a note with frontmatter', () => {
    MetadataService.indexNote('/test.md', '---\ntitle: Hello\ntags: [a, b]\n---\n# Content');
    const meta = MetadataService.getAll().find(m => m.path === '/test.md');
    expect(meta).toBeTruthy();
    expect(meta?.title).toBe('Hello');
    expect(meta?.tags).toEqual(['a', 'b']);
  });

  it('queries by nested tag', () => {
    MetadataService.indexNote('/a.md', '---\ntags: [project/design, ui]\n---');
    MetadataService.indexNote('/b.md', '---\ntags: [project/dev]\n---');
    expect(MetadataService.queryByTag('project/design')).toHaveLength(1);
    expect(MetadataService.queryByTag('ui')).toHaveLength(1);
  });

  it('clears all entries', () => {
    MetadataService.indexNote('/test.md', '# Test');
    MetadataService.clear();
    expect(MetadataService.getAll()).toHaveLength(0);
  });
});
