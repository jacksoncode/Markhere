import { Node, mergeAttributes } from '@tiptap/core';

export const ColumnLayout = Node.create({
  name: 'columnLayout',
  group: 'block',
  content: 'column{2}',
  parseHTML() { return [{ tag: 'div[data-type="columns"]' }]; },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'columns', style: 'display:flex;gap:16px' }), 0];
  },
});

export const Column = Node.create({
  name: 'column',
  group: 'block',
  content: 'block+',
  parseHTML() { return [{ tag: 'div[data-type="column"]' }]; },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'column', style: 'flex:1;min-width:0' }), 0];
  },
});
