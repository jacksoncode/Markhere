import { create } from 'zustand';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';

export interface Collaborator {
  id: string;
  name: string;
  color: string;
  cursor?: { from: number; to: number };
  selection?: { from: number; to: number };
}

interface CollaborationState {
  isConnected: boolean;
  roomId: string | null;
  collaborators: Collaborator[];
  ydoc: Y.Doc | null;
  provider: WebrtcProvider | null;
  ytext: Y.Text | null;
  
  connect: (roomId: string, userName: string) => void;
  disconnect: () => void;
  updateAwareness: (field: string, value: any) => void;
  syncContent: (content: string) => void;
  getContent: () => string;
  observeUpdates: (callback: (content: string) => void) => () => void;
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
  
  connect: (roomId: string, userName: string) => {
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
  },
  
  disconnect: () => {
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
}));