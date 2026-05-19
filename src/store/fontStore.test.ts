import { describe, it, expect, beforeEach } from 'vitest';
import { useFontStore, initFontStore } from './fontStore';

function createEditorElement(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'editor-content';
  document.body.appendChild(el);
  return el;
}

function removeEditorElements(): void {
  document.querySelectorAll('.editor-content').forEach((el) => el.remove());
}

const defaultFamily =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

describe('useFontStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useFontStore.setState({
      fontFamily: defaultFamily,
      fontSize: 16,
      lineHeight: 1.6,
    });
    document.documentElement.style.cssText = '';
    removeEditorElements();
  });

  describe('initial state', () => {
    it('has correct default font family', () => {
      expect(useFontStore.getState().fontFamily).toBe(defaultFamily);
    });

    it('has correct default font size', () => {
      expect(useFontStore.getState().fontSize).toBe(16);
    });

    it('has correct default line height', () => {
      expect(useFontStore.getState().lineHeight).toBe(1.6);
    });
  });

  describe('setFontFamily', () => {
    it('updates the fontFamily in state', () => {
      useFontStore.getState().setFontFamily('Georgia, serif');
      expect(useFontStore.getState().fontFamily).toBe('Georgia, serif');
    });

    it('persists font family to localStorage', () => {
      useFontStore.getState().setFontFamily('Courier New, monospace');
      expect(localStorage.getItem('markhere-font-family')).toBe('Courier New, monospace');
    });

    it('applies font family as CSS custom property on root', () => {
      useFontStore.getState().setFontFamily('"Fira Code", monospace');
      expect(document.documentElement.style.getPropertyValue('--font-family')).toBe(
        '"Fira Code", monospace'
      );
    });
  });

  describe('setFontSize', () => {
    it('updates the fontSize in state', () => {
      useFontStore.getState().setFontSize(18);
      expect(useFontStore.getState().fontSize).toBe(18);
    });

    it('clamps font size to minimum of 10', () => {
      useFontStore.getState().setFontSize(5);
      expect(useFontStore.getState().fontSize).toBe(10);
    });

    it('clamps font size to maximum of 32', () => {
      useFontStore.getState().setFontSize(64);
      expect(useFontStore.getState().fontSize).toBe(32);
    });

    it('persists font size to localStorage', () => {
      useFontStore.getState().setFontSize(20);
      expect(localStorage.getItem('markhere-font-size')).toBe('20');
    });
  });

  describe('setLineHeight', () => {
    it('updates the lineHeight in state', () => {
      useFontStore.getState().setLineHeight(2.0);
      expect(useFontStore.getState().lineHeight).toBe(2.0);
    });

    it('clamps line height to minimum of 1.0', () => {
      useFontStore.getState().setLineHeight(0.5);
      expect(useFontStore.getState().lineHeight).toBe(1.0);
    });

    it('clamps line height to maximum of 3.0', () => {
      useFontStore.getState().setLineHeight(5.0);
      expect(useFontStore.getState().lineHeight).toBe(3.0);
    });

    it('persists line height to localStorage', () => {
      useFontStore.getState().setLineHeight(1.8);
      expect(localStorage.getItem('markhere-line-height')).toBe('1.8');
    });
  });

  describe('applyFont', () => {
    it('sets CSS custom properties on the root element', () => {
      useFontStore.setState({
        fontFamily: 'Arial, sans-serif',
        fontSize: 20,
        lineHeight: 2.0,
      });
      useFontStore.getState().applyFont();

      const root = document.documentElement;
      expect(root.style.getPropertyValue('--font-family')).toBe('Arial, sans-serif');
      expect(root.style.getPropertyValue('--font-size')).toBe('20px');
      expect(root.style.getPropertyValue('--line-height')).toBe('2');
    });

    it('applies inline styles to .editor-content element when present', () => {
      createEditorElement();
      useFontStore.setState({
        fontFamily: '"Times New Roman", serif',
        fontSize: 14,
        lineHeight: 1.5,
      });
      useFontStore.getState().applyFont();

      const editor = document.querySelector('.editor-content') as HTMLElement;
      expect(editor.style.fontFamily).toBe('"Times New Roman", serif');
      expect(editor.style.fontSize).toBe('14px');
      expect(editor.style.lineHeight).toBe('1.5');
    });

    it('does not throw when .editor-content element is absent', () => {
      useFontStore.getState().applyFont();
      // Should not throw — the querySelector returns null and the if-guard skips it
    });
  });

  describe('initFontStore', () => {
    it('restores font family from localStorage', () => {
      localStorage.setItem('markhere-font-family', 'Verdana, sans-serif');
      initFontStore();
      expect(useFontStore.getState().fontFamily).toBe('Verdana, sans-serif');
    });

    it('restores font size from localStorage', () => {
      localStorage.setItem('markhere-font-size', '22');
      initFontStore();
      expect(useFontStore.getState().fontSize).toBe(22);
    });

    it('restores line height from localStorage', () => {
      localStorage.setItem('markhere-line-height', '2.4');
      initFontStore();
      expect(useFontStore.getState().lineHeight).toBe(2.4);
    });

    it('restores all three settings together from localStorage', () => {
      localStorage.setItem('markhere-font-family', 'monospace');
      localStorage.setItem('markhere-font-size', '18');
      localStorage.setItem('markhere-line-height', '1.8');
      initFontStore();

      const state = useFontStore.getState();
      expect(state.fontFamily).toBe('monospace');
      expect(state.fontSize).toBe(18);
      expect(state.lineHeight).toBe(1.8);
    });

    it('does nothing when localStorage has no saved font settings', () => {
      initFontStore();
      const state = useFontStore.getState();
      expect(state.fontFamily).toBe(defaultFamily);
      expect(state.fontSize).toBe(16);
      expect(state.lineHeight).toBe(1.6);
    });
  });
});
