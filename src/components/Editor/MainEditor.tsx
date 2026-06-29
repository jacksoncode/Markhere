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
import { MathExtension, InlineMathExtension, MermaidExtension, FootnoteExtension, AutocompleteExtension, AutoPairExtension, ParagraphFocusExtension, paragraphFocusPluginKey, BlockDragHandleExtension, DataviewBlock, SearchHighlightExtension, InlineSourceExtension, ToggleBlock, VimKeymapExtension, EmacsKeymapExtension, POSHighlightExtension } from '../../extensions';
import { CodeBlockToolbar } from '../../extensions/CodeBlockToolbar';
import { MediaEmbed, MediaAutoEmbed } from '../../extensions/MediaEmbed';
import { ResizableImageExtension } from '../../extensions/ResizableImage';
import { TableOperations } from '../TableOperations/TableOperations';
import { useEditorState } from '../../store/editorStore';
import { useFileStore } from '../../store/fileStore';
import { useUIState } from '../../store/uiStore';
import { useAutoSaveStore } from '../../store/autoSaveStore';
import { useShortcutsStore } from '../../store/shortcutsStore';
import { FileService } from '../../services/FileService';
import { saveWorker } from '../../workers/SaveWorker';
import { useVirtualScroll } from '../../services/virtualScroll';
import { useState, useEffect, useRef } from 'react';
import { SlashMenu } from './SlashMenu';
import { AIInlineMenu } from './AIInlineMenu';
import { PropertiesEditor } from './PropertiesEditor';
import { SlashCommand } from '../../extensions/SlashCommand';
import { ColumnLayout, Column } from '../../extensions/ColumnLayout';
import { useEditorDragDrop } from './useEditorDragDrop';
import { useEditorLinks } from './useEditorLinks';
import { useEditorCollaboration } from './useEditorCollaboration';
import './Editor.css';
import '../../styles/extensions.css';
import '../../styles/callout.css';

export function MainEditor() {
  const { setContent, setEditorInstance } = useEditorState();
  const { currentPath, setSavedContent } = useFileStore();
  const { sourceMode } = useUIState();
  const focusMode = useUIState((s) => s.focusMode);
  const { saveBackup, markDirty, markSaved } = useAutoSaveStore();
  const editorMode = useShortcutsStore((s) => s.editorMode);
  const [sourceContent, setSourceContent] = useState<string>('');

  // Refs keep latest values accessible inside stable callbacks (e.g. SaveWorker hooks)
  const currentPathRef = useRef(currentPath);
  currentPathRef.current = currentPath;
  const sourceContentRef = useRef(sourceContent);
  sourceContentRef.current = sourceContent;
  const sourceModeRef = useRef(sourceMode);
  sourceModeRef.current = sourceMode;

  // Image-paste handler is produced by the drag-drop hook (which needs the
  // editor instance), but editorProps.handlePaste is defined before the editor
  // exists. Bridge them through a ref populated after the hook runs.
  const imagePasteRef = useRef<((file: File) => void) | null>(null);

  // Debounce timer for pushing the (expensive) serialized HTML to the editor
  // store. Downstream consumers (WordCount, WordGoal, LinkValidator) recompute
  // on every content change, so coalescing rapid keystrokes avoids needless
  // serialization + re-renders on large documents.
  const contentSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      CodeBlockToolbar,
      FootnoteExtension,
      AutocompleteExtension,
      AutoPairExtension,
      ParagraphFocusExtension,
      BlockDragHandleExtension,
      DataviewBlock,
      SearchHighlightExtension,
      InlineSourceExtension,
      ToggleBlock,
      SlashCommand,
      ColumnLayout,
      Column,
      MediaEmbed,
      MediaAutoEmbed,
      POSHighlightExtension.configure({ enabled: false }),
      ...(editorMode === 'vim' ? [VimKeymapExtension.configure({ initialMode: 'insert' })] : []),
      ...(editorMode === 'emacs' ? [EmacsKeymapExtension.configure({})] : []),
    ],
    content: '',
    onUpdate: ({ editor }) => {
      // markDirty is cheap and must be immediate so the UI reflects unsaved
      // state without delay.
      markDirty();

      // Serializing to HTML on every keystroke is the main main-thread cost on
      // large documents. Debounce it: only the latest edit within the window
      // is pushed to the store.
      if (contentSyncTimerRef.current) clearTimeout(contentSyncTimerRef.current);
      contentSyncTimerRef.current = setTimeout(() => {
        if (editor.isDestroyed) return;
        setContent(editor.getHTML());
      }, 250);

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
              imagePasteRef.current?.(file);
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

  // ---- Drag-and-drop + image paste ----
  const { isDragging, handleDragOver, handleDragLeave, handleWrapperDrop, handleImagePaste } =
    useEditorDragDrop(editor);
  // Bridge the image-paste handler back to editorProps.handlePaste (defined
  // before the editor — and thus this hook — exists).
  imagePasteRef.current = handleImagePaste;

  // ---- Anchor link navigation (internal headings + external URLs) ----
  useEditorLinks(editor);

  // ---- Collaboration binding + remote cursor positions ----
  const cursorEls = useEditorCollaboration(editor);

  // ---- Effects that must run before any early return (React hooks rule) ----

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
    if (!editor) return;
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

  // Flush any pending debounced content sync on unmount so the store reflects
  // the final edit, and clear the timer to avoid a setState after teardown.
  useEffect(() => {
    return () => {
      if (contentSyncTimerRef.current) {
        clearTimeout(contentSyncTimerRef.current);
        contentSyncTimerRef.current = null;
      }
    };
  }, []);

  // ---- Paragraph focus refresh ----
  // Toggling focus mode does not emit an editor transaction, so dispatch a
  // meta-tagged empty transaction to force the ParagraphFocus plugin to
  // (re)build or clear its decorations.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    try {
      const tr = editor.state.tr.setMeta(paragraphFocusPluginKey, true);
      editor.view.dispatch(tr);
    } catch {
      /* view not ready */
    }
  }, [focusMode, editor]);

  // Early return AFTER all hooks — render loading state while editor mounts
  if (!editor) {
    return <div className="editor-loading" aria-busy="true" role="status">Loading editor...</div>;
  }

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

  return (
    <div
      ref={scrollContainerRef}
      className={`editor-wrapper${isDragging ? ' drag-over' : ''}${sourceMode ? ' source-mode-active' : ''}`}
      data-virtual-scroll={isEnabled ? 'true' : 'false'}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleWrapperDrop}
      aria-label="Editor workspace"
    >
      {/* WYSIWYG editor — hidden in source mode via CSS (keeps editor mounted) */}
      <div className="editor-wysiwyg-container" aria-hidden={sourceMode} style={sourceMode ? { display: 'none' } : undefined}>
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
        <EditorContent editor={editor} />
        <PropertiesEditor editor={editor} filePath={currentPath} />
        <SlashMenu editor={editor} />
        <AIInlineMenu editor={editor} />
        <TableOperations />
      </div>

      {/* Source textarea — hidden in WYSIWYG mode */}
      <div className="editor-source-container" aria-hidden={!sourceMode} style={!sourceMode ? { display: 'none' } : undefined}>
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

      {/* Remote collaborator cursor indicators (only visible in WYSIWYG mode) */}
      {!sourceMode && cursorEls.map((c) => (
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