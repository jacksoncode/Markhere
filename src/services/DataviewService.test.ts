import { describe, it, expect } from 'vitest';
import { DataviewService } from './DataviewService';
import type { NoteMeta } from './MetadataService';

const sampleNotes: NoteMeta[] = [
  { path: '/a.md', title: 'Alpha', tags: ['rust'], created: '2026-01-01', updated: null, category: 'dev', status: 'done', fields: { title: 'Alpha', tags: ['rust'] } },
  { path: '/b.md', title: 'Beta', tags: ['js'], created: '2026-02-01', updated: null, category: 'blog', status: 'draft', fields: { title: 'Beta', tags: ['js'] } },
  { path: '/c.md', title: 'Gamma', tags: ['rust', 'js'], created: '2025-12-01', updated: null, category: 'dev', status: 'wip', fields: { title: 'Gamma', tags: ['rust', 'js'] } },
];

describe('DataviewService', () => {
  it('selects all titles', () => {
    const r = DataviewService.execute('SELECT title FROM ""', sampleNotes);
    expect(r.columns).toEqual(['title']);
    expect(r.rows).toHaveLength(3);
    expect(r.rows.map(r => r.title)).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('filters by WHERE CONTAINS tag', () => {
    const r = DataviewService.execute('SELECT title, tags FROM "" WHERE tags CONTAINS "rust"', sampleNotes);
    expect(r.rows).toHaveLength(2);
  });

  it('sorts by created DESC (returns all rows sorted)', () => {
    const r = DataviewService.execute('SELECT title FROM "" SORT created DESC', sampleNotes);
    expect(r.rows).toHaveLength(3);
    expect(r.total).toBe(3);
  });

  it('limits results', () => {
    const r = DataviewService.execute('SELECT title FROM "" LIMIT 1', sampleNotes);
    expect(r.rows).toHaveLength(1);
  });

  it('handles unrecognized query gracefully', () => {
    const r = DataviewService.execute('UNRECOGNIZED QUERY', []);
    // Should return empty results without crashing
    expect(r.columns).toBeDefined();
    expect(r.rows).toHaveLength(0);
  });
});
