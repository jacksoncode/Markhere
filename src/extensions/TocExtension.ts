import { Node, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

/**
 * 匹配文档中单独成段的 [TOC] / [toc] / [[TOC]] 等写法，
 * 在事务提交后自动转换为 toc 节点（块级原子节点）。
 */
const TOC_PLACEHOLDER = /^\[\[?\s*toc\s*\]\]?$/i;

export interface TocHeading {
  level: number;
  text: string;
  pos: number;
}

export const TocExtension = Node.create({
  name: 'toc',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {};
  },

  parseHTML() {
    return [{ tag: 'div[data-type="toc"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'toc', class: 'toc-block' }),
    ];
  },

  addNodeView() {
    return ({ editor }) => {
      const dom = document.createElement('div');
      dom.className = 'toc-block';
      dom.setAttribute('data-type', 'toc');

      const renderToc = () => {
        const headings: TocHeading[] = [];
        editor.state.doc.descendants((node, pos) => {
          if (node.type.name === 'heading') {
            headings.push({
              level: node.attrs.level ?? 1,
              text: node.textContent,
              pos,
            });
          }
        });

        dom.innerHTML = '';

        const title = document.createElement('div');
        title.className = 'toc-title';
        title.textContent = '目录';
        dom.appendChild(title);

        if (headings.length === 0) {
          const empty = document.createElement('div');
          empty.className = 'toc-empty';
          empty.textContent = '暂无标题';
          dom.appendChild(empty);
          return;
        }

        const list = document.createElement('ul');
        list.className = 'toc-list';
        headings.forEach((h) => {
          const li = document.createElement('li');
          li.className = `toc-item toc-level-${h.level}`;

          const a = document.createElement('a');
          a.className = 'toc-link';
          a.textContent = h.text || '(无标题)';
          a.href = 'javascript:void(0)';
          a.addEventListener('click', (e) => {
            e.preventDefault();
            // 跳转到标题内容起始位置并滚动到可视区域
            editor
              .chain()
              .setTextSelection(h.pos + 1)
              .scrollIntoView()
              .run();
          });

          li.appendChild(a);
          list.appendChild(li);
        });
        dom.appendChild(list);
      };

      renderToc();

      // 标题增删/修改时实时刷新目录
      const updateHandler = () => renderToc();
      editor.on('update', updateHandler);

      return {
        dom,
        destroy() {
          editor.off('update', updateHandler);
        },
      };
    };
  },

  addProseMirrorPlugins() {
    const tocType = this.type;
    return [
      new Plugin({
        key: new PluginKey('toc-auto-convert'),
        appendTransaction(transactions, _oldState, newState) {
          if (!transactions.some((tr) => tr.docChanged)) return null;
          const { doc, schema } = newState;
          if (!schema.nodes.toc) return null;

          // 先收集所有匹配段落（倒序替换，避免位置偏移）
          const matches: { pos: number; size: number }[] = [];
          doc.descendants((node, pos, parent) => {
            if (
              parent &&
              parent.type.name === 'doc' &&
              node.type.name === 'paragraph' &&
              TOC_PLACEHOLDER.test(node.textContent.trim())
            ) {
              matches.push({ pos, size: node.nodeSize });
            }
          });

          if (matches.length === 0) return null;

          if (matches.length === 0) return null;

          const tr = newState.tr;
          for (let i = matches.length - 1; i >= 0; i--) {
            const { pos, size } = matches[i];
            tr.replaceWith(pos, pos + size, tocType.create());
          }
          return tr;
        },
      }),
    ];
  },

  addStorage() {
    // 导出为 Markdown 时序列化为 [TOC]，保证文件往返一致
    return {
      markdown: {
        serialize(state: any, node: any) {
          state.write('[TOC]');
          state.closeBlock(node);
        },
      },
    };
  },
});
