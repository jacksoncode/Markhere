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
import { MathExtension, MermaidExtension, CodeBlockHighlight, FootnoteExtension } from '../../extensions';
import { ResizableImageExtension } from '../../extensions/ResizableImage';
import { useEditorState } from '../../store/editorStore';
import { useFileStore } from '../../store/fileStore';
import { useUIState } from '../../store/uiStore';
import { useAutoSaveStore } from '../../store/autoSaveStore';
import { FileService } from '../../services/FileService';
import { saveWorker } from '../../workers/SaveWorker';
import { useState, useEffect, useRef } from 'react';
import './Editor.css';
import '../../styles/extensions.css';

const AUTO_SAVE_INTERVAL = 30000;

export function MainEditor() {
  const { setContent, setEditorInstance } = useEditorState();
  const { currentPath, setSavedContent } = useFileStore();
  const { sourceMode } = useUIState();
  const { saveBackup, markDirty, markSaved } = useAutoSaveStore();
  const [sourceContent, setSourceContent] = useState<string>('');
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
        openOnClick: false,
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
      MermaidExtension,
      CodeBlockHighlight,
      FootnoteExtension,
    ],
    content: '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setContent(html);
      markDirty();

      if (currentPath) {
        saveWorker.triggerSave(async () => {
          const markdown = (editor.storage as any)?.markdown?.getMarkdown?.() || '';
          await FileService.saveFile(currentPath, markdown);
          setSavedContent(markdown);
          saveBackup(markdown, currentPath);
          markSaved();
        });
      }
    },
    onCreate: ({ editor }) => {
      setEditorInstance(editor);
    },
    editorProps: {
      attributes: {
        class: 'editor-content',
        spellcheck: 'true',
      },
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (const item of items) {
          if (item.type.indexOf('image') !== -1) {
            const file = item.getAsFile();
            if (file) {
              handleImagePaste(file);
              return true;
            }
          }
        }
        return false;
      },
    },
  });

  const handleImagePaste = async (file: File) => {
    if (!editor) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        editor.chain().focus().setImage({ src: result }).run();
      }
    };
    reader.readAsDataURL(file);
  };

  if (!editor) {
    return <div className="editor-loading">Loading editor...</div>;
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

  useEffect(() => {
    if (!editor) return;
    
    autoSaveTimerRef.current = setInterval(() => {
      const markdown = (editor.storage as any)?.markdown?.getMarkdown?.() || '';
      if (markdown) {
        saveBackup(markdown, currentPath);
      }
    }, AUTO_SAVE_INTERVAL);
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [editor, currentPath, saveBackup]);

  const handleSourceChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setSourceContent(newContent);
    setContent(newContent);
    markDirty();
    
    if (currentPath) {
      saveWorker.triggerSave(async () => {
        await FileService.saveFile(currentPath, newContent);
        setSavedContent(newContent);
        saveBackup(newContent, currentPath);
        markSaved();
      });
    }
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
        />
      </div>
    );
  }

  return (
    <div className="editor-wrapper">
      <EditorContent editor={editor} />
    </div>
  );
}