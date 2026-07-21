import { describe, it, expect, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Heading from '@tiptap/extension-heading';
import { Markdown } from 'tiptap-markdown';
import { TocExtension } from './TocExtension';

function makeEditor() {
  const element = document.createElement('div');
  document.body.appendChild(element);
  return new Editor({
    element,
    extensions: [
      Document,
      Paragraph,
      Text,
      Heading.configure({ levels: [1, 2, 3] }),
      Markdown.configure({ html: false, breaks: true, linkify: true }),
      TocExtension,
    ],
    content: '',
  });
}

/** 模拟文件加载后的状态：解析后得到一个顶层段落节点（内容为 [TOC]） */
function setDoc(editor: Editor, blocks: any[]) {
  editor.commands.setContent({ type: 'doc', content: blocks });
}

function paragraph(text: string) {
  return {
    type: 'paragraph',
    content: text ? [{ type: 'text', text }] : [],
  };
}

function heading(level: number, text: string) {
  return {
    type: 'heading',
    attrs: { level },
    content: [{ type: 'text', text }],
  };
}

function countNodes(editor: Editor, name: string): number {
  let count = 0;
  editor.state.doc.descendants((n) => {
    if (n.type.name === name) count++;
  });
  return count;
}

describe('TocExtension', () => {
  let editor: Editor;
  afterEach(() => editor?.destroy());

  // -- 节点元数据 ----------------------------------------------------------

  it('has name "toc" and is an atom block', () => {
    expect(TocExtension.name).toBe('toc');
    expect((TocExtension as any).config.atom).toBe(true);
    expect((TocExtension as any).config.group).toBe('block');
  });

  it('parseHTML matches div[data-type="toc"]', () => {
    const rules = (TocExtension as any).config.parseHTML.call(TocExtension);
    expect(rules).toEqual([{ tag: 'div[data-type="toc"]' }]);
  });

  // -- [TOC] 自动转换为目录节点 --------------------------------------------

  it('converts a standalone [TOC] paragraph into a toc node', () => {
    editor = makeEditor();
    setDoc(editor, [paragraph('[TOC]'), heading(1, 'Title'), heading(2, 'Sub')]);

    expect(countNodes(editor, 'toc')).toBe(1);
    expect(countNodes(editor, 'heading')).toBe(2);

    // 原 [TOC] 段落已被替换
    let leftover = 0;
    editor.state.doc.descendants((n) => {
      if (n.type.name === 'paragraph' && /\[TOC\]/.test(n.textContent)) leftover++;
    });
    expect(leftover).toBe(0);
  });

  it('does not convert a paragraph where [TOC] is only inline text', () => {
    editor = makeEditor();
    setDoc(editor, [paragraph('see [TOC] below')]);
    expect(countNodes(editor, 'toc')).toBe(0);
    expect(countNodes(editor, 'paragraph')).toBe(1);
  });

  it('handles case-insensitive and bracketed variants', () => {
    editor = makeEditor();
    setDoc(editor, [paragraph('[[TOC]]')]);
    expect(countNodes(editor, 'toc')).toBe(1);

    editor = makeEditor();
    setDoc(editor, [paragraph('[toc]')]);
    expect(countNodes(editor, 'toc')).toBe(1);
  });

  it('converts multiple [TOC] placeholders', () => {
    editor = makeEditor();
    setDoc(editor, [paragraph('[TOC]'), heading(1, 'A'), paragraph('[TOC]')]);
    expect(countNodes(editor, 'toc')).toBe(2);
  });

  // -- markdown 往返 --------------------------------------------------------

  it('serializes a toc node back to [TOC]', () => {
    editor = makeEditor();
    setDoc(editor, [paragraph('[TOC]'), heading(1, 'Title')]);
    const md = (editor.storage as any).markdown.getMarkdown();
    expect(md).toContain('[TOC]');
  });
});
