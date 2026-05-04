# Markhere

<div align="center">

**A Modern, Cross-Platform WYSIWYG Markdown Editor**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-2.5-orange.svg)](https://tauri.app)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue.svg)](https://www.typescriptlang.org)

*Write beautifully. Export anywhere. Collaborate seamlessly.*

[English](README.md) | [中文文档](README_CN.md)

</div>

---

## 📖 Overview

Markhere is a next-generation WYSIWYG Markdown editor designed for modern writers, developers, and teams. Built with **Tauri 2.5** and **React 19**, it delivers native performance with web flexibility, supporting macOS, Windows, and Linux.

Unlike traditional Markdown editors that require syntax knowledge, Markhere provides a seamless **What You See Is What You Get** experience while preserving full Markdown compatibility for export and version control.

---

## ✨ Key Features

### 🎯 Core Editing
- ✅ **Real-time WYSIWYG Editing** - Write naturally, see formatted output instantly
- ✅ **Smart Markdown Conversion** - Automatic formatting detection and conversion
- ✅ **Multi-format Paste Support** - Word, HTML, RTF → Markdown
- ✅ **Rich Text Formatting** - Bold, italic, underline, strikethrough, code, links
- ✅ **Table Editing** - Full table creation, editing, sorting, and filtering
- ✅ **Code Block Syntax Highlighting** - 50+ language support with Prism.js
- ✅ **Math Equations** - KaTeX/LaTeX equation rendering
- ✅ **Mermaid Diagrams** - Flowcharts, sequence diagrams, Gantt charts
- ✅ **Task Lists** - Interactive checkboxes with completion tracking
- ✅ **Footnotes & Citations** - Academic writing support

### 📁 Document Management
- ✅ **Multi-document Tabs** - Open and edit multiple files simultaneously
- ✅ **Drag & Drop Tab Reordering** - Flexible workspace organization
- ✅ **Document Templates** - 7 pre-built templates (Academic, Diary, Meeting Minutes, Blog, Project Plan, Weekly Report, Reading Notes)
- ✅ **Bookmark System** - Quick location marking and navigation
- ✅ **Outline Navigation** - Hierarchical document structure with drag-sort
- ✅ **Auto-save & Crash Recovery** - Never lose your work with draft protection
- ✅ **Version History** - Git-based diff visualization and rollback

### 🤝 Collaboration & Sync
- ✅ **Real-time Collaboration** - Y.js-powered WebRTC synchronization
- ✅ **Cloud Sync** - iCloud/Google Drive integration
- ✅ **Link Validation** - Dead link detection and status indicators

### 🚀 Productivity Tools
- ✅ **Command Palette (Cmd+K)** - 40+ searchable commands with categories
- ✅ **AI Writing Assistant** - Smart completion, refinement, and translation
- ✅ **Pomodoro Timer** - Focus tracking with statistics
- ✅ **Word Goal Progress** - Set targets with visual progress bars
- ✅ **Word Statistics** - Reading time, speaking time, paragraphs, sentences
- ✅ **Spell Check** - LanguageTool API integration for English/Chinese
- ✅ **Focus Mode** - Distraction-free writing environment
- ✅ **Typewriter Mode** - Centered cursor for natural writing flow

### 🎨 User Experience
- ✅ **Theme CSS Editor** - Custom color schemes and font configurations
- ✅ **Dark/Light Themes** - System-aware theme switching
- ✅ **Resizable Images** - Corner-drag with aspect ratio preservation
- ✅ **Image Media Library** - Organized image asset management
- ✅ **Emoji Picker** - Quick emoji insertion panel
- ✅ **Split View** - Side-by-side editing and preview

### 📤 Export & Integration
- ✅ **PDF Export** - High-quality PDF generation
- ✅ **Word Export** - DOCX format with formatting preservation
- ✅ **HTML Export** - Clean, responsive HTML output
- ✅ **EPUB Export** - E-book format for publishing
- ✅ **Code Execution Sandbox** - Safe JavaScript/Python execution
- ✅ **Plugin System** - Extensible architecture for custom features

---

## 🛠 Tech Stack

| Technology | Purpose | Version |
|------------|---------|---------|
| **Tauri** | Desktop Runtime | 2.5 |
| **React** | UI Framework | 19 |
| **TypeScript** | Type Safety | Strict Mode |
| **Tiptap** | Editor Engine | Latest |
| **Zustand** | State Management | Latest |
| **Y.js** | CRDT Sync | Latest |
| **Rust** | Backend | 1.70+ |
| **Prism.js** | Syntax Highlighting | Latest |
| **KaTeX** | Math Rendering | Latest |
| **Mermaid** | Diagram Rendering | Latest |

---

## 📦 Installation

### System Requirements

| Platform | Requirements |
|----------|-------------|
| **macOS** | macOS 10.15+ (Catalina or later) |
| **Windows** | Windows 10/11 (64-bit) |
| **Linux** | Ubuntu 18.04+, Debian 10+, Fedora 30+ |

### Download

Visit our [Releases](https://github.com/jacksoncode/Markhere/releases) page to download the latest version.

**Available Platforms:**

| Platform | Format | Status |
|----------|--------|--------|
| **Linux (x86_64)** | `.deb`, `.AppImage` | ✅ Available |
| **macOS** | `.dmg` | ⚠️ Build locally |
| **Windows** | `.msi`, `.exe` | ⚠️ Build locally |

> **Note**: macOS and Windows builds require local compilation. Follow the [CONTRIBUTING.md](CONTRIBUTING.md) for build instructions.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/jacksoncode/Markhere.git
cd Markhere

# Install dependencies
npm install

# Run development server
npm run tauri:dev

# Build for production
npm run tauri:build
```

### Prerequisites for Development

- **Node.js** 18+ (LTS recommended)
- **Rust** 1.70+ (via [rustup](https://rustup.rs))
- **npm** or **pnpm**

---

## 🎮 Usage

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Open Command Palette |
| `Cmd/Ctrl + S` | Save Document |
| `Cmd/Ctrl + O` | Open File |
| `Cmd/Ctrl + N` | New Document |
| `Cmd/Ctrl + B` | Bold |
| `Cmd/Ctrl + I` | Italic |
| `Cmd/Ctrl + U` | Underline |
| `Cmd/Ctrl + E` | Code |
| `Cmd/Ctrl + K` | Insert Link |
| `Cmd/Ctrl + 1-6` | Heading Level |
| `Cmd/Ctrl + Shift + F` | Focus Mode |
| `Cmd/Ctrl + Shift + T` | Typewriter Mode |
| `Cmd/Ctrl + /` | Source Mode Toggle |
| `Cmd/Ctrl + Shift + K` | Keyboard Shortcuts Panel |

### Command Palette

Press `Cmd+K` (macOS) or `Ctrl+K` (Windows/Linux) to open the Command Palette. Search and execute any command instantly across 8 categories:

- **File**: New, Open, Save, Export
- **Edit**: Undo, Redo, Cut, Copy, Paste
- **Format**: Bold, Italic, Heading, List, Quote
- **Insert**: Image, Table, Code Block, Task List
- **View**: Sidebar, Focus Mode, Typewriter Mode, Dark Mode
- **Tools**: Find, Replace, Word Count, Spell Check
- **Collaboration**: Share, Connect, Sync
- **Help**: Shortcuts, Guide, About

---

## 📁 Project Structure

```
Markhere/
├── src/                        # React Frontend
│   ├── components/             # UI Components
│   │   ├── Editor/             # Tiptap Editor Core
│   │   ├── TitleBar/           # macOS-style Title Bar
│   │   ├── Toolbar/            # Formatting Toolbar
│   │   ├── Sidebar/            # Navigation & Outline
│   │   ├── StatusBar/          # Word Count & Status
│   │   ├── CommandPalette/     # Cmd+K Command Search
│   │   ├── Collaboration/      # Real-time Sync
│   │   ├── ThemeEditor/        # Custom Themes
│   │   └── ...                 # 26 Component Modules
│   ├── extensions/             # Tiptap Extensions
│   │   ├── ResizableImage/     # Image Resize Handles
│   │   ├── MathExtension/      # KaTeX Support
│   │   ├── MermaidExtension/   # Diagram Support
│   │   └── FootnoteExtension/  # Academic Footnotes
│   ├── store/                  # Zustand State Management
│   │   ├── aiStore.ts          # AI Assistant State
│   │   ├── autoSaveStore.ts    # Auto-save & Recovery
│   │   ├── collaborationStore.ts # Y.js Sync
│   │   ├── tabsStore.ts        # Multi-document Tabs
│   │   └── ...                 # 12 Store Modules
│   ├── data/                   # Static Data
│   │   └── templates.ts        # Document Templates
│   ├── services/               # Business Logic
│   └── styles/                 # Global CSS
│
├── src-tauri/                  # Rust Backend
│   ├── src/
│   │   ├── lib.rs              # IPC Commands
│   │   └── main.rs             # Entry Point
│   ├── Cargo.toml              # Dependencies
│   ├── tauri.conf.json         # App Configuration
│   └── icons/                  # Platform Icons
│
├── docs/                       # Documentation
├── .github/workflows/          # CI/CD Pipeline
├── package.json                # NPM Dependencies
└── README.md                   # This File
```

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'feat: add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Guidelines

- Follow the existing code style
- Write tests for new features
- Update documentation as needed
- Ensure TypeScript strict mode compliance
- Run `npm run build` before submitting PRs

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Tauri Team** - For the amazing cross-platform framework
- **Tiptap Community** - For the extensible editor engine
- **Y.js Authors** - For the CRDT collaboration technology
- **All Contributors** - For making Markhere better

---

## 📮 Contact & Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/jacksoncode/Markhere/issues)
- **Discussions**: [Community Q&A](https://github.com/jacksoncode/Markhere/discussions)
- **Releases**: [Download latest version](https://github.com/jacksoncode/Markhere/releases)

---

<div align="center">

**Made with ❤️ by the Markhere Team**

*If you find Markhere useful, please consider giving it a ⭐ star!*

</div>