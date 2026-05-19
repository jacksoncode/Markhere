import { describe, it, expect, vi } from 'vitest';

vi.mock('@tiptap/react', () => ({
  ReactNodeViewRenderer: vi.fn(() => () => ({ dom: document.createElement('div') })),
}));

// Mock the FrontmatterView import to avoid React JSX issues in unit tests
vi.mock('./FrontmatterView', () => ({
  FrontmatterView: () => null,
}));

import { FrontmatterExtension } from './FrontmatterExtension';

describe('FrontmatterExtension', () => {
  // -- Extension identity -------------------------------------------------

  it('has name "frontmatter"', () => {
    expect(FrontmatterExtension.name).toBe('frontmatter');
  });

  it('has type "node"', () => {
    expect(FrontmatterExtension.type).toBe('node');
  });

  it('has group "block"', () => {
    expect((FrontmatterExtension as any).config.group).toBe('block');
  });

  it('is defining and isolating', () => {
    expect((FrontmatterExtension as any).config.defining).toBe(true);
    expect((FrontmatterExtension as any).config.isolating).toBe(true);
  });

  // -- Parse HTML --------------------------------------------------------

  it('parseHTML matches div[data-type="frontmatter"]', () => {
    const rules = (FrontmatterExtension as any).config.parseHTML.call(FrontmatterExtension);
    expect(rules).toHaveLength(1);
    expect(rules[0].tag).toBe('div[data-type="frontmatter"]');
  });

  // -- Render HTML -------------------------------------------------------

  it('renderHTML wraps content in a div with data-type="frontmatter"', () => {
    const result = (FrontmatterExtension as any).config.renderHTML.call(FrontmatterExtension, {
      HTMLAttributes: {},
    });

    // renderHTML returns ['div', mergedAttrs, 0]
    expect(result[0]).toBe('div');
    expect(result[1]).toHaveProperty('data-type', 'frontmatter');
    // Content hole
    expect(result[2]).toBe(0);
  });

  it('renderHTML merges custom HTMLAttributes', () => {
    const result = (FrontmatterExtension as any).config.renderHTML.call(FrontmatterExtension, {
      HTMLAttributes: { class: 'custom-frontmatter' },
    });

    expect(result[1]).toHaveProperty('data-type', 'frontmatter');
    // mergeAttributes should include the custom class (exact key depends on mergeAttributes behaviour)
    expect(result[1]).toHaveProperty('class');
  });

  // -- Commands ----------------------------------------------------------

  it('addCommands includes setFrontmatter', () => {
    const commands = (FrontmatterExtension as any).config.addCommands.call(FrontmatterExtension);
    expect(commands).toHaveProperty('setFrontmatter');
    expect(typeof commands.setFrontmatter).toBe('function');
  });

  it('addCommands includes updateFrontmatter', () => {
    const commands = (FrontmatterExtension as any).config.addCommands.call(FrontmatterExtension);
    expect(commands).toHaveProperty('updateFrontmatter');
    expect(typeof commands.updateFrontmatter).toBe('function');
  });

  it('addCommands includes removeFrontmatter', () => {
    const commands = (FrontmatterExtension as any).config.addCommands.call(FrontmatterExtension);
    expect(commands).toHaveProperty('removeFrontmatter');
    expect(typeof commands.removeFrontmatter).toBe('function');
  });
});
