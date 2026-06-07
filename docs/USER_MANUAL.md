# Markhere User Manual v1.0.0

## Quick Start

1. **Type Markdown and see it render instantly** — no preview toggle needed.
2. **Cmd+K** opens the Command Palette — search for any action.
3. **Drag and drop** images or files from your OS directly into the editor.
4. **Use `[[filename]]`** to create bidirectional links between notes.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Command Palette |
| `Cmd/Ctrl + S` | Save |
| `Cmd/Ctrl + N` | New File |
| `Cmd/Ctrl + O` | Open File |
| `Cmd/Ctrl + P` | Quick Open |
| `Cmd/Ctrl + W` | Close Window |
| `Cmd/Ctrl + B` | Bold |
| `Cmd/Ctrl + I` | Italic |
| `Cmd/Ctrl + U` | Underline |
| `Cmd/Ctrl + E` | Expand selection |
| `Cmd/Ctrl + 1~6` | Heading level |
| `Cmd/Ctrl + Shift + F` | Focus Mode |
| `Cmd/Ctrl + Shift + T` | Typewriter Mode |
| `Cmd/Ctrl + /` | Source Mode |
| `Cmd/Ctrl + Shift + C` | Word Count |
| `Cmd/Ctrl + Home` | Jump to top |
| `Cmd/Ctrl + End` | Jump to bottom |
| `Cmd/Ctrl + J` | Scroll to selection |
| `Cmd/Ctrl + Shift + D` | Delete word |
| `Cmd/Ctrl + Shift + V` | Paste as plain text |
| `Cmd/Ctrl + Shift + ↑/↓` | Change heading level |

---

## Sidebar Tabs

1. **Files** — Browse file tree and recent files.
2. **Outline** — Hierarchical document structure with drag-reorder.
3. **Bookmarks** — Quick jump to saved locations.
4. **Database** — Notion-like table/board/calendar/timeline views.
5. **Query** — Obsidian-like Dataview SQL queries on your notes.
6. **Canvas** — Visual whiteboard with draggable cards and connections.

---

## Database Views

Create databases with `+ New` in the Database sidebar tab. Each database supports:

- **Table View** — Inline editing, sort by column, 6 property types (text/number/date/select/multi-select/checkbox).
- **Board View** — Kanban-style cards, drag between columns.
- **Calendar View** — Date-grouped display.
- **Timeline View** — Chronological line chart.

Data is stored as `.db.json` files. Reference databases in Markdown with `[[database:id]]`.

## Dataview Queries

Index your note vault by entering a directory path, then run SQL-like queries:

```sql
SELECT title, tags, created FROM "" WHERE tags CONTAINS "project" SORT created DESC LIMIT 10
```

Supported: `SELECT`, `FROM`, `WHERE` (CONTAINS, =, !=), `SORT` (ASC/DESC), `LIMIT`.

---

## AI Assistant

6 AI actions available in the AI panel:

- **Summarize** — Generate 3-5 sentence summary
- **Translate** — Translate to 7 languages (zh/en/ja/ko/fr/de/es)
- **Polish** — Improve writing (academic/casual/professional styles)
- **Tags** — Auto-suggest 5-8 tags
- **Tips** — Get writing improvement suggestions
- **Outline** — Generate structured outline

**Advanced** (available when configured): Mind map generation, code optimization, table analysis, style consistency check.

---

## Export Formats

| Format | Output |
|--------|--------|
| PDF | High-quality with embedded fonts |
| Word | DOCX with formatting preservation |
| HTML | Responsive with heading IDs |
| PowerPoint | Slide deck (H1/H2 as slides) |
| LaTeX | Academic paper template |
| EPUB | E-book format |
| Markdown | Clean Markdown |

## Theme Manager

- **Import** `.theme.json` files via dialog
- **Preview** before applying
- **Export** current theme colors
- Built-in dark theme with WCAG AA compliance

---

## Plugin Marketplace

Access from Plugin Manager. Built-in plugins:

1. **PPTX Exporter** — Export as PowerPoint slides
2. **LaTeX Exporter** — Academic paper export
3. **Mind Map Generator** — Visualize heading structure
4. **Grammar Checker** — LanguageTool integration
5. **Code Runner** — Execute code blocks in-editor

Install/uninstall with one click. Each plugin lists required permissions.

---

## Collaboration

Real-time editing via WebRTC (Y.js):

1. Enter a room ID and your name
2. Share the room ID with collaborators
3. Changes sync automatically

Canvas collaboration supports:
- Shared cards and connections
- Permission levels (read-only / edit / admin)
- Automatic conflict resolution

---

## Version History

- **Auto-save** every 30 seconds (compressed snapshots)
- **Manual tags** for milestones
- **Diff view** with line-level and character-level highlighting
- **Restore** any previous version

---

## Writing Analyzer

- Word / character / sentence / paragraph counts
- Average sentence and paragraph lengths
- Estimated reading time (200 wpm) and speaking time (130 wpm)
- Lexical density and fluency score (0-100)
- Session history and writing speed tracking

---

## Data Recovery

- **Emergency snapshots** saved on every keypress (throttled)
- **Checksum verification** prevents corrupted recovery
- **Rust-level file backups** in `~/Markhere/backups/` (last 20)
- **Crash recovery** on next launch

---

## Performance

- Startup < 1.5s (target: < 1s in v1.0)
- Large files (>5MB) loaded in chunks with progress bar
- Virtual scrolling for documents >50 nodes
- FPS monitoring with warnings below 30fps
- Memory warnings above 400MB

---

## Plugin Development Guide

Plugins are `.theme.json` or JavaScript modules. Format:

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "author": "Your Name",
  "description": "What it does",
  "category": "editor",
  "tags": ["example"],
  "permissions": ["fs.read"],
  "main": "index.js"
}
```

Allowed permissions: `fs.read`, `fs.write`, `network`, `clipboard.read`, `clipboard.write`, `ui.render`, `editor.extend`.

---

## FAQ

**Q: Can I use Markhere offline?**  
A: Yes. All data is stored locally. Only AI and collaboration features need network.

**Q: Where are my files saved?**  
A: Markdown files are saved wherever you choose. Backups go to `~/Markhere/backups/`.

**Q: How do I recover lost work?**  
A: On next launch, recovery dialog appears if unsaved data is detected. You can also browse backups via Data Recovery settings.

**Q: What AI providers are supported?**  
A: OpenAI, DeepSeek, Ollama (local), and 9 other providers. Configure in Settings > AI.

**Q: Is Markhere free?**  
A: Yes, MIT license. Open source forever.

---

**Markhere v1.0.0 — 国产高端 Markdown 编辑器**
