# Phase 1 Implementation Plan - File Operations & Core Editor

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement complete file operation workflow (New/Open/Save) with real-time auto-save and Markdown serialization.

**Architecture:** Layered architecture with FileService (IPC wrapper), FileStore (Zustand), SaveWorker (debounce), and FileMenuBar (UI). Markdown conversion via tiptap-markdown extension.

**Tech Stack:** React 19, TypeScript, Tiptap, Zustand, Tauri 2.5, tiptap-markdown

---

## Task 1: Install tiptap-markdown Extension

**Files:**
- Modify: `package.json`
- Modify: `src/components/Editor/MainEditor.tsx`

**Step 1: Install tiptap-markdown dependency**

```bash
npm install tiptap-markdown
```

Expected: Package installed successfully

**Step 2: Import Markdown extension in MainEditor**

```typescript
import { Markdown } from 'tiptap-markdown';
```

**Step 3: Add Markdown extension to extensions array**

```typescript
extensions: [
  StarterKit,
  Markdown.configure({
    html: false,
    breaks: true,
    linkify: true,
    transformPastedText: true,
    transformCopiedText: true,
  }),
  Underline,
  Link,
  Code,
  Image,
  // ...rest
]
```

**Step 4: Verify build passes**

```bash
npm run build
```

Expected: Build succeeds without errors

**Step 5: Commit**

```bash
git add package.json package-lock.json src/components/Editor/MainEditor.tsx
git commit -m "feat: add tiptap-markdown for bidirectional conversion"
```

---

## Task 2: Create FileService IPC Wrapper

**Files:**
- Create: `src/services/FileService.ts`

**Step 1: Create FileService.ts**

```typescript
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';

export interface FileResult {
  path: string;
  content: string;
}

export class FileService {
  static async openFile(): Promise<FileResult | null> {
    const path = await open({
      filters: [{ name: 'Markdown', extensions: ['md'] }],
      multiple: false,
    });

    if (!path || typeof path !== 'string') return null;

    const content = await invoke<string>('read_file', { path });
    return { path, content };
  }

  static async saveFile(path: string, content: string): Promise<void> {
    await invoke('save_file', { path, content });
  }

  static async newFile(): Promise<string | null> {
    const path = await save({
      filters: [{ name: 'Markdown', extensions: ['md'] }],
      defaultPath: 'untitled.md',
    });

    return typeof path === 'string' ? path : null;
  }

  static async fileExists(path: string): Promise<boolean> {
    return await invoke<boolean>('file_exists', { path });
  }
}
```

**Step 2: Verify TypeScript compilation**

```bash
npm run build
```

Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add src/services/FileService.ts
git commit -m "feat: create FileService IPC wrapper"
```

---

## Task 3: Create FileStore (Zustand Slice)

**Files:**
- Create: `src/store/fileStore.ts`

**Step 1: Create fileStore.ts**

```typescript
import { create } from 'zustand';

interface FileState {
  currentPath: string | null;
  fileName: string | null;
  savedContent: string;
  isNewFile: boolean;
}

interface FileActions {
  setCurrentPath: (path: string | null) => void;
  setFileName: (name: string | null) => void;
  setSavedContent: (content: string) => void;
  setIsNewFile: (isNew: boolean) => void;
  reset: () => void;
}

const initialState: FileState = {
  currentPath: null,
  fileName: null,
  savedContent: '',
  isNewFile: true,
};

export const useFileStore = create<FileState & FileActions>((set) => ({
  ...initialState,

  setCurrentPath: (path) => {
    const fileName = path ? path.split('/').pop()?.replace('.md', '') || null : null;
    set({ currentPath: path, fileName, isNewFile: false });
  },

  setFileName: (name) => set({ fileName: name }),

  setSavedContent: (content) => set({ savedContent: content }),

  setIsNewFile: (isNew) => set({ isNewFile: isNew }),

  reset: () => set(initialState),
}));
```

**Step 2: Verify build**

```bash
npm run build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/store/fileStore.ts
git commit -m "feat: create FileStore for file state management"
```

---

## Task 4: Create SaveWorker with Debounce

**Files:**
- Create: `src/workers/SaveWorker.ts`

**Step 1: Create SaveWorker.ts**

```typescript
type SaveCallback = () => Promise<void>;

export class SaveWorker {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private delay: number;
  private isSaving: boolean = false;

  constructor(delay: number = 500) {
    this.delay = delay;
  }

  triggerSave(callback: SaveCallback): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.timer = setTimeout(async () => {
      if (this.isSaving) return;
      
      this.isSaving = true;
      try {
        await callback();
      } finally {
        this.isSaving = false;
        this.timer = null;
      }
    }, this.delay);
  }

  immediateSave(callback: SaveCallback): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    return callback();
  }

  cancel(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  getIsSaving(): boolean {
    return this.isSaving;
  }
}

export const saveWorker = new SaveWorker(500);
```

**Step 2: Verify build**

```bash
npm run build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/workers/SaveWorker.ts
git commit -m "feat: create SaveWorker with debounce logic"
```

---

## Task 5: Create FileMenuBar Component

**Files:**
- Create: `src/components/MenuBar/MenuBar.tsx`
- Create: `src/components/MenuBar/MenuBar.css`

**Step 1: Create MenuBar.tsx**

```typescript
import { useFileStore } from '../../store/fileStore';
import { useEditorStore } from '../../store/editorStore';
import { FileService } from '../../services/FileService';
import { saveWorker } from '../../workers/SaveWorker';
import './MenuBar.css';

export function MenuBar() {
  const { currentPath, fileName, isNewFile, setCurrentPath, setSavedContent } = useFileStore();
  const { editorInstance, content } = useEditorStore();

  const handleNewFile = async () => {
    const path = await FileService.newFile();
    if (path) {
      setCurrentPath(path);
      editorInstance?.commands.clearContent();
      setSavedContent('');
    }
  };

  const handleOpenFile = async () => {
    const result = await FileService.openFile();
    if (result) {
      setCurrentPath(result.path);
      editorInstance?.commands.setContent(result.content);
      setSavedContent(result.content);
    }
  };

  const handleSaveFile = async () => {
    if (!currentPath) {
      const path = await FileService.newFile();
      if (!path) return;
      setCurrentPath(path);
    }

    const markdown = editorInstance?.storage.markdown.getMarkdown() || '';
    await saveWorker.immediateSave(async () => {
      await FileService.saveFile(currentPath!, markdown);
      setSavedContent(markdown);
    });
  };

  return (
    <header className="menu-bar">
      <div className="file-info">
        <span className="file-name">{fileName || '未命名'}</span>
        {!isNewFile && content !== useFileStore.getState().savedContent && (
          <span className="dirty-indicator">*</span>
        )}
      </div>
      <div className="menu-actions">
        <button onClick={handleNewFile} title="新建文件">新建</button>
        <button onClick={handleOpenFile} title="打开文件">打开</button>
        <button onClick={handleSaveFile} title="保存文件">保存</button>
      </div>
    </header>
  );
}
```

**Step 2: Create MenuBar.css**

```css
.menu-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
}

.file-info {
  display: flex;
  align-items: center;
  gap: 4px;
}

.file-name {
  font-weight: 600;
  color: var(--color-text);
}

.dirty-indicator {
  color: var(--color-primary);
  font-weight: bold;
}

.menu-actions {
  display: flex;
  gap: 8px;
}

.menu-actions button {
  padding: 6px 12px;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text-secondary);
  cursor: pointer;
}

.menu-actions button:hover {
  background: var(--color-border);
  color: var(--color-text);
}
```

**Step 3: Verify build**

```bash
npm run build
```

Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/components/MenuBar/
git commit -m "feat: create MenuBar component for file operations"
```

---

## Task 6: Integrate MenuBar into App

**Files:**
- Modify: `src/App.tsx`

**Step 1: Import MenuBar in App.tsx**

```typescript
import { MenuBar } from './components/MenuBar/MenuBar';
```

**Step 2: Add MenuBar to layout**

```typescript
function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="app-container">
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <main className="main-content">
        <MenuBar />
        <Toolbar />
        <EditorProvider>
          <MainEditor />
        </EditorProvider>
      </main>
    </div>
  );
}
```

**Step 3: Verify build**

```bash
npm run build
```

Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: integrate MenuBar into app layout"
```

---

## Task 7: Add Keyboard Shortcuts

**Files:**
- Modify: `src/App.tsx`

**Step 1: Add keyboard event listener**

```typescript
import { useEffect } from 'react';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === 'n') {
          e.preventDefault();
          document.querySelector('[title="新建文件"]')?.click();
        } else if (e.key === 'o') {
          e.preventDefault();
          document.querySelector('[title="打开文件"]')?.click();
        } else if (e.key === 's') {
          e.preventDefault();
          document.querySelector('[title="保存文件"]')?.click();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ...rest
}
```

**Step 2: Verify build**

```bash
npm run build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add keyboard shortcuts Cmd+N/O/S"
```

---

## Task 8: Implement Real-time Auto-save

**Files:**
- Modify: `src/components/Editor/MainEditor.tsx`
- Modify: `src/store/editorStore.ts`

**Step 1: Add auto-save trigger in MainEditor**

```typescript
import { useFileStore } from '../../store/fileStore';
import { FileService } from '../../services/FileService';
import { saveWorker } from '../../workers/SaveWorker';

export function MainEditor() {
  const { currentPath, setSavedContent } = useFileStore();
  const { setContent, setEditorInstance } = useEditorState();

  const editor = useEditor({
    // ...extensions
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setContent(html);

      if (currentPath) {
        const markdown = editor.storage.markdown.getMarkdown();
        saveWorker.triggerSave(async () => {
          await FileService.saveFile(currentPath, markdown);
          setSavedContent(markdown);
        });
      }
    },
    // ...rest
  });

  // ...rest
}
```

**Step 2: Verify build**

```bash
npm run build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/Editor/MainEditor.tsx
git commit -m "feat: implement real-time auto-save with debounce"
```

---

## Task 9: Add Rust IPC Commands

**Files:**
- Modify: `src-tauri/src/lib.rs`

**Step 1: Add file_exists command**

```rust
#[tauri::command]
async fn file_exists(path: String) -> Result<bool, String> {
    let exists = std::path::Path::new(&path).exists();
    Ok(exists)
}
```

**Step 2: Register command in invoke_handler**

```rust
.invoke_handler(tauri::generate_handler![
    save_file,
    read_file,
    export_to_pdf,
    export_to_word,
    save_image,
    file_exists,
])
```

**Step 3: Verify Rust compilation**

```bash
cd src-tauri && cargo check
```

Expected: Compilation succeeds

**Step 4: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat: add file_exists IPC command"
```

---

## Task 10: Update ARCHITECTURE.md

**Files:**
- Modify: `ARCHITECTURE.md`

**Step 1: Add Phase 1 modules to architecture**

```markdown
### File Module (Phase 1)

- **FileMenuBar**: UI entry point for file operations
- **FileService**: IPC wrapper for Tauri commands
- **FileStore**: Zustand slice for file state
- **SaveWorker**: Debounce logic for real-time save
- **MarkdownSerializer**: tiptap-markdown bidirectional conversion
```

**Step 2: Commit**

```bash
git add ARCHITECTURE.md
git commit -m "docs: update architecture with Phase 1 modules"
```

---

## Task 11: E2E Manual Testing

**Step 1: Start Tauri dev mode**

```bash
npm run tauri:dev
```

Expected: App launches successfully

**Step 2: Test new file flow**

- Click "新建" button
- Enter filename in dialog
- Type content in editor
- Click "保存"
- Verify file created at specified path

**Step 3: Test open file flow**

- Click "打开" button
- Select an existing .md file
- Verify content renders in editor
- Edit content
- Wait 500ms
- Check file updated automatically

**Step 4: Test keyboard shortcuts**

- Press Cmd+N → Verify new file dialog opens
- Press Cmd+O → Verify open file dialog opens
- Press Cmd+S → Verify file saves immediately

**Step 5: Document test results**

Create test report in comments or document separately.

---

## Summary

**Total Tasks:** 11
**Estimated Time:** 4-5 hours
**Deliverable:** Complete file operation workflow with auto-save

---

## Next Phase Preview

Phase 2 (Week 5-7):
- Export system (PDF/Word/HTML)
- Multi-format paste conversion
- Virtual scrolling optimization