import { Extension } from '@tiptap/core';
import { segmentChineseText, getPOSColor, TaggedWord } from '../services/POSTaggerService';

declare global {
  interface Window {
    __posHighlightEnabled?: boolean;
  }
}

function applyPOSHighlight(scope: HTMLElement) {
  if (!window.__posHighlightEnabled) return;

  const paragraphs = scope.querySelectorAll('p');
  
  paragraphs.forEach((p) => {
    const text = p.textContent || '';
    if (!text || !/[\u4e00-\u9fa5]/.test(text)) return;
    
    const tagged = segmentChineseText(text);
    if (tagged.length === 0) return;

    const fragment = document.createDocumentFragment();
    
    tagged.forEach((tw: TaggedWord) => {
      const span = document.createElement('span');
      span.className = `pos-tag pos-${tw.pos}`;
      span.textContent = tw.word;
      span.style.borderBottom = `2px solid ${getPOSColor(tw.pos)}`;
      span.dataset.pos = tw.pos;
      fragment.appendChild(span);
    });

    if (fragment.childNodes.length > 0) {
      p.innerHTML = '';
      p.appendChild(fragment);
    }
  });
}

function removePOSHighlight(scope: HTMLElement) {
  const spans = scope.querySelectorAll('span.pos-tag');
  
  spans.forEach((span) => {
    const parent = span.parentNode;
    if (parent) {
      const text = span.textContent;
      parent.replaceChild(document.createTextNode(text || ''), span);
    }
  });
}

export const POSHighlightExtension = Extension.create({
  name: 'posHighlight',

  addOptions() {
    return {
      enabled: false,
    };
  },

  onCreate() {
    window.__posHighlightEnabled = this.options.enabled;
    
    if (this.options.enabled) {
      requestAnimationFrame(() => {
        applyPOSHighlight(this.editor.view.dom);
      });
    }
  },

  onUpdate() {
    if (window.__posHighlightEnabled) {
      applyPOSHighlight(this.editor.view.dom);
    }
  },
});

export function togglePOSHighlight(editor: any) {
  const currentEnabled = window.__posHighlightEnabled || false;
  window.__posHighlightEnabled = !currentEnabled;
  
  if (window.__posHighlightEnabled) {
    applyPOSHighlight(editor.view.dom);
  } else {
    removePOSHighlight(editor.view.dom);
  }
  
  return true;
}

export function setPOSHighlight(editor: any, enabled: boolean) {
  window.__posHighlightEnabled = enabled;
  
  if (enabled) {
    applyPOSHighlight(editor.view.dom);
  } else {
    removePOSHighlight(editor.view.dom);
  }
  
  return true;
}

export { applyPOSHighlight, removePOSHighlight };