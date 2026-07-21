/**
 * CodeBlock Toolbar Extension
 * 
 * Adds toolbar (copy button, line numbers, language switcher) to code blocks.
 * Replaces the standard codeBlock node with a custom NodeView wrapping:
 *   [toolbar: language badge + copy btn] [gutter: line numbers] [code content]
 */
import { Node } from '@tiptap/core';
import Prism from 'prismjs';

// `prism-markup-templating` MUST be imported before languages that depend on
// it (php, twig, django, …). Those grammars register an `after-tokenize` hook
// that references `tokenizePlaceholders`; without this plugin the hook throws
// on EVERY highlight (even for `js`), which crashes the code-block NodeView
// and leaves the editor in a broken/partial state. See issue with [TOC] files.
import 'prismjs/components/prism-markup-templating';

// Pre-load common languages
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-ruby';
import 'prismjs/components/prism-php';
import 'prismjs/components/prism-swift';
import 'prismjs/components/prism-kotlin';
import 'prismjs/components/prism-graphql';
import 'prismjs/components/prism-docker';
import 'prismjs/components/prism-nginx';
import 'prismjs/components/prism-toml';
import 'prismjs/components/prism-lua';
import 'prismjs/components/prism-scala';
import 'prismjs/components/prism-r';
import 'prismjs/components/prism-dart';

export const POPULAR_LANGUAGES = [
  'plaintext', 'javascript', 'typescript', 'jsx', 'tsx', 'python', 'rust',
  'json', 'bash', 'css', 'markdown', 'yaml', 'sql', 'go', 'java', 'c', 'cpp',
  'ruby', 'php', 'swift', 'kotlin', 'graphql', 'docker', 'nginx', 'html',
  'xml', 'toml', 'lua', 'scala', 'r', 'dart',
];

function getLanguageClass(lang: string): string {
  return `language-${lang}`;
}

/**
 * Highlight `text` for `lang` into `el`. Never throws: if the grammar is
 * missing or a Prism plugin hook fails (e.g. `tokenizePlaceholders` for
 * templating languages), fall back to plain text so the editor/NodeView can
 * never be left in a broken state.
 */
function highlightInto(el: HTMLElement, text: string, lang: string): void {
  try {
    const grammar = Prism.languages[lang];
    if (grammar) {
      el.innerHTML = Prism.highlight(text, grammar, lang);
      return;
    }
  } catch {
    // fall through to plain-text fallback below
  }
  el.textContent = text;
}

export const CodeBlockToolbar = Node.create({
  name: 'codeBlock',

  group: 'block',

  content: 'text*',

  marks: '',

  isolating: true,

  selectable: true,

  // Prevent content from being parsed as inline markdown
  code: true,

  addAttributes() {
    return {
      language: {
        default: 'plaintext',
        parseHTML: (element) => element.getAttribute('data-language') || 'plaintext',
        renderHTML: (attributes) => ({
          'data-language': attributes.language,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'pre', preserveWhitespace: 'full' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['pre', ['code', HTMLAttributes, 0]];
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      let activeLang = node.attrs.language || 'plaintext';
      const wrapper = document.createElement('div');
      wrapper.className = 'code-block-wrapper';

      // --- Toolbar ---
      const toolbar = document.createElement('div');
      toolbar.className = 'code-block-toolbar';
      toolbar.setAttribute('data-language', activeLang);

      // Language badge
      const langBadge = document.createElement('span');
      langBadge.className = 'code-block-lang-badge';
      langBadge.textContent = activeLang;
      langBadge.title = 'Click to change language';
      toolbar.appendChild(langBadge);

      // Language dropdown (hidden by default)
      const langDropdown = document.createElement('div');
      langDropdown.className = 'code-block-lang-dropdown';
      langDropdown.style.display = 'none';
      
      const langSearch = document.createElement('input');
      langSearch.type = 'text';
      langSearch.className = 'code-block-lang-search';
      langSearch.placeholder = 'Search language...';
      langDropdown.appendChild(langSearch);

      const langList = document.createElement('div');
      langList.className = 'code-block-lang-list';
      
      // Build language list
      const allLanguages = Object.keys(Prism.languages).filter(l => 
        typeof Prism.languages[l] === 'object'
      );
      const displayLanguages = [...new Set([...POPULAR_LANGUAGES, ...allLanguages])];
      
      displayLanguages.forEach(l => {
        const item = document.createElement('div');
        item.className = 'code-block-lang-item';
        item.textContent = l;
        item.setAttribute('data-lang', l);
        if (l === activeLang) item.classList.add('selected');
        langList.appendChild(item);
      });
      
      langDropdown.appendChild(langList);
      toolbar.appendChild(langDropdown);

      // Copy button
      const copyBtn = document.createElement('button');
      copyBtn.className = 'code-block-copy-btn';
      copyBtn.innerHTML = '📋';
      copyBtn.title = 'Copy code';
      toolbar.appendChild(copyBtn);

      // Spacer
      const spacer = document.createElement('span');
      spacer.style.flex = '1';
      toolbar.appendChild(spacer);

      // Line count badge
      const lineBadge = document.createElement('span');
      lineBadge.className = 'code-block-line-badge';
      toolbar.appendChild(lineBadge);

      wrapper.appendChild(toolbar);

      // --- Content area ---
      const contentArea = document.createElement('div');
      contentArea.className = 'code-block-content';

      // Gutter
      const gutter = document.createElement('div');
      gutter.className = 'code-block-gutter';
      contentArea.appendChild(gutter);

      // Code element
      const pre = document.createElement('pre');
      const code = document.createElement('code');
      code.className = getLanguageClass(activeLang);
      pre.appendChild(code);
      contentArea.appendChild(pre);

      wrapper.appendChild(contentArea);

      // --- Event handlers ---

      // Copy button
      copyBtn.addEventListener('click', async () => {
        const text = node.textContent || '';
        try {
          await navigator.clipboard.writeText(text);
          copyBtn.innerHTML = '✅';
          copyBtn.classList.add('copied');
          setTimeout(() => {
            copyBtn.innerHTML = '📋';
            copyBtn.classList.remove('copied');
          }, 2000);
        } catch {
          // Fallback for older browsers
          const textarea = document.createElement('textarea');
          textarea.value = text;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
          copyBtn.innerHTML = '✅';
          copyBtn.classList.add('copied');
          setTimeout(() => {
            copyBtn.innerHTML = '📋';
            copyBtn.classList.remove('copied');
          }, 2000);
        }
      });

      // Language badge click -> toggle dropdown
      let dropdownOpen = false;
      const openDropdown = () => {
        dropdownOpen = true;
        langDropdown.style.display = 'block';
        wrapper.classList.add('dropdown-open');
        langSearch.focus();
        langSearch.value = '';
        updateLangList(langList, displayLanguages, '');
      };
      const closeDropdown = () => {
        dropdownOpen = false;
        langDropdown.style.display = 'none';
        wrapper.classList.remove('dropdown-open');
      };
      // Prevent the editor from hijacking the click: a mousedown inside the
      // NodeView is otherwise processed by ProseMirror (which sets the
      // selection / steals focus), racing with the dropdown's <input>.focus()
      // and making the just-opened dropdown flicker closed. Intercepting
      // mousedown stops ProseMirror from touching selection/focus here.
      langBadge.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });

      langBadge.addEventListener('click', (e) => {
        e.stopPropagation();
        if (dropdownOpen) {
          closeDropdown();
        } else {
          openDropdown();
        }
      });

      // Keep interactions inside the dropdown from bubbling to the document
      // "outside click" handler (which would close it), and from reaching the
      // editor's mousedown/selection logic.
      langDropdown.addEventListener('mousedown', (e) => {
        e.stopPropagation();
      });
      langDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
      });

      // Prevent the editor/page from capturing wheel events while the user
      // scrolls the language list (otherwise the list can't scroll down).
      langDropdown.addEventListener('wheel', (e) => {
        e.stopPropagation();
      }, { passive: true });

      // Close dropdown on outside click
      document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target as globalThis.Node)) {
          closeDropdown();
        }
      });

      // Language search filter
      langSearch.addEventListener('input', () => {
        updateLangList(langList, displayLanguages, langSearch.value.toLowerCase());
      });

      // Language selection — use editor commands for proper undo integration
      langList.addEventListener('click', (e) => {
        const item = (e.target as HTMLElement).closest('.code-block-lang-item');
        if (!item) return;
        const selectedLang = item.getAttribute('data-lang');
        if (!selectedLang) return;

        const pos = getPos();
        if (pos === undefined || pos < 0) return;

        // Use editor's chain API to update the attribute with undo support
        if (editor && !editor.isDestroyed) {
          editor
            .chain()
            .focus()
            .setNodeSelection(pos)
            .updateAttributes('codeBlock', { language: selectedLang })
            .run();
        }

        closeDropdown();
      });

      // Keyboard navigation in dropdown
      langSearch.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          closeDropdown();
        } else if (e.key === 'Enter') {
          const selected = langList.querySelector('.code-block-lang-item.selected') as HTMLElement;
          if (selected) {
            selected.click();
          }
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          const items = langList.querySelectorAll('.code-block-lang-item');
          const selected = langList.querySelector('.code-block-lang-item.selected');
          const currentIndex = selected ? Array.from(items).indexOf(selected) : -1;
          let nextIndex: number;
          if (e.key === 'ArrowDown') {
            nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
          } else {
            nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
          }
          items.forEach(i => i.classList.remove('selected'));
          items[nextIndex]?.classList.add('selected');
          items[nextIndex]?.scrollIntoView({ block: 'nearest' });
        }
      });

      // --- Highlighting ---
      function highlightCode() {
        highlightInto(code, node.textContent || '', activeLang);
      }

      // --- Line numbers ---
      function updateLineNumbers() {
        const text = node.textContent || '';
        const lines = text.split('\n');
        const lineCount = lines.length;
        gutter.innerHTML = lines.map((_, i) => 
          `<span class="code-block-line-num">${i + 1}</span>`
        ).join('');
        lineBadge.textContent = `${lineCount} lines`;
      }

      // Initial render
      highlightCode();
      updateLineNumbers();

      return {
        dom: wrapper,
        contentDOM: code,

        update(updatedNode) {
          if (updatedNode.type !== node.type) return false;

          const newLang = updatedNode.attrs.language || 'plaintext';
          const textChanged = updatedNode.textContent !== node.textContent;
          const langChanged = newLang !== activeLang;

          // Update language if changed
          if (langChanged) {
            activeLang = newLang;
            code.className = getLanguageClass(newLang);
            langBadge.textContent = newLang;
            toolbar.setAttribute('data-language', newLang);
            // Update dropdown selection
            langList.querySelectorAll('.code-block-lang-item').forEach(item => {
              item.classList.toggle('selected', item.getAttribute('data-lang') === newLang);
            });
          }

          // Re-highlight and re-number when text OR language changes.
          // Language change alone must re-tokenize (e.g. switching to bash),
          // otherwise the old (plaintext) tokens are kept and colors don't update.
          if (langChanged || textChanged) {
            requestAnimationFrame(() => {
              const currentLang = activeLang;
              highlightInto(code, updatedNode.textContent || '', currentLang);
              // Update line numbers
              const text = updatedNode.textContent || '';
              const lines = text.split('\n');
              gutter.innerHTML = lines.map((_, i) =>
                `<span class="code-block-line-num">${i + 1}</span>`
              ).join('');
              lineBadge.textContent = `${lines.length} lines`;
            });
          }

          return true;
        },

        destroy() {
          // Cleanup handled by DOM removal
        },

        ignoreMutation(mutation: any) {
          // Ignore mutations in toolbar/gutter, only track code content changes
          const target = mutation.target as HTMLElement;
          return (
            target.closest('.code-block-toolbar') !== null ||
            target.closest('.code-block-gutter') !== null ||
            target.closest('.code-block-lang-dropdown') !== null
          );
        },
      };
    };
  },
});

function updateLangList(listEl: HTMLDivElement, _languages: string[], query: string) {
  listEl.querySelectorAll('.code-block-lang-item').forEach((item) => {
    const el = item as HTMLElement;
    const lang = el.getAttribute('data-lang') || '';
    if (query && !lang.toLowerCase().includes(query)) {
      el.style.display = 'none';
    } else {
      el.style.display = '';
    }
  });
}

export { CodeBlockToolbar as default };
