import { useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import { open as shellOpen } from '@tauri-apps/plugin-shell';
import { headingSlug } from './editorFileHelpers';

/**
 * Intercept clicks on anchor elements inside the editor. Internal links
 * (`#heading`) scroll to the matching heading; external URLs open in the
 * system browser via Tauri's shell plugin. Other protocols fall through to the
 * browser.
 */
export function useEditorLinks(editor: Editor | null): void {
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    let editorDom: HTMLElement;
    try {
      editorDom = editor.view.dom;
    } catch {
      return;
    }

    const handleLinkClick = (e: MouseEvent) => {
      const anchor = (e.target as Element).closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href) return;

      // Internal anchor link: find the matching heading and scroll to it
      if (href.startsWith('#')) {
        e.preventDefault();
        e.stopPropagation();

        const anchorId = href.slice(1);
        if (!anchorId) return;

        let found = false;
        editor.state.doc.descendants((node, pos) => {
          if (found) return false;
          if (node.type.name === 'heading') {
            const slug = headingSlug(node.textContent);
            if (slug === anchorId) {
              found = true;
              editor.chain().focus().setTextSelection(pos).scrollIntoView().run();
              return false;
            }
          }
          return true;
        });
        return;
      }

      // External URL — open in the system browser
      if (href.startsWith('http://') || href.startsWith('https://')) {
        e.preventDefault();
        e.stopPropagation();
        shellOpen(href).catch((err: unknown) => {
          console.warn('Failed to open link in browser:', err);
        });
      }
      // For other protocols (mailto:, file:, etc.) let the browser handle them
    };

    editorDom.addEventListener('click', handleLinkClick);
    return () => {
      editorDom.removeEventListener('click', handleLinkClick);
    };
  }, [editor]);
}
