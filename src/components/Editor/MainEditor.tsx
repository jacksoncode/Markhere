import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Code from '@tiptap/extension-code';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import Highlight from '@tiptap/extension-highlight';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Markdown } from 'tiptap-markdown';
import { MathExtension, InlineMathExtension, MermaidExtension, CodeBlockHighlight, FootnoteExtension, AutocompleteExtension } from '../../extensions';
import { open as shellOpen } from '@tauri-apps/plugin-shell';
import { ResizableImageExtension } from '../../extensions/ResizableImage';
import { TableOperations } from '../TableOperations/TableOperations';
import { useEditorState } from '../../store/editorStore';
import { useFileStore } from '../../store/fileStore';
import { useUIState } from '../../store/uiStore';
import { useAutoSaveStore } from '../../store/autoSaveStore';
import { useCollaborationStore } from '../../store/collaborationStore';
import { useImageStorageStore } from '../../store/imageStorageStore';
import { FileService } from '../../services/FileService';
import { saveWorker } from '../../workers/SaveWorker';
import { useVirtualScroll } from '../../services/virtualScroll';
import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { SlashMenu } from './SlashMenu';
import { AIInlineMenu } from './AIInlineMenu';
import { PropertiesEditor } from './PropertiesEditor';
import { SlashCommand } from '../../extensions/SlashCommand';
import { ColumnLayout, Column } from '../../extensions/ColumnLayout';
import './Editor.css';
import '../../styles/extensions.css';
import '../../styles/callout.css';

// ---- File-type helpers for drag-and-drop ----

const TEXT_EXTENSIONS = new Set([
  '.txt', '.json', '.csv', '.xml', '.yml', '.yaml', '.toml', '.ini', '.cfg',
  '.conf', '.log', '.html', '.css', '.js', '.ts', '.tsx', '.jsx', '.py', '.rb',
  '.go', '.rs', '.java', '.c', '.cpp', '.h', '.sh', '.bash', '.zsh', '.fish',
  '.sql', '.r', '.m', '.swift', '.kt', '.scala', '.lua', '.php', '.vue',
  '.svelte', '.astro', '.graphql', '.gql', '.prisma', '.env', '.gitignore',
  '.dockerfile', '.cmake',
]);

const LANG_MAP: Record<string, string> = {
  'js': 'javascript', 'ts': 'typescript', 'jsx': 'javascript',
  'tsx': 'typescript', 'py': 'python', 'rb': 'ruby', 'go': 'go',
  'rs': 'rust', 'java': 'java', 'c': 'c', 'cpp': 'cpp', 'h': 'c',
  'sh': 'bash', 'bash': 'bash', 'zsh': 'bash', 'fish': 'fish',
  'json': 'json', 'xml': 'xml', 'html': 'html', 'css': 'css',
  'yml': 'yaml', 'yaml': 'yaml', 'toml': 'toml', 'sql': 'sql',
  'swift': 'swift', 'kt': 'kotlin', 'scala': 'scala', 'lua': 'lua',
  'php': 'php', 'r': 'r', 'vue': 'vue', 'svelte': 'svelte',
  'md': 'markdown', 'markdown': 'markdown', 'graphql': 'graphql',
  'gql': 'graphql', 'prisma': 'prisma', 'dockerfile': 'dockerfile',
};

function isTextFile(file: File): boolean {
  const ext = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
  return TEXT_EXTENSIONS.has(ext) || file.type.startsWith('text/');
}

function getLanguageFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return LANG_MAP[ext] || 'plaintext';
}

function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

function isMarkdownFile(file: File): boolean {
  return file.name.endsWith('.md') || file.name.endsWith('.markdown');
}

/** Generate a URL-friendly slug from heading text, matching the
 *  convention used in ExportService.addHeadingIds so anchor links
 *  like `[text](#heading-name)` resolve consistently. */
function headingSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\w一-鿿-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function MainEditor() {
  const { setContent, setEditorInstance } = useEditorState();
  const { currentPath, setSavedContent } = useFileStore();
  const { sourceMode } = useUIState();
  const { saveBackup, markDirty, markSaved } = useAutoSaveStore();
  const { isConnected, bindEditor, unbindEditor, collaborators } = useCollaborationStore();
  const [sourceContent, setSourceContent] = useState<string>('');

  // Refs keep latest values accessible inside stable callbacks (e.g. SaveWorker hooks)
  const currentPathRef = useRef(currentPath);
  currentPathRef.current = currentPath;
  const sourceContentRef = useRef(sourceContent);
  sourceContentRef.current = sourceContent;
  const sourceModeRef = useRef(sourceMode);
  sourceModeRef.current = sourceMode;

  // Drag-and-drop state
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      Markdown.configure({
        html: false,
        breaks: true,
        linkify: true,
        transformPastedText: true,
        transformCopiedText: true,
      }),
      Underline,
      Link.configure({
        openOnClick: true,
      }),
      Code,
      ResizableImageExtension.configure({
        inline: false,
        allowBase64: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
      Placeholder.configure({
        placeholder: 'Start writing...',
      }),
      Typography,
      Highlight.configure({
        multicolor: true,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      MathExtension,
      InlineMathExtension,
      MermaidExtension,
      CodeBlockHighlight,
      FootnoteExtension,
      AutocompleteExtension,
      SlashCommand,
      ColumnLayout,
      Column,
    ],
    content: '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setContent(html);
      markDirty();

      saveWorker.triggerSave(async () => {
        const markdown = (editor.storage as any)?.markdown?.getMarkdown?.() || '';
        const path = currentPathRef.current;
        if (path) {
          await FileService.saveFile(path, markdown);
          setSavedContent(markdown);
          markSaved();
        }
      });
    },
    onCreate: ({ editor }) => {
      setEditorInstance(editor);
    },
    editorProps: {
      attributes: {
        class: 'editor-content',
        spellcheck: 'true',
        'aria-label': 'Editor content',
        role: 'textbox',
        'aria-multiline': 'true',
      },
      handlePaste: (_view, event, _slice) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        let hasImage = false;
        let hasFile = false;

        for (const item of items) {
          // Proper MIME type check: image/* types
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) {
              handleImagePaste(file);
              hasImage = true;
            }
          } else if (item.kind === 'file') {
            // Non-image file was pasted (e.g. PDF, ZIP)
            hasFile = true;
          }
        }

        if (hasImage) {
          return true; // Prevent default — we handled the image paste
        }

        if (hasFile) {
          // Notify the user that file drag-and-drop is supported instead
          // TODO: surface via a toast/notification system
          console.warn('File paste is not supported. Please use drag-and-drop to insert files.');
          return true; // Prevent default — avoid inserting garbage data
        }

        // For HTML, rich text (Word/Google Docs), and plain text:
        // let Tiptap process the paste normally. The tiptap-markdown extension
        // (configured with transformPastedText: true) will convert HTML to
        // Markdown, and the Link extension (linkify: true) will auto-link URLs.
        return false;
      },
      handleDrop: (_view, event, _slice, _moved) => {
        // Prevent Tiptap from processing file drops — the wrapper-level
        // onDrop handler processes all files inserted via drag-and-drop.
        if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
          return true;
        }
        return false;
      },
    },
  });

  // ---- Virtual scrolling ----
  // Tracks scroll position and determines visible chunk range.  When the
  // document exceeds 50 top‑level nodes, CSS content-visibility: auto is
  // toggled on editor children so the browser skips off‑screen rendering.
  const virtualScrollConfigRef = useRef({
    chunkSize: 25,
    overscan: 1,
    enabled: true,
    threshold: 50,
  });
  const { isEnabled, scrollContainerRef } = useVirtualScroll(
    editor,
    virtualScrollConfigRef.current,
  );

  const handleImagePaste = (file: File) => {
    if (!editor) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Data = e.target?.result;
      if (typeof base64Data !== 'string') return;

      // Try uploading to an active external hosting provider first
      try {
        const { uploadImage } = useImageStorageStore.getState();
        const uploadedUrl = await uploadImage(file);
        if (uploadedUrl) {
          editor.chain().focus().setImage({ src: uploadedUrl }).run();
          return;
        }
      } catch {
        // Upload failed, fall through to local save
        console.warn('Image upload to hosting provider failed, falling back to local save.');
      }

      const filename = `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.png`;

      try {
        const savedPath = await invoke<string>('save_image', {
          imageData: base64Data,
          filename,
        });
        editor.chain().focus().setImage({ src: savedPath }).run();
      } catch {
        // Fallback: use base64 data URL directly (e.g. when running outside Tauri)
        editor.chain().focus().setImage({ src: base64Data }).run();
      }
    };
    reader.readAsDataURL(file);
  };

  // Process dropped files based on their type.
  // - Images: delegated to handleImagePaste (saves to local directory via Tauri).
  // - Markdown: content is inserted at the cursor position.
  // - Text files: content is inserted as a syntax-highlighted code block.
  // - Other files: inserted as a file link reference.
  const processDroppedFiles = (files: File[]) => {
    if (!editor) return;

    for (const file of files) {
      if (isImageFile(file)) {
        handleImagePaste(file);
      } else if (isMarkdownFile(file)) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          if (content) {
            editor.chain().focus().insertContent(content).run();
          }
        };
        reader.readAsText(file);
      } else if (isTextFile(file)) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          if (content) {
            const lang = getLanguageFromFilename(file.name);
            editor.chain().focus().insertContent({
              type: 'codeBlock',
              attrs: { language: lang },
              content: [{ type: 'text', text: content }],
            }).run();
          }
        };
        reader.readAsText(file);
      } else {
        // Insert a file link for unsupported binary files
        editor.chain().focus().insertContent(
          `[${file.name}](file://${file.name})`
        ).run();
      }
    }
  };

  // ---- Drag-and-drop event handlers on the wrapper div ----
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only show the drop zone when the user drags files from the OS
    if (e.dataTransfer.types.includes('Files')) {
      dragCounterRef.current++;
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  };

  const handleWrapperDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processDroppedFiles(Array.from(files));
    }
  };

  if (!editor) {
    return <div className="editor-loading" aria-busy="true" role="status">Loading editor...</div>;
  }

  useEffect(() => {
    if (!editor) return;
    
    if (sourceMode) {
      const markdown = (editor.storage as any)?.markdown?.getMarkdown?.() || '';
      setSourceContent(markdown);
    } else if (sourceContent) {
      editor.commands.setContent(sourceContent);
    }
  }, [sourceMode, editor]);

  // Register a single after-save hook on the SaveWorker.
  // After every save attempt (success or failure) the latest content
  // is always persisted to localStorage as a backup.
  useEffect(() => {
    saveWorker.setOnAfterSave(async (_error) => {
      const markdown = sourceModeRef.current
        ? sourceContentRef.current
        : ((editor.storage as any)?.markdown?.getMarkdown?.() || '');
      if (markdown) {
        saveBackup(markdown, currentPathRef.current);
      }
    });

    return () => {
      saveWorker.setOnAfterSave(null);
    };
  }, [editor, saveBackup]);

  // ---- Collaboration binding ----
  // When the collaboration store connects, bind the Yjs document to the
  // Tiptap editor so content changes and cursor positions are synced.
  useEffect(() => {
    if (!editor) return;

    if (isConnected) {
      bindEditor(editor);
    }

    return () => {
      unbindEditor();
    };
  }, [isConnected, editor, bindEditor, unbindEditor]);

  // ---- Anchor link navigation ----
  // Intercept clicks on anchor elements.  Internal links (`#heading`)
  // scroll to the matching heading inside the document.  External URLs
  // are opened in the system browser via Tauri's shell plugin.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    const editorDom = editor.view.dom;

    const handleLinkClick = (e: MouseEvent) => {
      const anchor = (e.target as Element).closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href) return;

      // Internal anchor link: find the matching heading and scroll to it
      if (href.startsWith('#')) {
        e.preventDefault();
        e.stopPropagation();

        const anchorId = href.slice(1);
        if (!anchorId) return;

        let found = false;
        editor.state.doc.descendants((node, pos) => {
          if (found) return false;
          if (node.type.name === 'heading') {
            const slug = headingSlug(node.textContent);
            if (slug === anchorId) {
              found = true;
              editor
                .chain()
                .focus()
                .setTextSelection(pos)
                .scrollIntoView()
                .run();
              return false;
            }
          }
          return true;
        });
        return;
      }

      // External URL — open in the system browser
      if (href.startsWith('http://') || href.startsWith('https://')) {
        e.preventDefault();
        e.stopPropagation();
        shellOpen(href).catch((err: unknown) => {
          console.warn('Failed to open link in browser:', err);
        });
      }
      // For other protocols (mailto:, file:, etc.) let the browser handle them
    };

    editorDom.addEventListener('click', handleLinkClick);
    return () => {
      editorDom.removeEventListener('click', handleLinkClick);
    };
  }, [editor]);

  // ---- Remote cursor overlay ----
  // Compute pixel positions for remote collaborator cursors and render
  // colored caret indicators overlaid on the editor.
  const [cursorEls, setCursorEls] = useState<Array<{
    id: string; name: string; color: string; top: number; left: number;
  }>>([]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    const remotes = collaborators.filter((c) => {
      // Exclude ourselves: our own cursor is in the panel, not the overlay
      const ownId = useCollaborationStore.getState().provider?.awareness?.clientID?.toString();
      return c.cursor && c.id !== ownId;
    });

    const els = remotes.map((c) => {
      const pos = c.cursor!.from;
      try {
        const coords = editor.view.coordsAtPos(pos);
        const editorRect = editor.view.dom.getBoundingClientRect();
        return {
          id: c.id,
          name: c.name,
          color: c.color,
          top: coords.top - editorRect.top,
          left: coords.left - editorRect.left,
        };
      } catch {
        // Position may be out of range – skip this cursor
        return null;
      }
    }).filter(Boolean) as Array<{
      id: string; name: string; color: string; top: number; left: number;
    }>;

    setCursorEls(els);
  }, [collaborators, editor]);

  const handleSourceChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setSourceContent(newContent);
    sourceContentRef.current = newContent;
    setContent(newContent);
    markDirty();

    saveWorker.triggerSave(async () => {
        if (currentPath) {
          await FileService.saveFile(currentPath, newContent);
          setSavedContent(newContent);
          markSaved();
        }
      });
  };

  if (sourceMode) {
    return (
      <div className="editor-wrapper source-mode-wrapper">
        <textarea
          className="source-editor"
          value={sourceContent}
          onChange={handleSourceChange}
          placeholder="Write in Markdown..."
          spellCheck="true"
          aria-label="Markdown source editor"
          role="textbox"
          aria-multiline="true"
        />
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      className={`editor-wrapper${isDragging ? ' drag-over' : ''}`}
      data-virtual-scroll={isEnabled ? 'true' : 'false'}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleWrapperDrop}
      aria-label="Editor workspace"
    >
      {isDragging && (
        <div className="drop-zone-overlay" role="status" aria-live="assertive">
          <div className="drop-zone-overlay-content">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>Drop images or files here</span>
          </div>
        </div>
      )}
      <PropertiesEditor editor={editor} filePath={currentPath} />
      <EditorContent editor={editor} />
      <SlashMenu editor={editor} />
      <AIInlineMenu editor={editor} />
      <TableOperations />
      {/* Remote collaborator cursor indicators */}
      {cursorEls.map((c) => (
        <div
          key={c.id}
          className="remote-cursor"
          style={{
            position: 'absolute',
            top: c.top,
            left: c.left,
            borderLeft: `2px solid ${c.color}`,
            height: '1.2em',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          <span
            className="remote-cursor-label"
            style={{
              position: 'absolute',
              top: '-1.2em',
              left: 0,
              backgroundColor: c.color,
              color: '#fff',
              fontSize: '10px',
              padding: '1px 4px',
              borderRadius: '2px',
              whiteSpace: 'nowrap',
            }}
          >
            {c.name}
          </span>
        </div>
      ))}
    </div>
  );
}