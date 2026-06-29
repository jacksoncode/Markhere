import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { useCollaborationStore } from '../../store/collaborationStore';

export interface RemoteCursor {
  id: string;
  name: string;
  color: string;
  top: number;
  left: number;
}

/**
 * Binds the Yjs document to the editor when collaboration is connected, and
 * computes pixel positions for remote collaborator cursors so the editor can
 * render colored caret indicators.
 */
export function useEditorCollaboration(editor: Editor | null): RemoteCursor[] {
  const { isConnected, bindEditor, unbindEditor, collaborators } = useCollaborationStore();
  const [cursors, setCursors] = useState<RemoteCursor[]>([]);

  // ---- Bind / unbind the Yjs document ----
  useEffect(() => {
    if (!editor) return;
    if (isConnected) {
      bindEditor(editor);
    }
    return () => {
      unbindEditor();
    };
  }, [isConnected, editor, bindEditor, unbindEditor]);

  // ---- Compute remote cursor overlay positions ----
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    let editorRect: DOMRect;
    try {
      editorRect = editor.view.dom.getBoundingClientRect();
    } catch {
      return; // view not available during first mount
    }

    const remotes = collaborators.filter((c) => {
      const ownId = useCollaborationStore.getState().provider?.awareness?.clientID?.toString();
      return c.cursor && c.id !== ownId;
    });

    const els = remotes
      .map((c) => {
        const pos = c.cursor!.from;
        try {
          const coords = editor.view.coordsAtPos(pos);
          return {
            id: c.id,
            name: c.name,
            color: c.color,
            top: coords.top - editorRect.top,
            left: coords.left - editorRect.left,
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean) as RemoteCursor[];

    setCursors(els);
  }, [collaborators, editor]);

  return cursors;
}
