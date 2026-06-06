import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks must be hoisted above all imports
// ---------------------------------------------------------------------------
const mockAwareness = {
  clientID: 12345,
  setLocalStateField: vi.fn(),
  getStates: vi.fn().mockReturnValue(new Map()),
  on: vi.fn(),
};

const mockYtextObserve = vi.fn();
const mockYtextUnobserve = vi.fn();
const mockYtextDelete = vi.fn();
const mockYtextInsert = vi.fn();
let mockYtextContent = '';

const mockYtext = {
  observe: mockYtextObserve,
  unobserve: mockYtextUnobserve,
  delete: mockYtextDelete.mockImplementation((start: number, _len: number) => {
    mockYtextContent = mockYtextContent.slice(0, start);
  }),
  insert: mockYtextInsert.mockImplementation((_pos: number, text: string) => {
    mockYtextContent += text;
  }),
  toString: () => mockYtextContent,
  get length() {
    return mockYtextContent.length;
  },
};

const mockProvider = {
  awareness: mockAwareness,
  disconnect: vi.fn(),
  destroy: vi.fn(),
};

const mockDoc = {
  getText: vi.fn().mockReturnValue(mockYtext),
  destroy: vi.fn(),
};

vi.mock('yjs', () => ({
  default: { Doc: vi.fn().mockImplementation(() => mockDoc) },
  Doc: vi.fn().mockImplementation(() => mockDoc),
  Text: vi.fn(),
}));

vi.mock('y-webrtc', () => ({
  WebrtcProvider: vi.fn().mockImplementation(() => mockProvider),
}));

import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { useCollaborationStore } from './collaborationStore';
import type { Editor } from '@tiptap/react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function createMockEditor(html = ''): Editor {
  const handlers: Record<string, Function[]> = {};

  return {
    getHTML: vi.fn().mockReturnValue(html),
    commands: {
      setContent: vi.fn(),
    },
    state: {
      selection: { from: 0, to: 0 },
    },
    on: vi.fn((event: string, handler: Function) => {
      if (!handlers[event]) handlers[event] = [];
      handlers[event].push(handler);
    }),
    off: vi.fn((event: string, handler: Function) => {
      if (handlers[event]) {
        handlers[event] = handlers[event].filter((h) => h !== handler);
      }
    }),
    _handlers: handlers,
  } as unknown as Editor;
}

function resetMocks() {
  mockYtextContent = '';
  mockYtextDelete.mockClear();
  mockYtextInsert.mockClear();
  mockYtextObserve.mockClear();
  mockYtextUnobserve.mockClear();
  mockAwareness.setLocalStateField.mockClear();
  mockAwareness.getStates.mockClear();
  mockAwareness.on.mockClear();
  mockProvider.disconnect.mockClear();
  mockProvider.destroy.mockClear();
  mockDoc.destroy.mockClear();
  mockDoc.getText.mockClear();
  vi.mocked(Y.Doc).mockClear();
  vi.mocked(WebrtcProvider).mockClear();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('useCollaborationStore', () => {
  beforeEach(() => {
    resetMocks();
    useCollaborationStore.setState({
      isConnected: false,
      roomId: null,
      collaborators: [],
      ydoc: null,
      provider: null,
      ytext: null,
      binding: null,
    });
  });

  // -----------------------------------------------------------------------
  // Initial state
  // -----------------------------------------------------------------------
  describe('initial state', () => {
    it('is not connected by default', () => {
      expect(useCollaborationStore.getState().isConnected).toBe(false);
    });

    it('has no collaborators initially', () => {
      expect(useCollaborationStore.getState().collaborators).toEqual([]);
    });

    it('has null roomId, ydoc, provider, ytext, binding', () => {
      const { roomId, ydoc, provider, ytext, binding } =
        useCollaborationStore.getState();
      expect(roomId).toBeNull();
      expect(ydoc).toBeNull();
      expect(provider).toBeNull();
      expect(ytext).toBeNull();
      expect(binding).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // connect
  // -----------------------------------------------------------------------
  describe('connect', () => {
    it('creates a Y.Doc with "content" text type', async () => {
      const { connect } = useCollaborationStore.getState();

      await connect('room-123', 'Alice');

      expect(Y.Doc).toHaveBeenCalledTimes(1);
      expect(mockDoc.getText).toHaveBeenCalledWith('content');
    });

    it('creates a WebrtcProvider with the roomId and ydoc', async () => {
      const { connect } = useCollaborationStore.getState();

      await connect('room-abc', 'Bob');

      expect(WebrtcProvider).toHaveBeenCalledWith('room-abc', mockDoc, {
        signaling: ['wss://signaling.yjs.dev'],
      });
    });

    it('sets user name and color in awareness', async () => {
      const { connect } = useCollaborationStore.getState();

      await connect('room-1', 'Charlie');

      expect(mockAwareness.setLocalStateField).toHaveBeenCalledWith(
        'user',
        expect.objectContaining({
          id: '12345',
          name: 'Charlie',
          color: expect.any(String),
        }),
      );
    });

    it('sets isConnected to true after connect', async () => {
      const { connect } = useCollaborationStore.getState();

      await connect('room-x', 'Dave');

      const state = useCollaborationStore.getState();
      expect(state.isConnected).toBe(true);
      expect(state.roomId).toBe('room-x');
      expect(state.ydoc).toBe(mockDoc);
      expect(state.provider).toBe(mockProvider);
      expect(state.ytext).toBe(mockYtext);
    });

    it('registers awareness change listener for collaborators', async () => {
      // Verify that awareness.on was called with 'change'
      const { connect } = useCollaborationStore.getState();
      await connect('room-test', 'Eve');
      expect(mockAwareness.on).toHaveBeenCalledWith('change', expect.any(Function));
    });
  });

  // -----------------------------------------------------------------------
  // disconnect
  // -----------------------------------------------------------------------
  describe('disconnect', () => {
    it('disconnects and destroys the provider', async () => {
      const { connect, disconnect } = useCollaborationStore.getState();
      await connect('room-1', 'Alice');
      disconnect();

      expect(mockProvider.disconnect).toHaveBeenCalled();
      expect(mockProvider.destroy).toHaveBeenCalled();
    });

    it('destroys the Y.Doc', async () => {
      const { connect, disconnect } = useCollaborationStore.getState();
      await connect('room-2', 'Bob');
      disconnect();

      expect(mockDoc.destroy).toHaveBeenCalled();
    });

    it('resets all state to defaults after disconnect', async () => {
      const { connect, disconnect } = useCollaborationStore.getState();
      await connect('room-3', 'Charlie');
      disconnect();

      const state = useCollaborationStore.getState();
      expect(state.isConnected).toBe(false);
      expect(state.roomId).toBeNull();
      expect(state.collaborators).toEqual([]);
      expect(state.ydoc).toBeNull();
      expect(state.provider).toBeNull();
      expect(state.ytext).toBeNull();
      expect(state.binding).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // updateAwareness
  // -----------------------------------------------------------------------
  describe('updateAwareness', () => {
    it('sets a local state field on the provider awareness', async () => {
      const { connect, updateAwareness } = useCollaborationStore.getState();
      await connect('room-aw', 'Alice');

      updateAwareness('cursor', { from: 5, to: 10 });

      expect(mockAwareness.setLocalStateField).toHaveBeenCalledWith('cursor', {
        from: 5,
        to: 10,
      });
    });

    it('does nothing when provider is null', () => {
      // No connect called, provider is null
      const { updateAwareness } = useCollaborationStore.getState();
      expect(() => updateAwareness('cursor', { from: 0, to: 0 })).not.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // syncContent
  // -----------------------------------------------------------------------
  describe('syncContent', () => {
    it('clears existing Y.Text and inserts new content', async () => {
      const { connect, syncContent } = useCollaborationStore.getState();
      await connect('room-sync', 'Alice');

      syncContent('# New Content');

      expect(mockYtextDelete).toHaveBeenCalledWith(0, 0); // length was 0
      expect(mockYtextInsert).toHaveBeenCalledWith(0, '# New Content');
    });

    it('does nothing when ytext is null', () => {
      const { syncContent } = useCollaborationStore.getState();
      expect(() => syncContent('# No-op')).not.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // getContent
  // -----------------------------------------------------------------------
  describe('getContent', () => {
    it('returns the current Y.Text content as string', async () => {
      const { connect, syncContent, getContent } = useCollaborationStore.getState();
      await connect('room-gc', 'Alice');
      syncContent('Hello World');

      expect(getContent()).toBe('Hello World');
    });

    it('returns empty string when there is no ytext', () => {
      const { getContent } = useCollaborationStore.getState();
      expect(getContent()).toBe('');
    });
  });

  // -----------------------------------------------------------------------
  // observeUpdates
  // -----------------------------------------------------------------------
  describe('observeUpdates', () => {
    it('registers an observer on ytext (wraps callback in observer fn)', async () => {
      const { connect, observeUpdates } = useCollaborationStore.getState();
      await connect('room-ob', 'Alice');

      const callback = vi.fn();
      observeUpdates(callback);

      // The store wraps callback inside its own observer function
      expect(mockYtextObserve).toHaveBeenCalledTimes(1);
      const observerArg = mockYtextObserve.mock.calls[0][0];
      expect(typeof observerArg).toBe('function');
    });

    it('returns an unsubscribe function that calls unobserve with the same observer', async () => {
      const { connect, observeUpdates } = useCollaborationStore.getState();
      await connect('room-ob2', 'Alice');

      const callback = vi.fn();
      const unsubscribe = observeUpdates(callback);

      // Capture the observer that was passed to observe
      const observerPassedToObserve = mockYtextObserve.mock.calls[0][0];

      unsubscribe();

      expect(mockYtextUnobserve).toHaveBeenCalledWith(observerPassedToObserve);
    });

    it('returns no-op unsubscribe when ytext is null', () => {
      const { observeUpdates } = useCollaborationStore.getState();
      const unsubscribe = observeUpdates(vi.fn());
      expect(() => unsubscribe()).not.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // bindEditor / unbindEditor
  // -----------------------------------------------------------------------
  describe('bindEditor', () => {
    it('attaches update, selectionUpdate, and ytext observe listeners', async () => {
      const { connect, bindEditor } = useCollaborationStore.getState();
      await connect('room-be', 'Alice');

      const editor = createMockEditor('<p>Hello</p>');
      bindEditor(editor);

      expect(editor.on).toHaveBeenCalledWith('update', expect.any(Function));
      expect(editor.on).toHaveBeenCalledWith('selectionUpdate', expect.any(Function));
      expect(mockYtextObserve).toHaveBeenCalled();
    });

    it('stores the binding in state', async () => {
      const { connect, bindEditor } = useCollaborationStore.getState();
      await connect('room-be2', 'Alice');

      const editor = createMockEditor();
      bindEditor(editor);

      const { binding } = useCollaborationStore.getState();
      expect(binding).not.toBeNull();
      expect(binding?.editor).toBe(editor);
    });

    it('does nothing when ytext is null', () => {
      const { bindEditor } = useCollaborationStore.getState();
      const editor = createMockEditor();
      expect(() => bindEditor(editor)).not.toThrow();
    });
  });

  describe('unbindEditor', () => {
    it('removes all listener bindings from the editor', async () => {
      const { connect, bindEditor, unbindEditor } = useCollaborationStore.getState();
      await connect('room-ub', 'Alice');

      const editor = createMockEditor('<p>Test</p>');
      bindEditor(editor);
      unbindEditor();

      expect(editor.off).toHaveBeenCalledWith('update', expect.any(Function));
      expect(editor.off).toHaveBeenCalledWith('selectionUpdate', expect.any(Function));
    });

    it('clears cursor from awareness on unbind', async () => {
      const { connect, bindEditor, unbindEditor } = useCollaborationStore.getState();
      await connect('room-ub2', 'Alice');

      const editor = createMockEditor();
      bindEditor(editor);
      unbindEditor();

      expect(mockAwareness.setLocalStateField).toHaveBeenCalledWith('cursor', null);
    });

    it('sets binding to null in state', async () => {
      const { connect, bindEditor, unbindEditor } = useCollaborationStore.getState();
      await connect('room-ub3', 'Alice');

      const editor = createMockEditor();
      bindEditor(editor);
      unbindEditor();

      expect(useCollaborationStore.getState().binding).toBeNull();
    });
  });
});
