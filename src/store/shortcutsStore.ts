import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type EditorMode = 'default' | 'vim' | 'emacs';

export interface Shortcut {
  id: string;
  name: string;
  description: string;
  defaultKey: string;
  currentKey: string;
  category: 'file' | 'edit' | 'view' | 'format' | 'insert';
}

const defaultShortcuts: Shortcut[] = [
  // File
  { id: 'open', name: 'Open File', description: 'Open a markdown file', defaultKey: 'Cmd+O', currentKey: 'Cmd+O', category: 'file' },
  { id: 'save', name: 'Save', description: 'Save current file', defaultKey: 'Cmd+S', currentKey: 'Cmd+S', category: 'file' },
  { id: 'saveAs', name: 'Save As', description: 'Save as new file', defaultKey: 'Cmd+Shift+S', currentKey: 'Cmd+Shift+S', category: 'file' },
  { id: 'new', name: 'New File', description: 'Create new file', defaultKey: 'Cmd+N', currentKey: 'Cmd+N', category: 'file' },
  
  // Edit
  { id: 'undo', name: 'Undo', description: 'Undo last action', defaultKey: 'Cmd+Z', currentKey: 'Cmd+Z', category: 'edit' },
  { id: 'redo', name: 'Redo', description: 'Redo last action', defaultKey: 'Cmd+Shift+Z', currentKey: 'Cmd+Shift+Z', category: 'edit' },
  { id: 'cut', name: 'Cut', description: 'Cut selected text', defaultKey: 'Cmd+X', currentKey: 'Cmd+X', category: 'edit' },
  { id: 'copy', name: 'Copy', description: 'Copy selected text', defaultKey: 'Cmd+C', currentKey: 'Cmd+C', category: 'edit' },
  { id: 'paste', name: 'Paste', description: 'Paste from clipboard', defaultKey: 'Cmd+V', currentKey: 'Cmd+V', category: 'edit' },
  { id: 'selectAll', name: 'Select All', description: 'Select all content', defaultKey: 'Cmd+A', currentKey: 'Cmd+A', category: 'edit' },
  { id: 'find', name: 'Find', description: 'Find in document', defaultKey: 'Cmd+F', currentKey: 'Cmd+F', category: 'edit' },
  { id: 'replace', name: 'Find and Replace', description: 'Find and replace text', defaultKey: 'Cmd+Shift+F', currentKey: 'Cmd+Shift+F', category: 'edit' },
  
  // View
  { id: 'toggleSidebar', name: 'Toggle Sidebar', description: 'Show/hide sidebar', defaultKey: 'Cmd+\\', currentKey: 'Cmd+\\', category: 'view' },
  { id: 'focusMode', name: 'Focus Mode', description: 'Enter focus mode', defaultKey: 'Cmd+Shift+F', currentKey: 'Cmd+Shift+F', category: 'view' },
  { id: 'typewriterMode', name: 'Typewriter Mode', description: 'Toggle typewriter mode', defaultKey: 'Cmd+Shift+T', currentKey: 'Cmd+Shift+T', category: 'view' },
  { id: 'sourceMode', name: 'Full Source Mode', description: 'Switch entire document to source view', defaultKey: 'Cmd+Shift+/', currentKey: 'Cmd+Shift+/', category: 'view' },
  { id: 'preview', name: 'Preview', description: 'Preview document', defaultKey: 'Cmd+P', currentKey: 'Cmd+P', category: 'view' },
  
  // Format
  { id: 'bold', name: 'Bold', description: 'Make text bold', defaultKey: 'Cmd+B', currentKey: 'Cmd+B', category: 'format' },
  { id: 'italic', name: 'Italic', description: 'Make text italic', defaultKey: 'Cmd+I', currentKey: 'Cmd+I', category: 'format' },
  { id: 'underline', name: 'Underline', description: 'Underline text', defaultKey: 'Cmd+U', currentKey: 'Cmd+U', category: 'format' },
  { id: 'strike', name: 'Strikethrough', description: 'Strikethrough text', defaultKey: 'Cmd+Shift+X', currentKey: 'Cmd+Shift+X', category: 'format' },
  { id: 'code', name: 'Inline Code', description: 'Make inline code', defaultKey: 'Cmd+E', currentKey: 'Cmd+E', category: 'format' },
  { id: 'link', name: 'Insert Link', description: 'Insert hyperlink', defaultKey: 'Cmd+K', currentKey: 'Cmd+K', category: 'format' },
  { id: 'image', name: 'Insert Image', description: 'Insert image', defaultKey: 'Cmd+Shift+I', currentKey: 'Cmd+Shift+I', category: 'format' },
  
  // Insert
  { id: 'heading1', name: 'Heading 1', description: 'Insert heading 1', defaultKey: 'Cmd+1', currentKey: 'Cmd+1', category: 'insert' },
  { id: 'heading2', name: 'Heading 2', description: 'Insert heading 2', defaultKey: 'Cmd+2', currentKey: 'Cmd+2', category: 'insert' },
  { id: 'heading3', name: 'Heading 3', description: 'Insert heading 3', defaultKey: 'Cmd+3', currentKey: 'Cmd+3', category: 'insert' },
  { id: 'blockquote', name: 'Blockquote', description: 'Insert blockquote', defaultKey: 'Cmd+Shift+Q', currentKey: 'Cmd+Shift+Q', category: 'insert' },
  { id: 'codeBlock', name: 'Code Block', description: 'Insert code block', defaultKey: 'Cmd+Shift+C', currentKey: 'Cmd+Shift+C', category: 'insert' },
  { id: 'list', name: 'Bullet List', description: 'Insert bullet list', defaultKey: 'Cmd+Shift+L', currentKey: 'Cmd+Shift+L', category: 'insert' },
  { id: 'orderedList', name: 'Ordered List', description: 'Insert ordered list', defaultKey: 'Cmd+Shift+O', currentKey: 'Cmd+Shift+O', category: 'insert' },
  { id: 'table', name: 'Insert Table', description: 'Insert table', defaultKey: 'Cmd+T', currentKey: 'Cmd+T', category: 'insert' },
];

interface ShortcutsState {
  shortcuts: Shortcut[];
  isRecording: boolean;
  recordingId: string | null;
  editorMode: EditorMode;
  
  updateShortcut: (id: string, newKey: string) => void;
  resetShortcut: (id: string) => void;
  resetAllShortcuts: () => void;
  startRecording: (id: string) => void;
  stopRecording: () => void;
  getShortcut: (id: string) => Shortcut | undefined;
  getShortcutsByCategory: (category: Shortcut['category']) => Shortcut[];
  setEditorMode: (mode: EditorMode) => void;
}

export const useShortcutsStore = create<ShortcutsState>()(
  persist(
    (set, get) => ({
      shortcuts: defaultShortcuts,
      isRecording: false,
      recordingId: null,
      editorMode: 'default',
      
      updateShortcut: (id, newKey) => set((state) => ({
        shortcuts: state.shortcuts.map((s) =>
          s.id === id ? { ...s, currentKey: newKey } : s
        ),
        isRecording: false,
        recordingId: null,
      })),
      
      resetShortcut: (id) => set((state) => ({
        shortcuts: state.shortcuts.map((s) =>
          s.id === id ? { ...s, currentKey: s.defaultKey } : s
        ),
      })),
      
      resetAllShortcuts: () => set({
        shortcuts: defaultShortcuts.map((s) => ({ ...s, currentKey: s.defaultKey })),
      }),
      
      startRecording: (id) => set({
        isRecording: true,
        recordingId: id,
      }),
      
      stopRecording: () => set({
        isRecording: false,
        recordingId: null,
      }),
      
      getShortcut: (id) => get().shortcuts.find((s) => s.id === id),
      
      getShortcutsByCategory: (category) => get().shortcuts.filter((s) => s.category === category),
      
      setEditorMode: (mode) => set({ editorMode: mode }),
    }),
    {
      name: 'shortcuts-storage',
    }
  )
);