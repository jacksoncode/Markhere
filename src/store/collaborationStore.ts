import { create } from 'zustand';
import { Editor } from '@tiptap/react';

export interface Collaborator {
  id: string;
  name: string;
  color: string;
  cursor?: { from: number; to: number };
  selection?: { from: number; to: number };
}

interface EditorBinding {
  editor: Editor;
  updateHandler: () => void;
  ytextObserver: () => void;
  selectionHandler: () => void;
}

interface CollaborationState {
  isConnected: boolean;
  roomId: string | null;
  collaborators: Collaborator[];
  ydoc: any | null;
  provider: any | null;
  ytext: any | null;
  binding: EditorBinding | null;

  connect: (roomId: string, userName: string) => void;
  disconnect: () => void;
  updateAwareness: (field: string, value: any) => void;
  syncContent: (content: string) => void;
  getContent: () => string;
  observeUpdates: (callback: (content: string) => void) => () => void;
  bindEditor: (editor: Editor) => void;
  unbindEditor: () => void;
}

const colors = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
];

export const useCollaborationStore = create<CollaborationState>((set, get) => ({
  isConnected: false,
  roomId: null,
  collaborators: [],
  ydoc: null,
  provider: null,
  ytext: null,
  binding: null,

  connect: async (roomId: string, userName: string) => {
    try {
      const Y = await import('yjs');
      const { WebrtcProvider } = await import('y-webrtc');

      const ydoc = new Y.Doc();
      const ytext = ydoc.getText('content');

      const provider = new WebrtcProvider(roomId, ydoc, {
        signaling: ['wss://signaling.yjs.dev'],
      });

      const color = colors[Math.floor(Math.random() * colors.length)];

      provider.awareness.setLocalStateField('user', {
        id: provider.awareness.clientID.toString(),
        name: userName,
        color,
      });

      provider.awareness.on('change', () => {
        const collaborators: Collaborator[] = [];
        provider.awareness.getStates().forEach((state: any, clientId: number) => {
          if (state.user) {
            collaborators.push({
              id: clientId.toString(),
              name: state.user.name || 'Anonymous',
              color: state.user.color || '#3b82f6',
              cursor: state.cursor,
              selection: state.selection,
            });
          }
        });
        set({ collaborators });
      });

      set({
        isConnected: true,
        roomId,
        ydoc,
        provider,
        ytext,
      });
    } catch (err) {
      console.error('[collaborationStore] Failed to load collaboration modules:', err);
    }
  },

  disconnect: () => {
    get().unbindEditor();

    const { provider, ydoc } = get();
    if (provider) {
      provider.disconnect();
      provider.destroy();
    }
    if (ydoc) {
      ydoc.destroy();
    }
    set({
      isConnected: false,
      roomId: null,
      collaborators: [],
      ydoc: null,
      provider: null,
      ytext: null,
      binding: null,
    });
  },

  updateAwareness: (field: string, value: any) => {
    const { provider } = get();
    if (provider) {
      provider.awareness.setLocalStateField(field, value);
    }
  },

  syncContent: (content: string) => {
    const { ytext } = get();
    if (ytext) {
      ytext.delete(0, ytext.length);
      ytext.insert(0, content);
    }
  },

  getContent: () => {
    const { ytext } = get();
    return ytext ? ytext.toString() : '';
  },

  observeUpdates: (callback: (content: string) => void) => {
    const { ytext } = get();
    if (!ytext) return () => {};

    const observer = () => {
      callback(ytext.toString());
    };

    ytext.observe(observer);
    return () => ytext.unobserve(observer);
  },

  bindEditor: (editor: Editor) => {
    const { ytext, provider, binding: existingBinding } = get();
    if (!ytext) return;

    if (existingBinding) {
      get().unbindEditor();
    }

    let isLocalUpdate = false;

    const updateHandler = () => {
      if (!isLocalUpdate) {
        isLocalUpdate = true;
        const html = editor.getHTML();
        ytext.delete(0, ytext.length);
        ytext.insert(0, html);
        isLocalUpdate = false;
      }
    };

    const ytextObserver = () => {
      if (!isLocalUpdate) {
        isLocalUpdate = true;
        const content = ytext.toString();
        editor.commands.setContent(content);
        isLocalUpdate = false;
      }
    };

    const selectionHandler = () => {
      const { from, to } = editor.state.selection;
      if (provider) {
        provider.awareness.setLocalStateField('cursor', { from, to });
      }
    };

    editor.on('update', updateHandler);
    editor.on('selectionUpdate', selectionHandler);
    ytext.observe(ytextObserver);

    if (ytext.length > 0) {
      const content = ytext.toString();
      editor.commands.setContent(content);
    } else {
      const html = editor.getHTML();
      if (html) {
        ytext.insert(0, html);
      }
    }

    set({
      binding: {
        editor,
        updateHandler,
        ytextObserver,
        selectionHandler,
      },
    });
  },

  unbindEditor: () => {
    const { binding, ytext } = get();
    if (binding && ytext) {
      binding.editor.off('update', binding.updateHandler);
      binding.editor.off('selectionUpdate', binding.selectionHandler);
      ytext.unobserve(binding.ytextObserver);

      const { provider } = get();
      if (provider) {
        provider.awareness.setLocalStateField('cursor', null);
      }
    }
    set({ binding: null });
  },
}));
