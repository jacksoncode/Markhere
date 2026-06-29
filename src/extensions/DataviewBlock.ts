import { Node, mergeAttributes } from '@tiptap/core';
import { DataviewService } from '../services/DataviewService';
import { MetadataService } from '../services/MetadataService';

/**
 * Inline Dataview query block (Obsidian's signature feature). A fenced
 * ```dataview block is rendered inline as a live result table/list instead of
 * raw code. Clicking the result reveals an editable query.
 *
 * Markdown round-trip:
 *  - serialize → ```dataview\n<query>\n```
 *  - parse     → a markdown-it `fence` renderer override emits
 *                <div data-type="dataview" data-query="..."> which this node's
 *                parseHTML matches.
 */

export interface DataviewOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    dataviewBlock: {
      insertDataview: (query?: string) => ReturnType;
    };
  }
}

const DEFAULT_QUERY = 'SELECT title, tags, created FROM "" SORT created DESC LIMIT 20';

function runQuery(query: string) {
  const notes = MetadataService.getAll();
  return DataviewService.execute(query, notes);
}

function renderResult(container: HTMLElement, query: string) {
  const result = runQuery(query);
  container.innerHTML = '';

  if (result.error) {
    const err = document.createElement('div');
    err.className = 'dataview-error';
    err.textContent = `Query error: ${result.error}`;
    container.appendChild(err);
    return;
  }

  if (result.total === 0) {
    const empty = document.createElement('div');
    empty.className = 'dataview-empty';
    empty.textContent = 'No results.';
    container.appendChild(empty);
    return;
  }

  const table = document.createElement('table');
  table.className = 'dataview-table';

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  for (const col of result.columns) {
    const th = document.createElement('th');
    th.textContent = col;
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const row of result.rows) {
    const tr = document.createElement('tr');
    for (const col of result.columns) {
      const td = document.createElement('td');
      const val = row[col];
      td.textContent = val == null ? '' : String(val);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  container.appendChild(table);

  const meta = document.createElement('div');
  meta.className = 'dataview-meta';
  meta.textContent = `${result.total} result(s) · ${result.elapsed.toFixed(1)}ms`;
  container.appendChild(meta);
}

export const DataviewBlock = Node.create<DataviewOptions>({
  name: 'dataviewBlock',
  group: 'block',
  atom: true,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      query: {
        default: DEFAULT_QUERY,
        parseHTML: (element) => element.getAttribute('data-query') || DEFAULT_QUERY,
        renderHTML: (attributes) => ({ 'data-query': attributes.query }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="dataview"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'dataview',
        class: 'dataview-block',
      }),
    ];
  },

  addCommands() {
    return {
      insertDataview:
        (query = DEFAULT_QUERY) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { query } }),
    };
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const dom = document.createElement('div');
      dom.className = 'dataview-block';
      dom.setAttribute('data-type', 'dataview');

      const resultDiv = document.createElement('div');
      resultDiv.className = 'dataview-result';

      const editor_ = document.createElement('textarea');
      editor_.className = 'dataview-query-input';
      editor_.value = node.attrs.query;
      editor_.spellcheck = false;
      editor_.style.display = 'none';

      const label = document.createElement('div');
      label.className = 'dataview-label';
      label.textContent = '🔍 dataview';

      renderResult(resultDiv, node.attrs.query);

      dom.appendChild(label);
      dom.appendChild(resultDiv);
      dom.appendChild(editor_);

      // Click the result to edit the query.
      resultDiv.addEventListener('click', () => {
        if (!editor.isEditable) return;
        editor_.style.display = 'block';
        editor_.style.height = '80px';
        editor_.focus();
        resultDiv.style.display = 'none';
      });

      editor_.addEventListener('blur', () => {
        editor_.style.display = 'none';
        resultDiv.style.display = 'block';

        const pos = getPos?.();
        if (pos !== undefined && editor.isEditable) {
          editor.commands.command(({ tr }) => {
            tr.setNodeMarkup(pos, undefined, { query: editor_.value });
            return true;
          });
        }
        renderResult(resultDiv, editor_.value);
      });

      return {
        dom,
        // atom node — no contentDOM; ignore internal mutations
        ignoreMutation: () => true,
      };
    };
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any) {
          state.write('```dataview\n');
          state.text(node.attrs.query, false);
          state.ensureNewLine();
          state.write('```');
          state.closeBlock(node);
        },
        parse: {
          setup(markdownit: any) {
            const defaultFence =
              markdownit.renderer.rules.fence ||
              ((tokens: any, idx: number, options: any, _env: any, self: any) =>
                self.renderToken(tokens, idx, options));

            markdownit.renderer.rules.fence = (
              tokens: any,
              idx: number,
              options: any,
              env: any,
              self: any,
            ) => {
              const token = tokens[idx];
              const info = (token.info || '').trim().toLowerCase();
              if (info === 'dataview') {
                const query = token.content.replace(/\n$/, '');
                const escaped = query
                  .replace(/&/g, '&amp;')
                  .replace(/"/g, '&quot;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;');
                return `<div data-type="dataview" data-query="${escaped}"></div>`;
              }
              return defaultFence(tokens, idx, options, env, self);
            };
          },
        },
      },
    };
  },
});
