import { describe, it, expect } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import { CodeBlockToolbar } from './CodeBlockToolbar';

function makeEditor() {
  const el = document.createElement('div');
  return new Editor({
    element: el,
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Markdown.configure({ html: false, breaks: true, linkify: true }),
      CodeBlockToolbar,
    ],
    content: '',
  });
}

describe('CodeBlockToolbar', () => {
  it('loads documents containing fenced code blocks without throwing', () => {
    const editor = makeEditor();
    // Regression: a code block (with or without a preceding [TOC]) used to
    // throw inside the NodeView's Prism.highlight() call, which left the
    // editor in a broken/partial state showing only the already-parsed text.
    const md = '# Title\n\n[TOC]\n\n## Section\n\n```js\nconst a = 1;\n```\n\nbody text here.\n';
    expect(() => editor.commands.setContent(md)).not.toThrow();
    expect(editor.getText()).toContain('body text here');

    const json = editor.getJSON();
    expect(JSON.stringify(json)).toContain('"type":"codeBlock"');
    expect(editor.getHTML()).toContain('const a = 1;');
    editor.destroy();
  });

  it('serializes code blocks via getHTML without throwing', () => {
    const editor = makeEditor();
    editor.commands.setContent('# A\n\n```python\nprint(1)\n```\n');
    expect(() => editor.getHTML()).not.toThrow();
    expect(editor.getHTML()).toContain('print(1)');
    editor.destroy();
  });
});
