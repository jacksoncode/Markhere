import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

interface SlashItem {
  id: string;
  label: string;
  icon: string;
  action: (editor: any) => void;
  group: string;
}

const SLASH_ITEMS: SlashItem[] = [
  { id: 'h1', label: 'Heading 1', icon: 'H1', group: 'Text', action: (e) => e.chain().focus().toggleHeading({level:1}).run() },
  { id: 'h2', label: 'Heading 2', icon: 'H2', group: 'Text', action: (e) => e.chain().focus().toggleHeading({level:2}).run() },
  { id: 'h3', label: 'Heading 3', icon: 'H3', group: 'Text', action: (e) => e.chain().focus().toggleHeading({level:3}).run() },
  { id: 'bullet', label: 'Bullet List', icon: '•', group: 'List', action: (e) => e.chain().focus().toggleBulletList().run() },
  { id: 'numbered', label: 'Numbered List', icon: '1.', group: 'List', action: (e) => e.chain().focus().toggleOrderedList().run() },
  { id: 'task', label: 'Task List', icon: '☑', group: 'List', action: (e) => e.chain().focus().toggleTaskList().run() },
  { id: 'quote', label: 'Quote', icon: '"', group: 'Block', action: (e) => e.chain().focus().toggleBlockquote().run() },
  { id: 'code', label: 'Code Block', icon: '</>', group: 'Block', action: (e) => e.chain().focus().toggleCodeBlock().run() },
  { id: 'table', label: 'Table', icon: '⊞', group: 'Block', action: (e) => e.chain().focus().insertTable({rows:3,cols:3,withHeaderRow:true}).run() },
  { id: 'divider', label: 'Divider', icon: '—', group: 'Block', action: (e) => e.chain().focus().setHorizontalRule().run() },
  { id: 'callout-info', label: 'Info Callout', icon: '💡', group: 'Callout', action: (e) => e.chain().focus().insertContent('> 💡 **Info**\n> \n').run() },
  { id: 'callout-warn', label: 'Warning Callout', icon: '⚠️', group: 'Callout', action: (e) => e.chain().focus().insertContent('> ⚠️ **Warning**\n> \n').run() },
  { id: 'callout-tip', label: 'Tip Callout', icon: '✅', group: 'Callout', action: (e) => e.chain().focus().insertContent('> ✅ **Tip**\n> \n').run() },
  { id: 'toggle', label: 'Toggle Block', icon: '▶', group: 'Block', action: (e) => e.chain().focus().wrapIn('toggleBlock').run() },
  { id: 'image', label: 'Image', icon: '🖼', group: 'Media', action: (_e) => {} },
  { id: 'dataview', label: 'Dataview Query', icon: '🔍', group: 'Block', action: (e) => e.chain().focus().insertDataview().run() },
];

export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('slashCommand'),
        props: {
          handleKeyDown(view, event) {
            if (event.key === '/') {
              const { $from } = view.state.selection;
              const textBefore = $from.nodeBefore?.text;
              // Only trigger at line start or after space
              if (textBefore === '' || textBefore === undefined || textBefore === null) {
                return false; // Let normal typing handle
              }
            }
            return false;
          },
        },
      }),
    ];
  },
});

export { SLASH_ITEMS, type SlashItem };
