import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorState } from './editorStore';
import type { Editor } from '@tiptap/react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function createMockEditor(): Editor {
  return {
    getHTML: () => '',
    commands: {},
    state: { selection: { from: 0, to: 0 } },
    on: () => {},
    off: () => {},
  } as unknown as Editor;
}

const initialState = {
  content: '',
  editorInstance: null as Editor | null,
  fileName: null as string | null,
  isDirty: false,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('useEditorState', () => {
  beforeEach(() => {
    useEditorState.setState({ ...initialState });
  });

  // -----------------------------------------------------------------------
  // Initial state
  // -----------------------------------------------------------------------
  describe('initial state', () => {
    it('has empty content', () => {
      expect(useEditorState.getState().content).toBe('');
    });

    it('has null editorInstance', () => {
      expect(useEditorState.getState().editorInstance).toBeNull();
    });

    it('has null fileName', () => {
      expect(useEditorState.getState().fileName).toBeNull();
    });

    it('has isDirty=false', () => {
      expect(useEditorState.getState().isDirty).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // setContent
  // -----------------------------------------------------------------------
  describe('setContent', () => {
    it('updates content', () => {
      const { setContent } = useEditorState.getState();
      setContent('# Hello World');

      expect(useEditorState.getState().content).toBe('# Hello World');
    });

    it('marks isDirty=true when content is set', () => {
      const { setContent } = useEditorState.getState();
      setContent('# New Document');

      expect(useEditorState.getState().isDirty).toBe(true);
    });

    it('allows setting empty content', () => {
      useEditorState.setState({ content: '# Previous', isDirty: false });

      const { setContent } = useEditorState.getState();
      setContent('');

      expect(useEditorState.getState().content).toBe('');
      expect(useEditorState.getState().isDirty).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // setEditorInstance
  // -----------------------------------------------------------------------
  describe('setEditorInstance', () => {
    it('stores the editor instance', () => {
      const editor = createMockEditor();
      const { setEditorInstance } = useEditorState.getState();
      setEditorInstance(editor);

      expect(useEditorState.getState().editorInstance).toBe(editor);
    });

    it('allows setting editorInstance to null', () => {
      const editor = createMockEditor();
      useEditorState.setState({ editorInstance: editor });

      const { setEditorInstance } = useEditorState.getState();
      setEditorInstance(null);

      expect(useEditorState.getState().editorInstance).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // setFileName
  // -----------------------------------------------------------------------
  describe('setFileName', () => {
    it('updates fileName', () => {
      const { setFileName } = useEditorState.getState();
      setFileName('document.md');

      expect(useEditorState.getState().fileName).toBe('document.md');
    });

    it('allows setting fileName to null', () => {
      useEditorState.setState({ fileName: 'existing.md' });

      const { setFileName } = useEditorState.getState();
      setFileName(null);

      expect(useEditorState.getState().fileName).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // markDirty
  // -----------------------------------------------------------------------
  describe('markDirty', () => {
    it('sets isDirty to true', () => {
      const { markDirty } = useEditorState.getState();
      markDirty(true);

      expect(useEditorState.getState().isDirty).toBe(true);
    });

    it('sets isDirty to false', () => {
      useEditorState.setState({ isDirty: true });

      const { markDirty } = useEditorState.getState();
      markDirty(false);

      expect(useEditorState.getState().isDirty).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // reset
  // -----------------------------------------------------------------------
  describe('reset', () => {
    it('clears all state to defaults', () => {
      const editor = createMockEditor();
      useEditorState.setState({
        content: '# Some Content',
        editorInstance: editor,
        fileName: 'notes.md',
        isDirty: true,
      });

      const { reset } = useEditorState.getState();
      reset();

      const state = useEditorState.getState();
      expect(state.content).toBe('');
      expect(state.editorInstance).toBeNull();
      expect(state.fileName).toBeNull();
      expect(state.isDirty).toBe(false);
    });

    it('can be called from initial state without error', () => {
      const { reset } = useEditorState.getState();
      expect(() => reset()).not.toThrow();
    });
  });
});
