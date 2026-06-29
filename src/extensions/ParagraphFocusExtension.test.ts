import { describe, it, expect, afterEach, vi } from 'vitest';
import { Editor } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { ParagraphFocusExtension, paragraphFocusPluginKey } from './ParagraphFocusExtension';
import { useUIState } from '../store/uiStore';

function makeEditor(html: string) {
  const element = document.createElement('div');
  document.body.appendChild(element);
  return new Editor({
    element,
    extensions: [Document, Paragraph, Text, ParagraphFocusExtension],
    content: html,
  });
}

/** Count `.pf-dim` decorations currently produced by the plugin. */
function dimCount(editor: Editor): number {
  const set: any = paragraphFocusPluginKey.getState(editor.state);
  // DecorationSet has no public length; use find() across the whole doc.
  return set ? set.find().length : 0;
}

describe('ParagraphFocusExtension', () => {
  afterEach(() => {
    useUIState.setState({ focusMode: false });
    vi.restoreAllMocks();
  });

  it('has name "paragraphFocus"', () => {
    expect(ParagraphFocusExtension.name).toBe('paragraphFocus');
  });

  it('produces no decorations when focus mode is off', () => {
    useUIState.setState({ focusMode: false });
    const editor = makeEditor('<p>one</p><p>two</p><p>three</p>');
    editor.commands.setTextSelection(2);
    expect(dimCount(editor)).toBe(0);
    editor.destroy();
  });

  it('dims all blocks except the active one when focus mode is on', () => {
    useUIState.setState({ focusMode: true });
    const editor = makeEditor('<p>one</p><p>two</p><p>three</p>');
    // Place caret in the first paragraph, then signal a refresh.
    editor.commands.setTextSelection(2);
    editor.view.dispatch(editor.state.tr.setMeta(paragraphFocusPluginKey, true));
    // 3 blocks, 1 active → 2 dimmed
    expect(dimCount(editor)).toBe(2);
    editor.destroy();
  });
});
