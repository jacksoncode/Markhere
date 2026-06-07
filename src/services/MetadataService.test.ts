import { describe, it, expect, beforeEach } from 'vitest';
import { MetadataService } from './MetadataService';

describe('MetadataService', () => {
  beforeEach(() => { MetadataService.clear(); });

  it('parses YAML frontmatter correctly', () => {
    const md = `---
title: My Note
tags: [project, rust]
category: dev
created: 2026-01-01
status: draft
---

# Content
Hello world.`;

    MetadataService.indexNote('/notes/test.md', md);
    const all = MetadataService.getAll();
    expect(all).toHaveLength(1);

    const m = all[0];
    expect(m.title).toBe('My Note');
    expect(m.tags).toEqual(['project', 'rust']);
    expect(m.category).toBe('dev');
    expect(m.created).toBe('2026-01-01');
    expect(m.status).toBe('draft');
    expect(m.path).toBe('/notes/test.md');
  });

  it('falls back to filename when no title in frontmatter', () => {
    MetadataService.indexNote('/notes/untitled.md', '# Just content');
    expect(MetadataService.getAll()[0].title).toBe('untitled');
  });

  it('parses quoted values', () => {
    const md = `---
title: "Quoted Title"
category: 'single-quoted'
---`;

    MetadataService.indexNote('/notes/q.md', md);
    const m = MetadataService.getAll()[0];
    expect(m.title).toBe('Quoted Title');
    expect(m.category).toBe('single-quoted');
  });

  it('queries by tag', () => {
    MetadataService.indexNote('/a.md', '---\ntags: [rust]\n---');
    MetadataService.indexNote('/b.md', '---\ntags: [js]\n---');
    MetadataService.indexNote('/c.md', '---\ntags: [rust, js]\n---');

    expect(MetadataService.queryByTag('rust')).toHaveLength(2);
    expect(MetadataService.queryByTag('js')).toHaveLength(2);
    expect(MetadataService.queryByTag('python')).toHaveLength(0);
  });

  it('queries by category', () => {
    MetadataService.indexNote('/a.md', '---\ncategory: blog\n---');
    MetadataService.indexNote('/b.md', '---\ncategory: blog\n---');
    MetadataService.indexNote('/c.md', '---\ncategory: daily\n---');

    expect(MetadataService.queryByCategory('blog')).toHaveLength(2);
    expect(MetadataService.queryByCategory('daily')).toHaveLength(1);
  });

  it('removes note from index', () => {
    MetadataService.indexNote('/notes/a.md', '# A');
    expect(MetadataService.getAll()).toHaveLength(1);
    MetadataService.removeNote('/notes/a.md');
    expect(MetadataService.getAll()).toHaveLength(0);
  });

  it('returns stats', () => {
    MetadataService.indexNote('/a.md', '# A');
    const stats = MetadataService.getStats();
    expect(stats.totalNotes).toBe(1);
  });
});
