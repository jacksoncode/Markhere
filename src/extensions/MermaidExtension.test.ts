import { describe, it, expect, vi } from 'vitest';

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(),
  },
}));

import { MermaidExtension } from './MermaidExtension';

describe('MermaidExtension', () => {
  it('has name "mermaid"', () => {
    expect(MermaidExtension.name).toBe('mermaid');
  });

  it('is an atomic node type', () => {
    expect((MermaidExtension as any).config.atom).toBe(true);
  });

  it('has group "block"', () => {
    expect((MermaidExtension as any).config.group).toBe('block');
  });

  it('parseHTML recognizes mermaid container divs', () => {
    const rules = (MermaidExtension as any).config.parseHTML.call(MermaidExtension);
    expect(rules).toHaveLength(1);
    expect(rules[0].tag).toBe('div[data-type="mermaid"]');
  });

  it('renderHTML outputs correct wrapper structure', () => {
    const result = (MermaidExtension as any).config.renderHTML.call(MermaidExtension, {
      HTMLAttributes: { 'data-content': 'graph TD\n  A-->B' },
    });

    // renderHTML returns ['div', mergedAttrs, 0]
    // The first element is the tag name
    expect(result[0]).toBe('div');
    // The second element contains merged attributes
    expect(result[1]).toHaveProperty('data-type', 'mermaid');
    expect(result[1]).toHaveProperty('class', 'mermaid-block');
    // The third element is 0 (hole for content)
    expect(result[2]).toBe(0);
  });
});
