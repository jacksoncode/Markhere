import { useEffect, useReducer } from 'react';
import type { Editor } from '@tiptap/react';
import { useEditorState } from '../../store/editorStore';
import { useFileStore } from '../../store/fileStore';
import { useUIState } from '../../store/uiStore';
import { useAutoSaveStore } from '../../store/autoSaveStore';
import { useTranslation } from '../../i18n';
import { SelectionWordCount } from '../Editor/SelectionWordCount';
import { Icon } from '../Icon/Icon';
import './StatusBar.css';

/** Calculate line and column from cursor's ProseMirror position. */
function getCursorPosition(editor: Editor): { line: number; col: number } {
  const { from } = editor.state.selection;
  const text = editor.state.doc.textBetween(0, from);
  const lines = text.split('\n');
  return {
    line: lines.length,
    col: lines[lines.length - 1].length + 1,
  };
}

/**
 * Count words with CJK awareness.
 * CJK characters (Chinese, Japanese, Korean) don't use word separators,
 * so each character counts as one "word".
 * Latin words are split by whitespace.
 */
function countWords(text: string): number {
  const cjkRegex = /[一-鿿㐀-䶿豈-﫿぀-ゟ゠-ヿ가-힯]/g;
  const cjkChars = (text.match(cjkRegex) || []).length;
  const latinText = text.replace(cjkRegex, ' ');
  const latinWords = latinText.split(/\s+/).filter(w => w.length > 0).length;
  return cjkChars + latinWords;
}

const WORDS_PER_MINUTE_READ = 200;

export function StatusBar() {
  const { t } = useTranslation();
  const editorInstance = useEditorState(s => s.editorInstance);
  const currentPath = useFileStore(s => s.currentPath);
  const { hasUnsavedChanges, lastSaved } = useAutoSaveStore();
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);

  // Re-render on every editor state change (content and selection)
  useEffect(() => {
    if (!editorInstance) return;
    editorInstance.on('update', forceUpdate);
    return () => {
      editorInstance.off('update', forceUpdate);
    };
  }, [editorInstance]);

  if (!editorInstance) return null;

  const text = editorInstance.getText();
  const words = countWords(text);
  const characters = text.length;
  const { line, col } = getCursorPosition(editorInstance);
  const readingTime = Math.ceil(words / WORDS_PER_MINUTE_READ);
  const fileName = currentPath
    ? currentPath.split('/').pop()!
    : t('statusBar.untitled');

  return (
    <div className="status-bar" role="status" aria-live="polite" aria-atomic="true">
      {/* Left: document statistics */}
      <div className="status-bar-left">
        <SelectionWordCount editor={editorInstance} />
        <span className="status-bar-item" title={t('statusBar.wordCountTitle')} aria-label={t('statusBar.words', undefined, { count: words })}>
          {t('statusBar.words', undefined, { count: words })}
        </span>
        <span className="status-bar-separator" aria-hidden="true" />
        <span className="status-bar-item" title={t('statusBar.charCountTitle')} aria-label={t('statusBar.chars', undefined, { count: characters })}>
          {t('statusBar.chars', undefined, { count: characters })}
        </span>
        <span className="status-bar-separator" aria-hidden="true" />
        <span className="status-bar-item" title={t('statusBar.readingTimeTitle', undefined, { speed: WORDS_PER_MINUTE_READ })} aria-label={t('statusBar.readingTime', undefined, { count: readingTime })}>
          {t('statusBar.readingTime', undefined, { count: readingTime })}
        </span>
      </div>

      {/* Center: cursor position */}
      <div className="status-bar-center">
        <span className="status-bar-item" title={t('statusBar.cursorTitle')} aria-label={t('statusBar.cursorPosition', undefined, { line, col })}>
          {t('statusBar.cursorPosition', undefined, { line, col })}
        </span>
      </div>

      {/* Right: save status + mode switcher + file info */}
      <div className="status-bar-right">
        <SaveStatus dirty={hasUnsavedChanges} lastSaved={lastSaved} t={t} />
        <span className="status-bar-separator" aria-hidden="true" />
        {/* Mode switcher (Typora-style) */}
        <ModeSwitcher />
        <span className="status-bar-separator" aria-hidden="true" />
        <span className="status-bar-item status-bar-filename" title={t('statusBar.fileNameTitle')}>
          {fileName}
        </span>
      </div>
    </div>
  );
}

/** Lightweight save-state indicator so users get feedback on persistence. */
function SaveStatus({
  dirty,
  lastSaved,
  t,
}: {
  dirty: boolean;
  lastSaved: number | null;
  t: (key: string, fallback?: string, params?: Record<string, string | number>) => string;
}) {
  if (dirty) {
    return (
      <span
        className="status-bar-save status-bar-save--dirty"
        title={t('statusBar.saveDirtyTitle')}
        aria-label={t('statusBar.saveDirty')}
      >
        <span className="status-bar-save-dot" aria-hidden="true" />
        {t('statusBar.saveDirty')}
      </span>
    );
  }
  return (
    <span
      className="status-bar-save status-bar-save--saved"
      title={lastSaved ? t('statusBar.saveTimeTitle', undefined, { time: new Date(lastSaved).toLocaleTimeString() }) : t('statusBar.saveSavedTitle')}
      aria-label={t('statusBar.saveSaved')}
    >
      <Icon name="check" size={13} />
      {t('statusBar.saveSaved')}
    </span>
  );
}

/** Typora-style mode switcher: Focus / WYSIWYG / Source */
function ModeSwitcher() {
  const { focusMode, typewriterMode, sourceMode, toggleFocusMode, toggleTypewriterMode, toggleSourceMode } = useUIState();

  return (
    <div className="status-bar-mode-switcher" role="group" aria-label="Editor mode switcher">
      <button
        className={`status-bar-mode-btn${focusMode ? ' active' : ''}`}
        onClick={toggleFocusMode}
        title="Focus Mode (Cmd+Shift+F)"
        aria-pressed={focusMode}
      >
        <Icon name="eye" size={15} />
      </button>
      <button
        className={`status-bar-mode-btn${typewriterMode ? ' active' : ''}`}
        onClick={toggleTypewriterMode}
        title="Typewriter Mode (Cmd+Shift+T)"
        aria-pressed={typewriterMode}
      >
        <Icon name="keyboard" size={15} />
      </button>
      <button
        className={`status-bar-mode-btn${sourceMode ? ' active' : ''}`}
        onClick={toggleSourceMode}
        title="Source Mode (Cmd+/)"
        aria-pressed={sourceMode}
      >
        <Icon name="code" size={15} />
      </button>
    </div>
  );
}
