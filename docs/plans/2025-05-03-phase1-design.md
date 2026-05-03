# Phase 1 Design Document - Core Editor & File Operations

## Overview

Phase 1 focuses on establishing the foundation of Markhere: a complete file operation workflow, real-time save mechanism, and essential Markdown editing capabilities.

**Duration:** 4 weeks  
**Goal:** Users can create, open, edit, and save Markdown files with real-time auto-save and core syntax support.

---

## Requirements Summary

| Category | Requirement | Priority |
|----------|-------------|----------|
| File Operations | New / Open / Save | P0 |
| Auto-save | Real-time save with debounce (500ms) | P0 |
| File Format | .md primary, multi-format export | P0 |
| Markdown Syntax | Basic + Table + TaskList + Highlight | P0 |

---

## Architecture Design

### Layer Structure

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                    │
│  ┌─────────────┬─────────────┬─────────────┬──────────┐ │
│  │ FileMenuBar │ MainEditor  │ Toolbar     │ Sidebar  │ │
│  │ (新建/打开) │ (Tiptap)    │ (格式化)    │ (文件树) │ │
│  └─────────────┴─────────────┴─────────────┴──────────┘ │
├─────────────────────────────────────────────────────────┤
│                    Business Logic Layer                  │
│  ┌──────────────┬──────────────┬──────────────────────┐│
│  │ FileStore    │ EditorStore  │ SaveWorker           ││
│  │ (文件状态)   │ (编辑状态)   │ (实时保存防抖)       ││
│  └──────────────┴──────────────┴──────────────────────┘│
├─────────────────────────────────────────────────────────┤
│                    Infrastructure Layer                  │
│  ┌────────────┬────────────┬────────────┬─────────────┐│
│  │ Tauri IPC  │ Markdown   │ File       │ Dialog      ││
│  │ Commands   │ Serializer │ Service    │ Plugin      ││
│  └────────────┴────────────┴────────────┴─────────────┘│
└─────────────────────────────────────────────────────────┘
```

### New Modules

| Module | Responsibility | Implementation |
|--------|----------------|----------------|
| FileMenuBar | File operation entry point | React component + Tauri menu |
| FileStore | File path, content, dirty state | Zustand slice |
| SaveWorker | Real-time save debounce (500ms) | setTimeout + debounce |
| MarkdownSerializer | Tiptap JSON ↔ Markdown string | tiptap-markdown extension |
| FileService | Unified file operation interface | IPC wrapper |

---

## Data Flow Design

### Open File Flow

```
User click "Open" → FileMenuBar → Tauri Dialog Plugin
                                       ↓
                                 Select file path
                                       ↓
                             IPC: read_file(path)
                                       ↓
                             Rust: fs::read_to_string
                                       ↓
                             Return Markdown content
                                       ↓
                             FileStore.setContent()
                                       ↓
                             EditorStore.updateEditor()
                                       ↓
                             Tiptap editor render
```

### Save File Flow

```
User edit → Tiptap onUpdate → EditorStore.setContent()
                                    ↓
                              SaveWorker.debounce()
                              (Real-time: 500ms delay)
                                    ↓
                              MarkdownSerializer.toJSON()
                                    ↓
                              IPC: save_file(path, content)
                                    ↓
                              Rust: fs::write
                                    ↓
                              FileStore.markDirty(false)
```

### State Schema

```typescript
FileStore {
  currentPath: string | null      // Current file path
  fileName: string | null         // Display name
  savedContent: string            // Saved content (for dirty check)
  isNewFile: boolean              // Is new file flag
}

EditorStore {
  editorInstance: Editor | null   // Tiptap instance
  content: string                 // Current content
}

SaveWorker {
  debounceTimer: number | null    // Debounce timer
  isSaving: boolean               // Save lock flag
}
```

---

## Component Design

### FileMenuBar

```typescript
interface FileMenuBarProps {
  onNewFile: () => void;
  onOpenFile: () => void;
  onSaveFile: () => void;
  fileName: string | null;
  isDirty: boolean;
}

const menuItems = [
  { label: '新建', shortcut: 'Cmd+N', action: onNewFile },
  { label: '打开', shortcut: 'Cmd+O', action: onOpenFile },
  { label: '保存', shortcut: 'Cmd+S', action: onSaveFile },
];
```

### SaveWorker

```typescript
class SaveWorker {
  private timer: number | null = null;
  private delay = 500;

  triggerSave(callback: () => Promise<void>) {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(async () => {
      await callback();
      this.timer = null;
    }, this.delay);
  }

  immediateSave(callback: () => Promise<void>) {
    if (this.timer) clearTimeout(this.timer);
    return callback();
  }
}
```

### MarkdownSerializer

```typescript
import { Markdown } from 'tiptap-markdown';

const markdownExtension = Markdown.configure({
  html: false,
  breaks: true,
  linkify: true,
  transformPastedText: true,
});

// Get Markdown content
const content = editor.storage.markdown.getMarkdown();
```

### FileService

```typescript
class FileService {
  async openFile(): Promise<{ path: string; content: string } | null> {
    const path = await dialog.open({
      filters: [{ name: 'Markdown', extensions: ['md'] }],
    });
    if (!path) return null;
    
    const content = await invoke<string>('read_file', { path });
    return { path, content };
  }

  async saveFile(path: string, content: string): Promise<void> {
    await invoke('save_file', { path, content });
  }

  async newFile(): Promise<string | null> {
    const path = await dialog.save({
      filters: [{ name: 'Markdown', extensions: ['md'] }],
      defaultPath: 'untitled.md',
    });
    return path;
  }
}
```

---

## Tauri IPC Commands

### Existing Commands

```rust
#[tauri::command]
async fn save_file(path: String, content: String) -> Result<String, String>

#[tauri::command]
async fn read_file(path: String) -> Result<String, String>
```

### Phase 1 Additions

```rust
#[tauri::command]
async fn file_exists(path: String) -> Result<bool, String>

#[tauri::command]
async fn get_file_info(path: String) -> Result<FileInfo, String>

#[tauri::command]
async fn delete_file(path: String) -> Result<(), String>

#[tauri::command]
async fn watch_file(app: AppHandle, path: String) -> Result<(), String>

struct FileInfo {
    size: u64,
    modified: u64,
}
```

---

## Editor Extensions

### Phase 1 Configuration

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
  Image.configure({
    inline: true,
    allowBase64: true,
  }),
  Table.configure({ resizable: true }),
  TableRow,
  TableCell,
  TableHeader,
  Placeholder,
  Typography,
  Highlight.configure({ multicolor: true }),
  TaskList,
  TaskItem.configure({ nested: true }),
]
```

### Toolbar Additions

```typescript
const phase1Actions = [
  // Table operations
  { label: '加行', action: () => editor.chain().focus().addRowBefore().run() },
  { label: '加列', action: () => editor.chain().focus().addColumnBefore().run() },
  { label: '删行', action: () => editor.chain().focus().deleteRow().run() },
  { label: '删列', action: () => editor.chain().focus().deleteColumn().run() },
  
  // Highlight colors
  { label: '黄', action: () => editor.chain().focus().toggleHighlight({ color: '#fef3c7' }).run() },
  { label: '红', action: () => editor.chain().focus().toggleHighlight({ color: '#fee2e2' }).run() },
  { label: '绿', action: () => editor.chain().focus().toggleHighlight({ color: '#d1fae5' }).run() },
];
```

---

## Error Handling

### Error Types

```typescript
enum FileErrorType {
  READ_FAILED,
  SAVE_FAILED,
  FILE_NOT_FOUND,
  PERMISSION_DENIED,
  INVALID_PATH,
  CONFLICT,
}
```

### Handling Strategy

| Error | Action |
|-------|--------|
| FILE_NOT_FOUND | Toast: "文件不存在，请检查路径" |
| PERMISSION_DENIED | Toast: "无权限访问该文件" |
| SAVE_FAILED | Toast: "保存失败，内容已保留"; LocalStorage backup |
| CONFLICT | Modal: "文件已被外部修改，是否重新加载？" |

---

## Performance Optimization

| Scenario | Strategy |
|----------|----------|
| Real-time save | Debounce 500ms |
| Large file | Virtual scrolling (Phase 3) |
| Markdown conversion | Incremental update via Tiptap Diff |
| Image processing | Compress >500KB, async save via Web Worker |
| State sync | Batch updates via Zustand |

---

## Test Plan

### Unit Tests

```typescript
// FileService.test.ts
- Open Markdown file and parse content correctly
- Save file successfully returns path
- File not exists returns null

// SaveWorker.test.ts
- Debounce 500ms before save
- Immediate save executes instantly

// MarkdownSerializer.test.ts
- Tiptap JSON → Markdown string
- Markdown string → Tiptap JSON
- Table syntax correct conversion
```

### E2E Checklist

| Feature | Steps | Success Criteria |
|---------|-------|-------------------|
| New File | Cmd+N → Name → Save | File created, editor cleared |
| Open File | Cmd+O → Select .md → Confirm | Content rendered correctly |
| Save File | Edit → Cmd+S → Check file | Markdown saved correctly |
| Auto-save | Edit → Wait 500ms → Check file | Auto saved successfully |
| Table Edit | Insert table → Add rows/columns → Input | Table renders and saves |
| Task List | Create task → Click checkbox → Check state | State toggles correctly |
| Image Paste | Screenshot → Paste → Check | Image displays and saves |
| External Change | Edit externally → Return to app | Conflict modal appears |

---

## Week-by-Week Plan

### Week 1: File Dialog + IPC Communication

- Tauri dialog plugin integration
- New/Open/Save menu implementation
- File path state management

**Deliverable:** File operations menu functional

### Week 2: Markdown Serialization + Real-time Save

- Tiptap ↔ Markdown converter
- Debounce optimization
- State persistence

**Deliverable:** Auto-save working with debounce

### Week 3: Editor Extensions Enhancement

- Table visual editing
- TaskList interaction optimization
- Highlight color picker

**Deliverable:** Table/Task/Highlight fully functional

### Week 4: Integration Testing + Basic Export

- HTML export implementation
- Complete file workflow verification
- Performance validation

**Deliverable:** End-to-end workflow tested and validated

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Save latency | <100ms |
| File open time | <200ms for <1MB files |
| UI response time | <16ms (60fps) |
| Test coverage | >80% for FileService, SaveWorker |

---

## Dependencies

- tiptap-markdown (new)
- Tauri dialog plugin (configured)
- Tauri fs plugin (configured)

---

## Risks

| Risk | Mitigation |
|------|------------|
| Markdown conversion accuracy | Test against commonmark spec examples |
| Real-time save performance | Fallback to manual save if debounce fails |
| External file conflict | User choice modal + local draft backup |

---

## Next Steps

1. Invoke writing-plans skill to create implementation plan
2. Begin Week 1 development with file operations
3. Setup testing infrastructure for continuous validation