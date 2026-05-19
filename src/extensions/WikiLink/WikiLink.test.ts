import { describe, it, expect } from 'vitest';
import { WikiLink } from './WikiLink';

describe('WikiLink', () => {
  // -- Extension identity -------------------------------------------------

  it('has name "wikiLink"', () => {
    expect(WikiLink.name).toBe('wikiLink');
  });

  it('is a mark type', () => {
    expect(WikiLink.type).toBe('mark');
  });

  // -- Default options ---------------------------------------------------

  it('has valid default options', () => {
    const options = (WikiLink as any).options;
    expect(options).toHaveProperty('HTMLAttributes');
    expect(options.HTMLAttributes).toEqual({});
    expect(options).toHaveProperty('onLinkClick');
    expect(typeof options.onLinkClick).toBe('function');
  });

  // -- Parse HTML --------------------------------------------------------

  it('parseHTML extracts target and display from data attributes', () => {
    const rules = (WikiLink as any).config.parseHTML.call(WikiLink);
    expect(rules).toHaveLength(1);
    expect(rules[0].tag).toBe('a[data-type="wiki-link"]');
    expect(typeof rules[0].getAttrs).toBe('function');

    // Simulate parsing an anchor element
    const mockDom = {
      getAttribute: (attr: string) => {
        if (attr === 'data-target') return '/path/to/MyFile';
        if (attr === 'data-display') return 'MyFile';
        return null;
      },
    };
    const attrs = rules[0].getAttrs(mockDom);
    expect(attrs).toEqual({ target: '/path/to/MyFile', display: 'MyFile' });
  });

  it('parseHTML falls back to target when display is missing', () => {
    const rules = (WikiLink as any).config.parseHTML.call(WikiLink);
    const mockDom = {
      getAttribute: (attr: string) => {
        if (attr === 'data-target') return '/path/to/OnlyTarget';
        return null;
      },
    };
    const attrs = rules[0].getAttrs(mockDom);
    expect(attrs!.display).toBe('/path/to/OnlyTarget');
  });

  // -- Render HTML -------------------------------------------------------

  it('renderHTML generates correct anchor tag with wiki-link attributes', () => {
    const result = (WikiLink as any).config.renderHTML.call(WikiLink, {
      HTMLAttributes: { target: '/docs/index', display: 'Index' },
    });

    // renderHTML returns ['a', mergedAttributes, 0]
    expect(result[0]).toBe('a');
    expect(result[1]).toHaveProperty('data-type', 'wiki-link');
    expect(result[1]).toHaveProperty('data-target', '/docs/index');
    expect(result[1]).toHaveProperty('data-display', 'Index');
    expect(result[1]).toHaveProperty('class', 'wiki-link');
    // Content hole for the mark
    expect(result[2]).toBe(0);
  });

  it('renderHTML uses target as display fallback', () => {
    const result = (WikiLink as any).config.renderHTML.call(WikiLink, {
      HTMLAttributes: { target: '/docs/readme' },
    });

    expect(result[1]).toHaveProperty('data-display', '/docs/readme');
  });

  // -- Command -----------------------------------------------------------

  it('addCommands includes setWikiLink', () => {
    const commands = (WikiLink as any).config.addCommands.call(WikiLink);
    expect(commands).toHaveProperty('setWikiLink');
    expect(typeof commands.setWikiLink).toBe('function');
  });

  // -- Plugin & Input rules ----------------------------------------------

  it('addProseMirrorPlugins returns empty array', () => {
    const plugins = (WikiLink as any).config.addProseMirrorPlugins.call(WikiLink);
    expect(plugins).toEqual([]);
  });

  it('addInputRules returns empty array', () => {
    const rules = (WikiLink as any).config.addInputRules.call(WikiLink);
    expect(rules).toEqual([]);
  });
});
