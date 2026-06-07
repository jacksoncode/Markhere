import { useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import { FileService } from '../services/FileService';
import { useAutoSaveStore } from '../store/autoSaveStore';

interface ShortcutCallbacks {
  setShowCommandPalette: (v: boolean) => void;
  setShowQuickOpen: (v: boolean) => void;
  setShowWordCount: (v: boolean) => void;
  setPendingClose: (v: boolean) => void;
  setShowUnsavedDialog: (v: boolean) => void;
  setSavedContent: (content: string) => void;
  checkUnsavedChanges: () => boolean;
  editorInstance: Editor | null;
  currentPath: string | null;
}

export function useKeyboardShortcuts(callbacks: ShortcutCallbacks) {
  useEffect(() => {
    const {
      setShowCommandPalette, setShowQuickOpen, setShowWordCount,
      setPendingClose, setShowUnsavedDialog, setSavedContent,
      checkUnsavedChanges, editorInstance, currentPath,
    } = callbacks;

    const handleKeyboard = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      if (isMod && e.key === 'k') { e.preventDefault(); setShowCommandPalette(true); }
      if (isMod && e.key === 'p') { e.preventDefault(); setShowQuickOpen(true); }
      if (isMod && e.key === 's') {
        e.preventDefault();
        if (editorInstance && currentPath) {
          const markdown = (editorInstance.storage as any)?.markdown?.getMarkdown?.() || '';
          FileService.saveFile(currentPath, markdown).then(() => {
            setSavedContent(markdown);
            useAutoSaveStore.getState().markSaved();
          });
        }
      }
      if (isMod && e.shiftKey && e.key === 'v') {
        e.preventDefault();
        navigator.clipboard.readText().then(text => editorInstance?.chain().focus().insertContent(text).run());
      }
      if (isMod && e.key === 'w') {
        e.preventDefault();
        if (checkUnsavedChanges()) {
          setPendingClose(true); setShowUnsavedDialog(true);
        } else {
          import('@tauri-apps/api/window').then(({ getCurrentWindow }) => getCurrentWindow().close());
        }
      }
      if (isMod && e.shiftKey && e.key === 'ArrowUp') {
        e.preventDefault();
        let level = 0;
        for (let i = 1; i <= 6; i++) { if (editorInstance?.isActive('heading', { level: i })) { level = i; break; } }
        const newLevel = level === 0 ? 6 : level === 1 ? 1 : level - 1;
        editorInstance?.chain().focus().toggleHeading({ level: newLevel as 1|2|3|4|5|6 }).run();
      }
      if (isMod && e.shiftKey && e.key === 'ArrowDown') {
        e.preventDefault();
        let level = 0;
        for (let i = 1; i <= 6; i++) { if (editorInstance?.isActive('heading', { level: i })) { level = i; break; } }
        if (level === 0 || level === 6) {
          editorInstance?.chain().focus().setParagraph().run();
        } else {
          editorInstance?.chain().focus().toggleHeading({ level: (level + 1) as 1|2|3|4|5|6 }).run();
        }
      }
      if (isMod && e.key === 'Home') { e.preventDefault(); editorInstance?.chain().focus().setTextSelection({ from: 0, to: 0 }).run(); }
      if (isMod && e.key === 'End') {
        e.preventDefault();
        const docSize = editorInstance?.state.doc.content.size || 0;
        editorInstance?.chain().focus().setTextSelection({ from: docSize, to: docSize }).run();
      }
      if (isMod && e.key === 'j') {
        e.preventDefault();
        const sel = editorInstance?.state.selection || { from: 0, to: 0 };
        if (sel.from !== sel.to) editorInstance?.commands.scrollIntoView();
      }
      if (isMod && e.shiftKey && e.key === 'd') {
        e.preventDefault();
        const doc = editorInstance?.state.doc;
        if (doc) {
          const { from } = editorInstance?.state.selection || { from: 0 };
          const $pos = doc.resolve(from);
          const textNode = $pos.nodeBefore || $pos.nodeAfter;
          if (textNode && textNode.isText) {
            const start = from - (textNode.text?.length || 0);
            editorInstance?.chain().focus().deleteRange({ from: start, to: from }).run();
          }
        }
      }
      if (isMod && e.key === 'e') {
        e.preventDefault();
        const doc = editorInstance?.state.doc;
        if (doc) {
          const { from } = editorInstance?.state.selection || { from: 0 };
          const $pos = doc.resolve(from);
          const marks = $pos.marks();
          if (marks.length > 0) {
            let startPos = from, endPos = from;
            for (let i = from - 1; i >= 0; i--) {
              const back = doc.resolve(i);
              if (back.marks().some(m => marks.some(m2 => m2.eq(m)))) startPos = i; else break;
            }
            for (let i = from + 1; i <= doc.content.size; i++) {
              const fwd = doc.resolve(i);
              if (fwd.marks().some(m => marks.some(m2 => m2.eq(m)))) endPos = i; else break;
            }
            editorInstance?.chain().focus().setTextSelection({ from: startPos, to: endPos }).run();
          }
        }
      }
      if (isMod && e.shiftKey && e.key === 'c') { e.preventDefault(); setShowWordCount(true); }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [
    callbacks.setShowCommandPalette, callbacks.setShowQuickOpen, callbacks.setShowWordCount,
    callbacks.setPendingClose, callbacks.setShowUnsavedDialog, callbacks.setSavedContent,
    callbacks.checkUnsavedChanges, callbacks.editorInstance, callbacks.currentPath,
  ]);
}
