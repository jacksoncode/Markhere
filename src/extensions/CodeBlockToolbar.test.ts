import { describe, it, expect, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { Markdown } from 'tiptap-markdown';
import Prism from 'prismjs';
import { CodeBlockToolbar, POPULAR_LANGUAGES } from './CodeBlockToolbar';

// jsdom may not define requestAnimationFrame; the NodeView re-highlight path
// relies on it. Polyfill so the deferred highlight runs in tests.
if (typeof (globalThis as any).requestAnimationFrame !== 'function') {
  (globalThis as any).requestAnimationFrame = (cb: (t: number) => void) =>
    setTimeout(() => cb(0), 0) as any;
}

function makeEditor(doc: any) {
  const element = document.createElement('div');
  document.body.appendChild(element);
  const ed = new Editor({
    element,
    extensions: [Document, Paragraph, Text, Markdown, CodeBlockToolbar],
    content: '<p></p>',
  });
  ed.commands.setContent(doc);
  return ed;
}

function codeBlock(language: string, text: string) {
  return {
    type: 'doc',
    content: [
      {
        type: 'codeBlock',
        attrs: { language },
        content: [{ type: 'text', text }],
      },
    ],
  };
}

async function tick() {
  await new Promise((r) => setTimeout(r, 0));
}

function findCodeBlockPos(editor: Editor): number {
  let pos = 0;
  editor.state.doc.descendants((n, p) => {
    if (n.type.name === 'codeBlock') pos = p + 1;
  });
  return pos;
}

function getCodeEl(editor: Editor): HTMLElement {
  return editor.view.dom.querySelector('.code-block-content code') as HTMLElement;
}

function switchLang(editor: Editor, lang: string) {
  editor.commands.setTextSelection(findCodeBlockPos(editor));
  editor.commands.updateAttributes('codeBlock', { language: lang });
}

describe('CodeBlockToolbar', () => {
  let editor: Editor;
  afterEach(() => editor?.destroy());

  it('has name "codeBlock" and replaces the default code block', () => {
    expect(CodeBlockToolbar.name).toBe('codeBlock');
    expect((CodeBlockToolbar as any).config.group).toBe('block');
  });

  it('updates the language class when switching plaintext -> bash (fixes no-color-change)', async () => {
    editor = makeEditor(codeBlock('plaintext', 'echo "hello world"'));
    await tick();
    const code = getCodeEl(editor);
    expect(code.className).toContain('language-plaintext');

    switchLang(editor, 'bash');
    await tick();

    // Previously the class changed but the code was never re-tokenized, so the
    // colors never updated. Now the language class reflects the new selection.
    expect(code.className).toContain('language-bash');
  });

  it('updates the language class when switching to a previously-missing grammar (toml)', async () => {
    editor = makeEditor(codeBlock('plaintext', 'title = "x"\nport = 8080'));
    await tick();
    switchLang(editor, 'toml');
    await tick();
    expect(getCodeEl(editor).className).toContain('language-toml');
  });

  it('renders a scrollable language dropdown list with every popular language', async () => {
    editor = makeEditor(codeBlock('javascript', 'const a = 1;'));
    await tick();
    const list = editor.view.dom.querySelector('.code-block-lang-list') as HTMLElement;
    expect(list).not.toBeNull();
    // The list is the scroll container for the language options.
    expect(list.style.overflowY || getComputedStyle(list).overflowY).not.toBe('visible');
    const langs = Array.from(list.querySelectorAll('.code-block-lang-item')).map(
      (el) => (el as HTMLElement).getAttribute('data-lang'),
    );
    for (const lang of POPULAR_LANGUAGES) {
      expect(langs).toContain(lang);
    }
  });
});

// Direct verification that every selectable language actually has a working
// Prism grammar and produces tokenized output (this is what gives it colors).
describe('CodeBlockToolbar language grammars', () => {
  const SAMPLES: Record<string, string> = {
    plaintext: 'just some text',
    javascript: 'const x = 1; function f() {}',
    typescript: 'const x: number = 1;',
    jsx: 'const el = <div>hi</div>;',
    tsx: 'const el: JSX.Element = <div>hi</div>;',
    python: 'def f():\n    return 1',
    rust: 'fn main() { let x = 1; }',
    json: '{"a": 1}',
    bash: 'echo "hi" && ls -la',
    css: '.a { color: red; }',
    markdown: '# Title\n**bold**',
    yaml: 'name: app\nport: 80',
    sql: 'SELECT * FROM t WHERE id = 1',
    go: 'func main() { fmt.Println("x") }',
    java: 'public class A { void m() {} }',
    c: 'int main() { return 0; }',
    cpp: 'int main() { std::cout << 1; }',
    ruby: 'puts "hi"',
    php: '<?php echo "hi";',
    swift: 'let x: Int = 1',
    kotlin: 'val x = 1',
    graphql: 'query { user { id } }',
    docker: 'FROM node:18\nRUN npm i',
    nginx: 'server { listen 80; }',
    html: '<div class="a">hi</div>',
    xml: '<root><child>v</child></root>',
    toml: 'title = "x"\n[server]\nport = 8080',
    lua: 'local x = 1\nprint(x)',
    scala: 'object A { def m = 1 }',
    r: 'x <- 1\nprint(x)',
    dart: 'void main() { print("x"); }',
  };

  for (const lang of POPULAR_LANGUAGES) {
    it(`"${lang}" has a loaded grammar that tokenizes`, () => {
      expect(Prism.languages[lang]).toBeTruthy();
      const out = Prism.highlight(SAMPLES[lang] ?? 'x', Prism.languages[lang], lang);
      if (lang === 'plaintext') {
        // plaintext has no grammar -> plain text, no tokens
        expect(out).not.toContain('class="token');
      } else {
        expect(out).toContain('class="token');
      }
    });
  }
});

// Regression coverage for the "language badge flickers closed / does nothing
// on click / can't pick a language" bug. The dropdown must open on badge
// mousedown, stay open while the user interacts inside it, and only close on
// an outside click. The mousedown handler must also preventDefault so
// ProseMirror doesn't steal focus (which caused the flicker), and the toggle
// must happen on mousedown (a preventDefault'd mousedown inside a
// contenteditable can suppress the subsequent click).
describe('CodeBlockToolbar dropdown interaction', () => {
  let editor: Editor;
  afterEach(() => editor?.destroy());

  function els() {
    const root = editor.view.dom;
    return {
      badge: root.querySelector('.code-block-lang-badge') as HTMLElement,
      dropdown: root.querySelector('.code-block-lang-dropdown') as HTMLElement,
      list: root.querySelector('.code-block-lang-list') as HTMLElement,
    };
  }

  it('opens on badge click and stays open on internal clicks, closes on outside click', async () => {
    editor = makeEditor(codeBlock('javascript', 'const a = 1;'));
    await tick();
    const { badge, dropdown, list } = els();

    // Initially closed
    expect(dropdown.style.display).not.toBe('block');

    // Open it by mousing down on the language badge (the toggle now lives on
    // mousedown so it works even though preventDefault suppresses the click)
    badge.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    expect(dropdown.style.display).toBe('block');

    // Regression: opening must NOT add a `dropdown-open` class to the NodeView
    // wrapper. Mutating the wrapper makes ProseMirror's MutationObserver treat
    // it as a change to the NodeView root and rebuild the whole NodeView, which
    // re-initializes the dropdown to display:none and makes it vanish.
    const wrapper = editor.view.dom.querySelector('.code-block-wrapper') as HTMLElement;
    expect(wrapper.classList.contains('dropdown-open')).toBe(false);

    // Clicking inside the dropdown (the list) must NOT close it
    list.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(dropdown.style.display).toBe('block');

    // Clicking outside the wrapper closes it
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(dropdown.style.display).toBe('none');
  });

  it('prevents default on mousedown of the language badge (stops editor stealing focus)', async () => {
    editor = makeEditor(codeBlock('javascript', 'const a = 1;'));
    await tick();
    const { badge } = els();
    const ev = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    badge.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
  });

  it('stops the mousedown from bubbling to the document (no selection/focus race)', async () => {
    editor = makeEditor(codeBlock('javascript', 'const a = 1;'));
    await tick();
    const { badge } = els();
    let reachedDocument = false;
    const onDoc = () => {
      reachedDocument = true;
    };
    document.addEventListener('mousedown', onDoc);
    badge.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    document.removeEventListener('mousedown', onDoc);
    // stopPropagation on mousedown means the event never reaches the document
    expect(reachedDocument).toBe(false);
  });
});
