import { useState, useEffect } from 'react';
import './GotoLineDialog.css';

export function GotoLineDialog({ isOpen, onClose, onGoto }: {
  isOpen: boolean;
  onClose: () => void;
  onGoto: (line: number) => void;
}) {
  const [lineNumber, setLineNumber] = useState('1');

  useEffect(() => {
    if (isOpen) {
      setLineNumber('1');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const line = parseInt(lineNumber, 10);
    if (line > 0) {
      onGoto(line);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="goto-line-overlay" onClick={onClose}>
      <div className="goto-line-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>跳转到行</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="number"
            value={lineNumber}
            onChange={(e) => setLineNumber(e.target.value)}
            placeholder="输入行号"
            autoFocus
            min="1"
          />
          <div className="dialog-actions">
            <button type="button" onClick={onClose}>取消</button>
            <button type="submit">跳转</button>
          </div>
        </form>
      </div>
    </div>
  );
}