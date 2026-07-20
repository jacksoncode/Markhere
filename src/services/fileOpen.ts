/**
 * Single source of truth for "open a file and load it into the editor".
 *
 * Previously the open-file sequence (setContent -> setCurrentPath ->
 * setSavedContent -> markSaved -> openTab) was copy-pasted across four entry
 * points (MenuBar, Sidebar, Search, QuickOpen). They drifted apart over time,
 * which caused two real bugs:
 *   1. QuickOpen/Cmd+P opened a file but never called `setContent`, so the
 *      editor kept showing the previous file's content.
 *   2. None of the entries called `markSaved()`, so the persisted "unsaved"
 *      flag from the previous file leaked into the new one (wrong dirty marker
 *      and spurious UnsavedChanges dialogs on close).
 *
 * Everything now funnels through `loadFileIntoEditor`, which performs the whole
 * sequence consistently.
 */

import { useEditorState } from '../store/editorStore';
import { useFileStore } from '../store/fileStore';
import { useAutoSaveStore } from '../store/autoSaveStore';
import { useTabsStore } from '../store/tabsStore';
import { basenameOf } from '../utils/pathUtils';

export function loadFileIntoEditor(path: string, content: string): void {
  const fileStore = useFileStore.getState();
  const autoSave = useAutoSaveStore.getState();
  const tabs = useTabsStore.getState();
  const editor = useEditorState.getState().editorInstance;

  // Load content into the editor. setContent may throw a NodeView warning when
  // the document contains nodes (images/mermaid/wiki-links) whose React
  // renderers aren't mounted yet. The content still loads — swallow it.
  if (editor) {
    try {
      editor.commands.setContent(content);
    } catch (nodeViewErr) {
      console.warn('setContent NodeView warning (non-fatal):', nodeViewErr);
    }
  }

  fileStore.setCurrentPath(path);
  fileStore.setSavedContent(content);
  autoSave.markSaved();
  tabs.openTab(path, basenameOf(path), content);
}
