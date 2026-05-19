import { useState, useEffect, useCallback } from 'react';
import { Editor } from '@tiptap/react';
import DOMPurify from 'dompurify';
import { EditorProvider } from '../Editor/EditorProvider';
import { MainEditor } from '../Editor/MainEditor';
import { useEditorState } from '../../store/editorStore';
import './SplitView.css';

type RightPaneMode = 'preview' | 'source';

export function SplitView() {
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [rightMode, setRightMode] = useState<RightPaneMode>('preview');
  const [previewHtml, setPreviewHtml] = useState('');
  const [sourceMarkdown, setSourceMarkdown] = useState('');

  const editorInstance: Editor | null = useEditorState(
    useCallback((state) => state.editorInstance, []),
  );

  // Listen to editor updates to sync the right pane content
  useEffect(() => {
    if (!splitEnabled || !editorInstance) return;

    const handleUpdate = ({ editor }: { editor: Editor }) => {
      const html = editor.getHTML();
      setPreviewHtml(html);

      try {
        const md = (editor.storage as unknown as Record<string, unknown>)?.markdown as
          | { getMarkdown?: () => string }
          | undefined;
        setSourceMarkdown(md?.getMarkdown?.() ?? '');
      } catch {
        setSourceMarkdown('');
      }
    };

    // Capture current content immediately on mount
    handleUpdate({ editor: editorInstance });

    editorInstance.on('update', handleUpdate);

    return () => {
      editorInstance.off('update', handleUpdate);
    };
  }, [splitEnabled, editorInstance]);

  const sanitizedHtml = DOMPurify.sanitize(previewHtml, {
    ADD_ATTR: ['target', 'rel'],
    ADD_TAGS: ['iframe', 'video', 'audio'],
  });

  const toggleRightMode = () => {
    setRightMode((prev) => (prev === 'preview' ? 'source' : 'preview'));
  };

  return (
    <div className="split-view-container">
      <div className="split-toolbar">
        <button onClick={() => setSplitEnabled(!splitEnabled)} className="split-toggle">
          {splitEnabled ? '关闭分屏' : '开启分屏'}
        </button>

        {splitEnabled && (
          <button onClick={toggleRightMode} className="split-mode-toggle">
            {rightMode === 'preview' ? '查看源码' : '查看预览'}
          </button>
        )}
      </div>

      <div className={splitEnabled ? 'split-active' : 'split-single'}>
        <div className="editor-pane">
          <EditorProvider>
            <MainEditor />
          </EditorProvider>
        </div>

        {splitEnabled && (
          <div className="editor-pane editor-pane-right">
            {rightMode === 'preview' ? (
              <div
                className="split-preview-content"
                dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
              />
            ) : (
              <pre className="split-source-content">{sourceMarkdown}</pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
