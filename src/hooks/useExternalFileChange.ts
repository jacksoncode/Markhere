import { useEffect, useRef, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { FileWatcherService } from '../services/FileWatcherService';
import { useFileStore } from '../store/fileStore';
import { useEditorState } from '../store/editorStore';
import { useAutoSaveStore } from '../store/autoSaveStore';

export interface ExternalChangeState {
  /** True when the open file changed on disk and the user must decide. */
  prompting: boolean;
  /** The on-disk content awaiting a reload decision. */
  reload: () => void;
  /** Keep the in-editor version, dismiss the prompt. */
  dismiss: () => void;
}

/**
 * Detects external modifications to the currently-open file and surfaces a
 * reload / keep decision. If there are no unsaved changes, the file is
 * reloaded automatically (matching VS Code / Typora behaviour). Only when the
 * buffer is dirty do we prompt, to avoid silently discarding the user's edits.
 */
export function useExternalFileChange(): ExternalChangeState {
  const [prompting, setPrompting] = useState(false);
  const pendingContentRef = useRef<string | null>(null);

  const { currentPath, setSavedContent } = useFileStore();
  const { editorInstance } = useEditorState();

  // Keep latest values reachable inside the stable event handler.
  const currentPathRef = useRef(currentPath);
  currentPathRef.current = currentPath;
  const editorRef = useRef(editorInstance);
  editorRef.current = editorInstance;

  const applyContent = useCallback(
    (content: string) => {
      const editor = editorRef.current;
      if (!editor) return;
      try {
        editor.commands.setContent(content);
      } catch (err) {
        console.warn('Reload setContent NodeView (non-fatal):', err);
      }
      setSavedContent(content);
      useAutoSaveStore.getState().markSaved();
    },
    [setSavedContent],
  );

  useEffect(() => {
    FileWatcherService.onExternalChange(async (path) => {
      if (path !== currentPathRef.current) return;
      let diskContent: string;
      try {
        diskContent = await invoke<string>('read_file', { path });
      } catch {
        return; // file may have been removed mid-read
      }

      const hasUnsaved = useAutoSaveStore.getState().hasUnsavedChanges;
      if (!hasUnsaved) {
        // Safe to reload silently.
        applyContent(diskContent);
        return;
      }
      // Buffer is dirty: defer to the user.
      pendingContentRef.current = diskContent;
      setPrompting(true);
    });
  }, [applyContent]);

  // Watch whichever file is currently open, regardless of which code path
  // opened it (FileService, TitleBar menu, recent files, tabs...).
  useEffect(() => {
    if (currentPath) {
      void FileWatcherService.watch(currentPath);
    } else {
      void FileWatcherService.unwatch();
    }
  }, [currentPath]);

  const reload = useCallback(() => {
    if (pendingContentRef.current !== null) {
      applyContent(pendingContentRef.current);
      pendingContentRef.current = null;
    }
    setPrompting(false);
  }, [applyContent]);

  const dismiss = useCallback(() => {
    pendingContentRef.current = null;
    setPrompting(false);
  }, []);

  return { prompting, reload, dismiss };
}
