import { describe, it, expect, afterEach, vi } from 'vitest';
import { Editor } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { Markdown } from 'tiptap-markdown';
import { DataviewBlock } from './DataviewBlock';

// MetadataService.getAll is called when the NodeView renders; stub it so the
// query runs against a known dataset without touching the filesystem.
vi.mock('../services/MetadataService', () => ({
  MetadataService: {
    getAll: () => [
      { title: 'Alpha', tags: ['x'], created: '2026-01-01', category: '', status: '', path: '/a.md', fields: {} },
      { title: 'Beta', tags: ['y'], created: '2026-02-01', category: '', status: '', path: '/b.md', fields: {} },
    ],
  },
}));

function makeEditor(content = '<p></p>') {
  const element = document.createElement('div');
  document.body.appendChild(element);
  return new Editor({
    element,
    extensions: [Document, Paragraph, Text, Markdown, DataviewBlock],
    content,
  });
}

describe('DataviewBlock', () => {
  let editor: Editor;
  afterEach(() => editor?.destroy());

  it('has name "dataviewBlock" and is an atom block', () => {
    expect(DataviewBlock.name).toBe('dataviewBlock');
    expect((DataviewBlock as any).config.atom).toBe(true);
    expect((DataviewBlock as any).config.group).toBe('block');
  });

  it('parses a ```dataview fence from markdown into a dataview node', () => {
    editor = makeEditor();
    const md = '```dataview\nSELECT title FROM "" LIMIT 5\n```';
    editor.commands.setContent(
      (editor.storage as any).markdown.parser.parse(md),
    );
    let found: any = null;
    editor.state.doc.descendants((n) => {
      if (n.type.name === 'dataviewBlock') found = n;
    });
    expect(found).not.toBeNull();
    expect(found.attrs.query).toContain('SELECT title');
  });

  it('serializes a dataview node back to a ```dataview fence', () => {
    editor = makeEditor();
    editor.commands.insertDataview('SELECT title FROM "" LIMIT 3');
    const out = (editor.storage as any).markdown.getMarkdown();
    expect(out).toContain('```dataview');
    expect(out).toContain('SELECT title FROM "" LIMIT 3');
  });

  it('round-trips query content through markdown', () => {
    editor = makeEditor();
    const query = 'SELECT title, tags FROM "" WHERE tags CONTAINS "x" SORT created DESC';
    const md = '```dataview\n' + query + '\n```';
    editor.commands.setContent(
      (editor.storage as any).markdown.parser.parse(md),
    );
    const out = (editor.storage as any).markdown.getMarkdown();
    expect(out).toContain(query);
  });
});
