import { useAutoSaveStore, formatTimeAgo } from '../../store/autoSaveStore';
import './RecoveryDialog.css';

interface RecoveryDialogProps {
  onRecover: () => void;
  onDiscard: () => void;
}

export function RecoveryDialog({ onRecover, onDiscard }: RecoveryDialogProps) {
  const { content, lastSaved, currentPath, clearBackup } = useAutoSaveStore();

  const handleRecover = () => {
    onRecover();
    clearBackup();
  };

  const handleDiscard = () => {
    onDiscard();
    clearBackup();
  };

  if (!content || typeof content !== 'string' || !lastSaved) {
    return null;
  }

  const fileName = currentPath ? currentPath.split('/').pop() : 'Untitled';
  const timeAgo = formatTimeAgo(lastSaved);
  const previewLines = content.split('\n').slice(0, 5).join('\n');
  const lineCount = content.split('\n').length;

  return (
    <div className="recovery-overlay">
      <div className="recovery-dialog">
        <div className="recovery-header">
          <h2>发现未保存的内容</h2>
          <p className="recovery-info">
            上次编辑: <strong>{fileName}</strong> · {timeAgo}
          </p>
        </div>
        
        <div className="recovery-preview">
          <pre>{previewLines}{lineCount > 5 ? '\n...' : ''}</pre>
          <p className="recovery-stats">{lineCount} 行</p>
        </div>
        
        <div className="recovery-actions">
          <button className="recovery-btn recovery-btn-primary" onClick={handleRecover}>
            恢复内容
          </button>
          <button className="recovery-btn recovery-btn-secondary" onClick={handleDiscard}>
            丢弃
          </button>
        </div>
      </div>
    </div>
  );
}