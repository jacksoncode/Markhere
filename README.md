# Markhere

A modern, cross-platform WYSIWYG Markdown editor.

## Features

- ✅ Real-time WYSIWYG editing
- ✅ Multi-platform support (macOS, Windows, Linux)
- ✅ Export to PDF, Word, HTML
- ✅ Multi-format paste (Word, HTML, RTF → Markdown)
- ✅ Image paste & local storage
- ✅ Table editing
- ✅ Code block syntax highlighting
- ✅ Task lists
- ✅ Dark/Light themes

## Tech Stack

- **Tauri 2.5** - Rust-based desktop runtime
- **React 19** - UI framework
- **Tiptap** - WYSIWYG editor engine
- **Zustand** - State management
- **TypeScript** - Type safety

## Development

### Prerequisites

- Node.js 18+
- Rust 1.70+
- npm or pnpm

### Setup

```bash
npm install
npm run tauri:dev
```

### Build

```bash
npm run tauri:build
```

## Project Structure

```
markhere/
├─ src/                # React frontend
│  ├─ components/
│  │  ├─ Editor/       # Tiptap editor
│  │  ├─ Sidebar/      # Navigation panel
│  │  └─ Toolbar/      # Formatting controls
│  ├─ store/           # Zustand state
│  └─ styles/          # Global CSS
├─ src-tauri/          # Rust backend
│  ├─ src/
│  │  ├─ main.rs       # Entry point
│  │  └─ lib.rs        # Tauri commands
│  ├─ Cargo.toml
│  └─ tauri.conf.json
├─ ARCHITECTURE.md     # Architecture docs
└─ package.json
```

## License

MIT