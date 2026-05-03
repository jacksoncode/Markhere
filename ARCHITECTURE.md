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

- **save_file**: Tauri command for saving documents
- **read_file**: Tauri command for reading files
- **Image Storage**: Local image management

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

| Command | Purpose |
|---------|---------|
| save_file | Save document to disk |
| read_file | Read file content |
| export_to_pdf | Generate PDF |
| export_to_word | Generate Word doc |
| save_image | Save pasted image |

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