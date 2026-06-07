import { Editor } from '@tiptap/react';

interface EditorState {
  content: string;
  editorInstance: Editor | null;
  fileName: string | null;
}

interface EditorActions {
  setContent: (content: string) => void;
  setEditorInstance: (editor: Editor | null) => void;
  setFileName: (name: string | null) => void;
  reset: () => void;
}

import { create } from 'zustand';

const initialState: EditorState = {
  content: '',
  editorInstance: null,
  fileName: null,
};

export const useEditorState = create<EditorState & EditorActions>((set) => ({
  ...initialState,

  setContent: (content) => set({ content }),

  setEditorInstance: (editor) => set({ editorInstance: editor }),

  setFileName: (name) => set({ fileName: name }),

  reset: () => set(initialState),
}));