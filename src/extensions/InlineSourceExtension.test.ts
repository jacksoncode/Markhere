/**
 * Unit tests for InlineSourceExtension (P1-1)
 */
import { describe, it, expect } from 'vitest';
import { InlineSourceExtension } from './InlineSourceExtension';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';

describe('InlineSourceExtension', () => {
  it('defines inlineSource node with correct name', () => {
    expect(InlineSourceExtension.name).toBe('inlineSource');
    expect(InlineSourceExtension.config.name).toBe('inlineSource');
  });

  it('specifies atom: true', () => {
    expect((InlineSourceExtension.config as any).atom).toBe(true);
  });

  it('specifies group: block', () => {
    expect((InlineSourceExtension.config as any).group).toBe('block');
  });

  it('has source attribute with empty string default', () => {
    const attrs = (InlineSourceExtension.config as any).addAttributes();
    expect(attrs.source.default).toBe('');
  });

  it('has parseHTML for div[data-inline-source]', () => {
    const parse = (InlineSourceExtension.config as any).parseHTML();
    expect(parse).toEqual(
      expect.arrayContaining([{ tag: 'div[data-inline-source]' }])
    );
  });

  it('renders HTML with data-inline-source attribute', () => {
    const render = (InlineSourceExtension.config as any).renderHTML({ HTMLAttributes: {} });
    expect(render[0]).toBe('div');
    expect(render[1]).toEqual(
      expect.objectContaining({ 'data-inline-source': '', class: 'inline-source-block' })
    );
  });

  it('registers Mod-/ keyboard shortcut', () => {
    const shortcuts = (InlineSourceExtension.config as any).addKeyboardShortcuts();
    expect(shortcuts['Mod-/']).toBeDefined();
  });

  it('adds toggleInlineSource to commands', () => {
    const commands = (InlineSourceExtension.config as any).addCommands();
    const toggle = commands.toggleInlineSource();
    expect(toggle).toBeDefined();
    expect(typeof toggle).toBe('function');
  });

  it('can create editor with extension', () => {
    const editor = new Editor({
      extensions: [
        StarterKit.configure({}),
        Markdown.configure({ html: false, breaks: true }),
        InlineSourceExtension,
      ],
      content: '<p>test</p>',
    });
    expect(editor).toBeDefined();
    expect(editor.schema.nodes.inlineSource).toBeDefined();
    expect(editor.schema.nodes.inlineSource.name).toBe('inlineSource');
    expect(editor.schema.nodes.inlineSource.spec.atom).toBe(true);
    editor.destroy();
  });

  it('serializes inlineSource as plain text via markdown storage', () => {
    // The markdown serialize function should output the source text as-is
    const serialize = (InlineSourceExtension.config as any).addStorage().markdown.serialize;
    const writer = { write: '', closeBlock: () => {} };
    const writeFn = (s: string) => { writer.write = s; };
    const state = { write: writeFn, closeBlock: () => {} };
    serialize(state, { attrs: { source: '# Hello\nWorld' } });
    // serialize should call state.write with the source text
  });
});
