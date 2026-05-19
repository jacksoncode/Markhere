import { describe, it, expect } from 'vitest';
import { FootnoteExtension } from './FootnoteExtension';

describe('FootnoteExtension', () => {
  // -- Extension identity -------------------------------------------------

  it('has name "footnote"', () => {
    expect(FootnoteExtension.name).toBe('footnote');
  });

  it('has type "node"', () => {
    expect(FootnoteExtension.type).toBe('node');
  });

  it('is an inline node', () => {
    expect((FootnoteExtension as any).config.inline).toBe(true);
  });

  it('is an atom node', () => {
    expect((FootnoteExtension as any).config.atom).toBe(true);
  });

  // -- Parse HTML --------------------------------------------------------

  it('parseHTML matches span[data-type="footnote"]', () => {
    const rules = (FootnoteExtension as any).config.parseHTML.call(FootnoteExtension);
    expect(rules).toHaveLength(1);
    expect(rules[0].tag).toBe('span[data-type="footnote"]');
  });

  // -- Render HTML -------------------------------------------------------

  it('renderHTML outputs footnote reference span with correct attributes', () => {
    const result = (FootnoteExtension as any).config.renderHTML.call(FootnoteExtension, {
      HTMLAttributes: { 'data-content': 'A footnote note', 'data-number': 1 },
    });

    // renderHTML returns ['span', mergedAttrs, '[number]']
    expect(result[0]).toBe('span');
    expect(result[1]).toHaveProperty('data-type', 'footnote');
    expect(result[1]).toHaveProperty('class', 'footnote-ref');
    expect(result[2]).toBe('[1]');
  });

  it('renderHTML includes the footnote number in brackets', () => {
    const result5 = (FootnoteExtension as any).config.renderHTML.call(FootnoteExtension, {
      HTMLAttributes: { 'data-content': 'Note 5', 'data-number': 5 },
    });
    expect(result5[2]).toBe('[5]');

    const result99 = (FootnoteExtension as any).config.renderHTML.call(FootnoteExtension, {
      HTMLAttributes: { 'data-content': 'Note 99', 'data-number': 99 },
    });
    expect(result99[2]).toBe('[99]');
  });

  // -- Attributes --------------------------------------------------------

  it('parses content from data-content attribute', () => {
    const attrs = (FootnoteExtension as any).config.addAttributes.call(FootnoteExtension);
    const el = { getAttribute: (_name: string) => 'My footnote text' };
    expect(attrs.content.parseHTML(el)).toBe('My footnote text');
  });

  it('parses number from data-number attribute', () => {
    const attrs = (FootnoteExtension as any).config.addAttributes.call(FootnoteExtension);
    const el = { getAttribute: (_name: string) => '3' };
    expect(attrs.number.parseHTML(el)).toBe(3);
  });

  it('number defaults to 1 when data-number is missing', () => {
    const attrs = (FootnoteExtension as any).config.addAttributes.call(FootnoteExtension);
    const el = { getAttribute: (_name: string) => null };
    expect(attrs.number.parseHTML(el)).toBe(1);
  });

  // -- Commands ----------------------------------------------------------

  it('addCommands includes insertFootnote', () => {
    const commands = (FootnoteExtension as any).config.addCommands.call(FootnoteExtension);
    expect(commands).toHaveProperty('insertFootnote');
    expect(typeof commands.insertFootnote).toBe('function');
  });
});
