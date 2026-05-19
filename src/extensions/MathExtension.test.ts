import { describe, it, expect, vi } from 'vitest';

vi.mock('katex', () => ({
  default: {
    renderToString: vi.fn((input: string) => `<span class="katex">${input}</span>`),
  },
}));

import katex from 'katex';
import { MathExtension, InlineMathExtension } from './MathExtension';

function renderBlockMath(attrs: Record<string, any> = {}) {
  return (MathExtension as any).config.renderHTML.call(MathExtension, { HTMLAttributes: attrs });
}

function renderInlineMath(attrs: Record<string, any> = {}) {
  return (InlineMathExtension as any).config.renderHTML.call(InlineMathExtension, {
    HTMLAttributes: attrs,
  });
}

// ====================================================================
// Block Math Extension
// ====================================================================

describe('MathExtension (block)', () => {
  it('has name "math"', () => {
    expect(MathExtension.name).toBe('math');
  });

  it('has group "block"', () => {
    expect((MathExtension as any).config.group).toBe('block');
  });

  it('is an atom node', () => {
    expect((MathExtension as any).config.atom).toBe(true);
  });

  it('parseHTML matches div[data-type="math"]', () => {
    const rules = (MathExtension as any).config.parseHTML.call(MathExtension);
    expect(rules).toHaveLength(1);
    expect(rules[0].tag).toBe('div[data-type="math"]');
  });
});

// ====================================================================
// Inline Math Extension
// ====================================================================

describe('InlineMathExtension', () => {
  it('has name containing "inline"', () => {
    expect(InlineMathExtension.name).toContain('inline');
  });

  it('has name "inlineMath"', () => {
    expect(InlineMathExtension.name).toBe('inlineMath');
  });

  it('is an inline node type', () => {
    expect((InlineMathExtension as any).config.inline).toBe(true);
  });

  it('parseHTML matches span[data-type="inlineMath"]', () => {
    const rules = (InlineMathExtension as any).config.parseHTML.call(InlineMathExtension);
    expect(rules[0].tag).toBe('span[data-type="inlineMath"]');
  });

  it('renderHTML outputs inline math span', () => {
    const result = renderInlineMath({ 'data-content': 'a+b' });
    expect(result[0]).toBe('span');
    expect(result[1]).toHaveProperty('data-type', 'inlineMath');
  });
});

// ====================================================================
// safeKatexRender (tested via renderHTML output)
// ====================================================================

describe('safeKatexRender (via renderHTML)', () => {
  it('valid LaTeX -> rendered HTML with katex', () => {
    const result = renderBlockMath({ 'data-content': 'x^2' });
    const rendered = result[2][2];
    expect(rendered).toContain('katex');
    expect(rendered).toContain('x^2');
  });

  it('empty string -> empty string', () => {
    const result = renderBlockMath({ 'data-content': '' });
    const rendered = result[2][2];
    expect(rendered).toBe('');
  });

  it('missing data-content (null/undefined) -> empty string', () => {
    const result = renderBlockMath({});
    const rendered = result[2][2];
    expect(rendered).toBe('');
  });

  it('invalid LaTeX -> fallback with math-error class', () => {
    vi.mocked(katex.renderToString).mockImplementationOnce(() => {
      throw new Error('KaTeX parse error');
    });

    const result = renderBlockMath({ 'data-content': '\\invalid' });
    const rendered = result[2][2];
    expect(rendered).toContain('math-error');
    expect(rendered).toContain('\\invalid');
  });
});
