/**
 * useCustomShortcuts — reads the custom shortcuts store and dispatches
 * corresponding editor commands / app actions (P2-5).
 *
 * Intercepts keyboard events and checks if they match any user-defined
 * shortcut. If matched, the corresponding action is executed.
 */
import { useEffect, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import { useShortcutsStore } from '../store/shortcutsStore';

interface AppActions {
  setShowCommandPalette: (v: boolean) => void;
  setShowQuickOpen: (v: boolean) => void;
  setShowWordCount: (v: boolean) => void;
  setShowShortcutSettings: (v: boolean) => void;
  toggleSidebar: () => void;
  toggleFocusMode: () => void;
  toggleTypewriterMode: () => void;
  toggleSourceMode: () => void;
  editorInstance: Editor | null;
}

/**
 * Normalise a KeyboardEvent to a shortcut string like "Cmd+Shift+K"
 */
function eventToShortcut(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.metaKey || e.ctrlKey) parts.push('Cmd');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  const key = e.key === ' ' ? 'Space' : e.key.toUpperCase();
  if (!['META', 'CONTROL', 'ALT', 'SHIFT'].includes(key)) {
    parts.push(key);
  }
  return parts.join('+');
}

/** Map shortcut IDs to editor actions */
function executeAction(shortcutId: string, actions: AppActions): boolean {
  const { editorInstance } = actions;
  if (!editorInstance) return false;

  const chain = editorInstance.chain().focus();

  switch (shortcutId) {
    case 'bold': chain.toggleBold().run(); return true;
    case 'italic': chain.toggleItalic().run(); return true;
    case 'underline': chain.toggleUnderline().run(); return true;
    case 'strike': chain.toggleStrike().run(); return true;
    case 'code': chain.toggleCode().run(); return true;
    case 'link': {
      const url = window.prompt('Enter URL:');
      if (url) chain.setLink({ href: url }).run();
      return true;
    }
    case 'heading1': chain.toggleHeading({ level: 1 }).run(); return true;
    case 'heading2': chain.toggleHeading({ level: 2 }).run(); return true;
    case 'heading3': chain.toggleHeading({ level: 3 }).run(); return true;
    case 'blockquote': chain.toggleBlockquote().run(); return true;
    case 'codeBlock': chain.toggleCodeBlock().run(); return true;
    case 'list': chain.toggleBulletList().run(); return true;
    case 'orderedList': chain.toggleOrderedList().run(); return true;
    case 'table': chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); return true;
    case 'undo': chain.undo().run(); return true;
    case 'redo': chain.redo().run(); return true;
    case 'cut': document.execCommand('cut'); return true;
    case 'copy': document.execCommand('copy'); return true;
    case 'paste': document.execCommand('paste'); return true;
    case 'selectAll': chain.selectAll().run(); return true;
    case 'find': actions.setShowCommandPalette(true); return true;
    case 'replace': actions.setShowCommandPalette(true); return true;
    case 'image': {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = () => {
        const file = input.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            chain.setImage({ src: reader.result as string }).run();
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
      return true;
    }
    case 'save': break; // Handled by useKeyboardShortcuts
    case 'open': actions.setShowQuickOpen(true); return true;
    case 'new': actions.setShowQuickOpen(true); return true;
    case 'toggleSidebar': actions.toggleSidebar(); return true;
    case 'focusMode': actions.toggleFocusMode(); return true;
    case 'typewriterMode': actions.toggleTypewriterMode(); return true;
    case 'sourceMode': actions.toggleSourceMode(); return true;
    case 'preview': actions.setShowCommandPalette(true); return true;
    default: return false;
  }
  return false;
}

export function useCustomShortcuts(actions: AppActions) {
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const shortcut = eventToShortcut(e);
      const { shortcuts } = useShortcutsStore.getState();

      // Find a matching custom shortcut
      for (const s of shortcuts) {
        if (s.currentKey === shortcut && s.currentKey !== s.defaultKey) {
          // Custom shortcut was found
          e.preventDefault();
          e.stopPropagation();
          executeAction(s.id, actionsRef.current);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []);
}
