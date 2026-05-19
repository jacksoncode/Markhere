import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('prismjs', () => ({
  default: {
    languages: {},
    highlightElement: vi.fn(),
  },
}));

import Prism from 'prismjs';
import { CodeBlockHighlight } from './CodeBlockHighlight';

describe('CodeBlockHighlight', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -- Extension identity -------------------------------------------------

  it('has name "codeBlockHighlight"', () => {
    expect(CodeBlockHighlight.name).toBe('codeBlockHighlight');
  });

  it('has type "extension"', () => {
    expect(CodeBlockHighlight.type).toBe('extension');
  });

  // -- Lifecycle handlers -------------------------------------------------

  it('defines onCreate handler', () => {
    expect(typeof (CodeBlockHighlight as any).config.onCreate).toBe('function');
  });

  it('defines onUpdate handler', () => {
    expect(typeof (CodeBlockHighlight as any).config.onUpdate).toBe('function');
  });

  // -- addGlobalAttributes ------------------------------------------------

  it('addGlobalAttributes returns correct attribute config for codeBlock', () => {
    const attributes = (CodeBlockHighlight as any).config.addGlobalAttributes.call(CodeBlockHighlight);
    expect(attributes).toHaveLength(1);
    expect(attributes[0].types).toContain('codeBlock');
    expect(attributes[0].attributes.language.default).toBe('plaintext');
  });

  it('language attribute parseHTML reads data-language or defaults to plaintext', () => {
    const attributes = (CodeBlockHighlight as any).config.addGlobalAttributes.call(CodeBlockHighlight);
    const langAttr = attributes[0].attributes.language;

    // With data-language attribute
    const elWithLang = { getAttribute: vi.fn(() => 'javascript') };
    expect(langAttr.parseHTML(elWithLang)).toBe('javascript');
    expect(elWithLang.getAttribute).toHaveBeenCalledWith('data-language');

    // Without data-language attribute
    const elNoLang = { getAttribute: vi.fn(() => null) };
    expect(langAttr.parseHTML(elNoLang)).toBe('plaintext');
  });

  it('language attribute renderHTML outputs data-language', () => {
    const attributes = (CodeBlockHighlight as any).config.addGlobalAttributes.call(CodeBlockHighlight);
    const langAttr = attributes[0].attributes.language;
    const result = langAttr.renderHTML({ language: 'python' });
    expect(result).toEqual({ 'data-language': 'python' });
  });

  // -- Prism integration -------------------------------------------------

  it('onCreate defers highlighting via requestAnimationFrame', () => {
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });

    const mockExtensionCtx = {
      editor: {
        view: {
          dom: document.createElement('div'),
        },
      },
    };

    // Bind onCreate to the mock extension context (this.editor.view.dom)
    (CodeBlockHighlight as any).config.onCreate.call(mockExtensionCtx);

    // requestAnimationFrame should have been called
    expect(rafSpy).toHaveBeenCalledTimes(1);

    // After the RAF callback fires, highlightElement may or may not be called
    // depending on whether DOM contains code blocks
    // The important thing is that RAF was scheduled

    rafSpy.mockRestore();
  });

  it('onUpdate calls highlightElement on matching code blocks', () => {
    // Set up a language
    (Prism.languages as any)['javascript'] = {};

    const editorDom = document.createElement('div');
    const pre = document.createElement('pre');
    pre.setAttribute('data-language', 'javascript');
    const code = document.createElement('code');
    code.textContent = 'const x = 1;';
    pre.appendChild(code);
    editorDom.appendChild(pre);

    const mockExtensionCtx = {
      editor: { view: { dom: editorDom } },
    };

    (CodeBlockHighlight as any).config.onUpdate.call(mockExtensionCtx);

    expect(Prism.highlightElement).toHaveBeenCalledWith(code);
  });

  it('onUpdate does not call highlightElement when language is not loaded', () => {
    const editorDom = document.createElement('div');
    const pre = document.createElement('pre');
    pre.setAttribute('data-language', 'unknownlang');
    const code = document.createElement('code');
    code.textContent = 'some code';
    pre.appendChild(code);
    editorDom.appendChild(pre);

    const mockExtensionCtx = {
      editor: { view: { dom: editorDom } },
    };

    (CodeBlockHighlight as any).config.onUpdate.call(mockExtensionCtx);

    // highlightElement should NOT be called for unknown languages
    // The function only highlights if Prism.languages[language] is truthy
    expect(Prism.highlightElement).not.toHaveBeenCalledWith(code);
  });
});
