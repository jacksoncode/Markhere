import { describe, it, expect, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { BlockDragHandleExtension, dragHandlePluginKey } from './BlockDragHandleExtension';

function makeEditor() {
  const element = document.createElement('div');
  // The plugin mounts its handle into the editor DOM's parent.
  const wrapper = document.createElement('div');
  wrapper.appendChild(element);
  document.body.appendChild(wrapper);
  return new Editor({
    element,
    extensions: [Document, Paragraph, Text, BlockDragHandleExtension],
    content: '<p>one</p><p>two</p><p>three</p>',
  });
}

describe('BlockDragHandleExtension', () => {
  let editor: Editor;

  afterEach(() => {
    editor?.destroy();
  });

  it('has name "blockDragHandle"', () => {
    expect(BlockDragHandleExtension.name).toBe('blockDragHandle');
  });

  it('registers its plugin and mounts a handle element', () => {
    editor = makeEditor();
    // Plugin is present in state.
    expect(dragHandlePluginKey.get(editor.state)).toBeTruthy();
    // Handle element was appended to the editor DOM's parent.
    const handle = document.querySelector('.block-drag-handle');
    expect(handle).not.toBeNull();
    expect(handle?.getAttribute('draggable')).toBe('true');
  });

  it('removes the handle on destroy', () => {
    editor = makeEditor();
    expect(document.querySelector('.block-drag-handle')).not.toBeNull();
    editor.destroy();
    expect(document.querySelector('.block-drag-handle')).toBeNull();
    // Prevent afterEach double-destroy.
    editor = undefined as any;
  });
});
