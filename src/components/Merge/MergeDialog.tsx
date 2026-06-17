import { useState } from 'react';
import { MergeService, MergeOptions } from '../../services/MergeService';
import './MergeDialog.css';

interface MergeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  documents: string[];
  onMerge: (mergedContent: string) => void;
}

export function MergeDialog({ isOpen, onClose, documents, onMerge }: MergeDialogProps) {
  const [mode, setMode] = useState<'simple' | 'smart' | 'section'>('simple');
  const [separator, setSeparator] = useState('\n\n---\n\n');
  const [includeTitles, setIncludeTitles] = useState(true);
  const [titleFormat, setTitleFormat] = useState('# {title}');
  const [preview, setPreview] = useState('');
  
  const mergeService = new MergeService();

  const handlePreview = () => {
    const options: MergeOptions = {
      separator,
      includeTitles,
      titleFormat,
    };

    let result: string;

    switch (mode) {
      case 'simple':
        result = mergeService.mergeDocuments(documents, options);
        break;
      case 'smart':
        result = mergeService.smartMerge(documents);
        break;
      case 'section':
        result = mergeService.mergeBySection(documents);
        break;
    }

    setPreview(result);
  };

  const handleMerge = () => {
    handlePreview();
    onMerge(preview);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="merge-dialog-overlay" data-testid="merge-dialog">
      <div className="merge-dialog" data-testid="merge-dialog-content">
        <div className="merge-header">
          <h2>文稿合并</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        <div className="merge-body">
          <div className="mode-select">
            <label>合并模式</label>
            <select value={mode} onChange={(e) => setMode(e.target.value as any)} data-testid="merge-mode">
              <option value="simple">简单合并</option>
              <option value="smart">智能合并</option>
              <option value="section">按章节合并</option>
            </select>
          </div>

          {mode === 'simple' && (
            <>
              <div className="field">
                <label>分隔符</label>
                <input
                  type="text"
                  value={separator}
                  onChange={(e) => setSeparator(e.target.value)}
                  data-testid="separator-input"
                />
              </div>
              <div className="field">
                <label>
                  <input
                    type="checkbox"
                    checked={includeTitles}
                    onChange={(e) => setIncludeTitles(e.target.checked)}
                    data-testid="include-titles"
                  />
                  包含标题
                </label>
              </div>
              <div className="field">
                <label>标题格式</label>
                <input
                  type="text"
                  value={titleFormat}
                  onChange={(e) => setTitleFormat(e.target.value)}
                  disabled={!includeTitles}
                />
              </div>
            </>
          )}

          <div className="preview-section">
            <button onClick={handlePreview} className="preview-btn" data-testid="preview-btn">预览</button>
            <div className="preview-content" data-testid="preview-content">
              {preview.substring(0, 500)}
              {preview.length > 500 && '...'}
            </div>
          </div>
        </div>

        <div className="merge-footer">
          <button onClick={onClose} className="cancel-btn">取消</button>
          <button onClick={handleMerge} className="merge-btn" data-testid="merge-btn">合并</button>
        </div>
      </div>
    </div>
  );
}