import { useState } from 'react';
import { EditorProvider } from '../Editor/EditorProvider';
import { MainEditor } from '../Editor/MainEditor';
import './SplitView.css';

export function SplitView() {
  const [splitEnabled, setSplitEnabled] = useState(false);

  return (
    <div className="split-view-container">
      <button onClick={() => setSplitEnabled(!splitEnabled)} className="split-toggle">
        {splitEnabled ? '关闭分屏' : '开启分屏'}
      </button>

      <div className={splitEnabled ? 'split-active' : 'split-single'}>
        <div className="editor-pane">
          <EditorProvider>
            <MainEditor />
          </EditorProvider>
        </div>

        {splitEnabled && (
          <div className="editor-pane">
            <EditorProvider>
              <MainEditor />
            </EditorProvider>
          </div>
        )}
      </div>
    </div>
  );
}