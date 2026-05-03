# Markhere Architecture

## Overview

Markhere is a cross-platform WYSIWYG Markdown editor built with Tauri + React + Tiptap.

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Runtime | Tauri 2.5 | Desktop app wrapper (Rust backend) |
| Frontend | React 19 + TypeScript | UI framework |
| Editor Core | Tiptap (ProseMirror) | WYSIWYG editing engine |
| State | Zustand 5 | Global state management |
| Build | Vite 6 | Frontend bundler |

## Architecture Layers

```
┌──────────────────────────────────────────────┐
│          Presentation Layer (React)          │
│  ├─ UI Components                            │
│  ├─ Editor Components                        │
│  └─ Sidebar/Toolbar                          │
├──────────────────────────────────────────────┤
│          Business Logic Layer                │
│  ├─ Editor Store (Zustand)                   │
│  ├─ Command Processor                        │
│  ├─ File Manager                             │
├──────────────────────────────────────────────┤
│          Core Engine Layer                   │
│  ├─ Tiptap Extensions                        │
│  ├─ Markdown Serializer                      │
│  ├─ Virtual Scroller                         │
├──────────────────────────────────────────────┤
│          Infrastructure Layer                │
│  ├─ Tauri IPC                                │
│  ├─ File I/O Service                         │
│  ├─ Export Workers                           │
├──────────────────────────────────────────────┤
│          Platform Runtime                    │
│  ├─ Tauri (Rust)                             │
│  ├─ WebView                                  │
│  ├─ Native APIs                              │
└──────────────────────────────────────────────┘
```

## Key Modules

### Editor Module

- **MainEditor**: Core editing component using Tiptap
- **EditorProvider**: Context provider for editor instance
- **Extensions**: StarterKit, Image, Table, CodeBlock, etc.

### File Module

- **FileService**: TypeScript IPC wrapper for Tauri commands
- **FileStore**: Zustand slice for file state (path, content, dirty flag)
- **SaveWorker**: Debounced save worker (500ms delay, prevents data loss)
- **file_exists**: Tauri command checking file existence
- **save_file**: Tauri command for saving documents
- **read_file**: Tauri command for reading files
- **Image Storage**: Local image management
- **Auto-save**: Real-time content persistence on every edit

### UI Components

- **MenuBar**: Top navigation bar with file operations
- **Keyboard Shortcuts**: Cmd+S (save), Cmd+N (new), Cmd+O (open)
- **Dirty Indicator**: Visual flag for unsaved changes

### Export Module

- **PDF Export**: Puppeteer-based rendering
- **Word Export**: Pandoc pipeline
- **HTML Export**: Direct serialization

## Data Flow

```
User Input → Tiptap Transaction → JSON Document
                                    ↓
                      Markdown Serializer → .md File
                                    ↑
React Components ← Zustand Store ← IPC Response
```

## IPC Commands

| Command | Purpose | Parameters |
|---------|---------|------------|
| save_file | Save document to disk | path: String, content: String |
| read_file | Read file content | path: String |
| file_exists | Check if file exists | path: String |
| export_to_pdf | Generate PDF | html: String, output_path: String |
| export_to_word | Generate Word doc | markdown: String, output_path: String |
| save_image | Save pasted image | image_data: String (base64), filename: String |

## Security

- **CSP**: Restricted to self + data URLs
- **File Access**: Scoped to user directories
- **Sandbox**: Web Worker isolation for plugins

## Performance

- **Virtual Scrolling**: Only render visible content
- **Incremental Rendering**: Tiptap partial updates
- **Worker Isolation**: Export in background thread

## Development Roadmap

### Phase 1 (Weeks 1-4)
- Core editor with Tiptap
- Basic file operations
- Image paste/save

### Phase 2 (Weeks 5-7)
- Export system (PDF/Word/HTML)
- Multi-format paste conversion
- Auto-save draft

### Phase 3 (Weeks 8-11)
- Plugin API
- Theme system
- Virtual scrolling optimization

### Phase 4 (Weeks 12+)
- AI integration
- Cloud sync
- Collaboration features