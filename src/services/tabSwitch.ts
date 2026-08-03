/**
 * Single source of truth for "switch the active tab AND swap the editor
 * content accordingly".
 *
 * `tabsStore.switchTab` only flips `activeTabId`; it does NOT touch the editor.
 * Nothing else listened to `activeTabId` to reload the document, so clicking a
 * different tab in the TabBar just moved the highlight while the editor kept
 * showing the previous file's content. This funnels the whole swap through one
 * place so it stays consistent everywhere:
 *
 *   1. Flush the OUTGOING tab: cache the current editor content back into the
 *      tab (so an A -> B -> A round trip preserves unsaved in-memory edits) and
 *      persist those edits to disk using the CAPTURED path+content.
 *   2. Flip the active tab.
 *   3. Load the INCOMING tab's content into the editor and sync file/dirty
 *      state.
 *
 * The debounced auto-save (SaveWorker, 500ms) is cancelled during step 1.
 * Otherwise it could fire *after* step 3 has swapped `currentPath`, reading the
 * incoming document's content and writing it to the outgoing file's path — a
 * silent data-loss bug. We re-issue a correct save with captured values.
 */

import { useEditorState } from '../store/editorStore';
import { useFileStore } from '../store/fileStore';
import { useAutoSaveStore } from '../store/autoSaveStore';
import { useTabsStore } from '../store/tabsStore';
import { FileService } from './FileService';
import { saveWorker } from '../workers/SaveWorker';

function getEditorMarkdown(editor: unknown): string {
  return (editor as any)?.storage?.markdown?.getMarkdown?.() ?? '';
}

export async function switchToTab(id: string): Promise<void> {
  const tabs = useTabsStore.getState();
  const activeTabId = tabs.activeTabId;

  // Nothing to do when re-selecting the already-active tab.
  if (id === activeTabId) return;

  const editor = useEditorState.getState().editorInstance;
  const fileStore = useFileStore.getState();
  const autoSave = useAutoSaveStore.getState();

  // --- 1. Capture & flush the OUTGOING tab --------------------------------
  if (editor && activeTabId) {
    const outgoingMarkdown = getEditorMarkdown(editor);
    const outgoingPath = fileStore.currentPath;
    const wasDirty = autoSave.hasUnsavedChanges;

    // Cancel the pending debounced save so it can't fire after we swap
    // currentPath below (which would write the incoming content to the
    // outgoing file). We persist explicitly with captured values instead.
    saveWorker.cancel();

    // Keep the in-memory copy so switching back restores unsaved edits.
    tabs.updateTabContent(activeTabId, outgoingMarkdown, wasDirty);

    // Persist unsaved edits to disk using the CAPTURED path+content, immune to
    // the currentPath swap that follows. New/untitled docs (no path) keep the
    // dirty flag and their in-memory copy.
    if (outgoingPath && wasDirty) {
      void FileService.saveFile(outgoingPath, outgoingMarkdown)
        .then(() => {
          useTabsStore.getState().markTabSaved(activeTabId);
        })
        .catch((err) => {
          console.warn('switchToTab: failed to persist outgoing file', err);
        });
    }
  }

  // --- 2. Flip the active tab ---------------------------------------------
  tabs.switchTab(id);

  // --- 3. Load the INCOMING tab -------------------------------------------
  const target = useTabsStore.getState().getTabById(id);
  if (!target) return;

  // Restored tabs persist only id/path/name/lastAccessed (not content), so their
  // in-memory `content` is empty after a restart. Re-read the file from disk so
  // clicking the tab actually shows its content instead of a blank editor.
  const content =
    target.content && target.content.length > 0
      ? target.content
      : target.path
        ? await FileService.readFile(target.path).catch((err) => {
            console.warn('switchToTab: failed to read restored file', target.path, err);
            return '';
          })
        : '';

  if (editor) {
    try {
      editor.commands.setContent(content);
    } catch (err) {
      // setContent may emit a NodeView warning for nodes whose React renderers
      // aren't mounted yet. The content still loads — swallow it.
      console.warn('switchToTab setContent warning (non-fatal):', err);
    }
  }

  fileStore.setCurrentPath(target.path);
  fileStore.setSavedContent(content);

  if (target.isDirty) {
    autoSave.markDirty();
  } else {
    autoSave.markSaved();
  }
}
