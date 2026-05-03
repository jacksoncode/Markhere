import { Editor } from '@tiptap/react';

interface EditorState {
  content: string;
  editorInstance: Editor | null;
  fileName: string | null;
  isDirty: boolean;
}

interface EditorActions {
  setContent: (content: string) => void;
  setEditorInstance: (editor: Editor | null) => void;
  setFileName: (name: string | null) => void;
  markDirty: (dirty: boolean) => void;
  reset: () => void;
}

import { create } from 'zustand';

const initialState: EditorState = {
  content: '',
  editorInstance: null,
  fileName: null,
  isDirty: false,
};

export const useEditorState = create<EditorState & EditorActions>((set) => ({
  ...initialState,

  setContent: (content) => set({ content, isDirty: true }),

  setEditorInstance: (editor) => set({ editorInstance: editor }),

  setFileName: (name) => set({ fileName: name }),

  markDirty: (dirty) => set({ isDirty: dirty }),

  reset: () => set(initialState),
}));