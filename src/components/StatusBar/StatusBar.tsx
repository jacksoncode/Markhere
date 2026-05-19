import { useEffect, useReducer } from 'react';
import type { Editor } from '@tiptap/react';
import { useEditorState } from '../../store/editorStore';
import { useFileStore } from '../../store/fileStore';
import { useTranslation } from '../../i18n';
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

/** Detect line ending from document text. */
function detectLineEnding(text: string): 'CRLF' | 'LF' {
  return text.includes('\r\n') ? 'CRLF' : 'LF';
}

const WORDS_PER_MINUTE_READ = 200;
const WORDS_PER_MINUTE_SPEAK = 130;

export function StatusBar() {
  const { t } = useTranslation();
  const editorInstance = useEditorState(s => s.editorInstance);
  const currentPath = useFileStore(s => s.currentPath);
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
  const lineEnding = detectLineEnding(text);
  const readingTime = Math.ceil(words / WORDS_PER_MINUTE_READ);
  const speakingTime = Math.ceil(words / WORDS_PER_MINUTE_SPEAK);
  const fileName = currentPath
    ? currentPath.split('/').pop()!
    : t('statusBar.untitled');

  return (
    <div className="status-bar" role="status" aria-live="polite" aria-atomic="true">
      {/* Left: document statistics */}
      <div className="status-bar-left">
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
        <span className="status-bar-separator" aria-hidden="true" />
        <span className="status-bar-item" title={t('statusBar.speakingTimeTitle', undefined, { speed: WORDS_PER_MINUTE_SPEAK })} aria-label={t('statusBar.speakingTime', undefined, { count: speakingTime })}>
          {t('statusBar.speakingTime', undefined, { count: speakingTime })}
        </span>
      </div>

      {/* Center: cursor position */}
      <div className="status-bar-center">
        <span className="status-bar-item" title={t('statusBar.cursorTitle')} aria-label={t('statusBar.cursorPosition', undefined, { line, col })}>
          {t('statusBar.cursorPosition', undefined, { line, col })}
        </span>
      </div>

      {/* Right: file info */}
      <div className="status-bar-right">
        <span className="status-bar-item" title={t('statusBar.fileNameTitle')} aria-label={t('statusBar.fileNameTitle')}>
          {fileName}
        </span>
        <span className="status-bar-separator" aria-hidden="true" />
        <span className="status-bar-item" title={t('statusBar.encodingTitle')} aria-label={t('statusBar.encoding')}>
          {t('statusBar.encoding')}
        </span>
        <span className="status-bar-separator" aria-hidden="true" />
        <span className="status-bar-item" title={t('statusBar.lineEndingTitle')} aria-label={t('statusBar.lineEndingTitle')}>
          {lineEnding}
        </span>
      </div>
    </div>
  );
}
