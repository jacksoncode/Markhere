import { useState, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import { invoke } from '@tauri-apps/api/core';
import { useImageStorageStore } from '../../store/imageStorageStore';
import {
  isImageFile,
  isMarkdownFile,
  isTextFile,
  getLanguageFromFilename,
} from './editorFileHelpers';

export interface EditorDragDrop {
  isDragging: boolean;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleWrapperDrop: (e: React.DragEvent) => void;
  /** Paste handler for an image File (used by editorProps.handlePaste). */
  handleImagePaste: (file: File) => void;
}

/**
 * Encapsulates the editor's file drag-and-drop and image-paste behaviour:
 *  - Images are saved locally (or uploaded to a configured host) and inserted.
 *  - Markdown files are inserted as content.
 *  - Text files become syntax-highlighted code blocks.
 *  - Other files become file-link references.
 */
export function useEditorDragDrop(editor: Editor | null): EditorDragDrop {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

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
        // Fallback: use base64 data URL directly (e.g. outside Tauri)
        editor.chain().focus().setImage({ src: base64Data }).run();
      }
    };
    reader.readAsDataURL(file);
  };

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
        editor.chain().focus().insertContent(
          `[${file.name}](file://${file.name})`,
        ).run();
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
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

  return { isDragging, handleDragOver, handleDragLeave, handleWrapperDrop, handleImagePaste };
}
