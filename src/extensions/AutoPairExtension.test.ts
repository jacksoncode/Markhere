import { describe, it, expect, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { AutoPairExtension } from './AutoPairExtension';

// ---------------------------------------------------------------------------
// Helpers — build a minimal real editor and drive text input through the
// ProseMirror view so handleTextInput / handleKeyDown actually fire.
// ---------------------------------------------------------------------------

function makeEditor(initial = '') {
  const element = document.createElement('div');
  document.body.appendChild(element);
  const editor = new Editor({
    element,
    extensions: [Document, Paragraph, Text, AutoPairExtension],
    content: initial ? `<p>${initial}</p>` : '<p></p>',
  });
  return editor;
}

/** Simulate a single character of text input at the current selection. */
function typeChar(editor: Editor, char: string) {
  const { from, to } = editor.state.selection;
  // handleTextInput returns true when the plugin handled it; otherwise we
  // perform the default insert so subsequent assertions reflect real state.
  const handled = editor.view.someProp('handleTextInput', (f) =>
    (f as any)(editor.view, from, to, char),
  );
  if (!handled) {
    editor.view.dispatch(editor.state.tr.insertText(char, from, to));
  }
}

describe('AutoPairExtension', () => {
  let editor: Editor;

  afterEach(() => {
    editor?.destroy();
  });

  it('has name "autoPair"', () => {
    editor = makeEditor();
    expect(AutoPairExtension.name).toBe('autoPair');
  });

  it('inserts the matching closer and keeps caret inside', () => {
    editor = makeEditor();
    editor.commands.focus();
    typeChar(editor, '(');
    expect(editor.getText()).toBe('()');
    // Caret should sit between the pair (position 2 in a doc: <p>|</p> -> 1..)
    expect(editor.state.selection.from).toBe(2);
  });

  it('wraps a non-empty selection', () => {
    editor = makeEditor('hello');
    // select the whole word "hello" (positions 1..6)
    editor.commands.setTextSelection({ from: 1, to: 6 });
    typeChar(editor, '"');
    expect(editor.getText()).toBe('"hello"');
  });

  it('types over an existing closer instead of duplicating', () => {
    editor = makeEditor();
    editor.commands.focus();
    typeChar(editor, '(');
    // caret between ( ) — typing ) should step over, not add another
    typeChar(editor, ')');
    expect(editor.getText()).toBe('()');
    expect(editor.state.selection.from).toBe(3);
  });

  it('does not pair a quote directly after a word character', () => {
    editor = makeEditor('dont');
    editor.commands.setTextSelection({ from: 5, to: 5 }); // caret after "dont"
    typeChar(editor, "'");
    expect(editor.getText()).toBe("dont'");
  });

  it('still pairs brackets after a word character', () => {
    editor = makeEditor('fn');
    editor.commands.setTextSelection({ from: 3, to: 3 });
    typeChar(editor, '(');
    expect(editor.getText()).toBe('fn()');
  });

  it('backspace between an empty pair deletes both', () => {
    editor = makeEditor();
    editor.commands.focus();
    typeChar(editor, '[');
    expect(editor.getText()).toBe('[]');
    const handled = editor.view.someProp('handleKeyDown', (f) =>
      (f as any)(editor.view, new KeyboardEvent('keydown', { key: 'Backspace' })),
    );
    expect(handled).toBe(true);
    expect(editor.getText()).toBe('');
  });
});
