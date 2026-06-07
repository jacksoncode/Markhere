import { describe, it, expect } from 'vitest';
import { MermaidCache } from './mermaidCache';

describe('MermaidCache', () => {
  it('stores and retrieves SVG', () => {
    MermaidCache.set('graph TD\nA-->B', 'dark', '<svg>test</svg>');
    const cached = MermaidCache.get('graph TD\nA-->B', 'dark');
    expect(cached).toBe('<svg>test</svg>');
  });

  it('returns null for uncached entries', () => {
    expect(MermaidCache.get('nonexistent', 'dark')).toBeNull();
  });

  it('normalizes whitespace in cache keys', () => {
    MermaidCache.set('  graph  TD  \n  A-->B  ', 'dark', '<svg>ws</svg>');
    const cached = MermaidCache.get('graph TD\nA-->B', 'dark');
    expect(cached).toBe('<svg>ws</svg>');
  });

  it('clears all entries', () => {
    MermaidCache.set('flow', 'dark', '<svg>f</svg>');
    MermaidCache.clear();
    expect(MermaidCache.get('flow', 'dark')).toBeNull();
  });

  it('never exceeds max size', () => {
    MermaidCache.clear();
    for (let i = 0; i < 120; i++) {
      MermaidCache.set(`code${i}`, 'dark', `<svg>${i}</svg>`);
    }
    const stats = MermaidCache.getStats();
    expect(stats.size).toBeLessThanOrEqual(100);
  });
});
