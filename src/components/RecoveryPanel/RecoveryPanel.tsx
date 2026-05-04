import { useAutoSaveStore, formatTimeAgo, Draft } from '../../store/autoSaveStore';
import './RecoveryPanel.css';

interface RecoveryPanelProps {
  isOpen: boolean;
  onRecover: (content: string, path?: string) => void;
  onDismiss: () => void;
}

export function RecoveryPanel({ isOpen, onRecover, onDismiss }: RecoveryPanelProps) {
  const { content, currentPath, lastSaved, getRecentDrafts, deleteDraft, clearBackup } = useAutoSaveStore();

  if (!isOpen) return null;

  const handleRecoverCurrent = () => {
    onRecover(content, currentPath || undefined);
    clearBackup();
    onDismiss();
  };

  const handleRecoverDraft = (draft: Draft) => {
    onRecover(draft.content, draft.path);
    deleteDraft(draft.id);
    onDismiss();
  };

  const handleDismiss = () => {
    clearBackup();
    onDismiss();
  };

  const handleDeleteDraft = (id: string) => {
    deleteDraft(id);
  };

  const recentDrafts = getRecentDrafts(10);
  const hasCurrentBackup = content.length > 0;

  return (
    <div className="recovery-panel-overlay">
      <div className="recovery-panel-modal">
        <div className="recovery-panel-header">
          <h2>🔄 Document Recovery</h2>
          <p>We found unsaved content from your last session</p>
        </div>

        <div className="recovery-panel-content">
          {hasCurrentBackup && (
            <div className="current-backup-section">
              <h3>Current Session Backup</h3>
              <div className="backup-info">
                <div className="backup-meta">
                  <span className="backup-time">{formatTimeAgo(lastSaved)}</span>
                  <span className="backup-path">{currentPath || 'Untitled'}</span>
                </div>
                <div className="backup-preview">
                  <pre>{content.slice(0, 200)}{content.length > 200 ? '...' : ''}</pre>
                </div>
              </div>
              <div className="backup-actions">
                <button className="recover-btn" onClick={handleRecoverCurrent}>
                  Recover
                </button>
                <button className="discard-btn" onClick={handleDismiss}>
                  Discard
                </button>
              </div>
            </div>
          )}

          {recentDrafts.length > 0 && (
            <div className="drafts-section">
              <h3>Recent Drafts ({recentDrafts.length})</h3>
              <div className="drafts-list">
                {recentDrafts.map((draft) => (
                  <div key={draft.id} className="draft-item">
                    <div className="draft-info">
                      <span className="draft-title">{draft.title}</span>
                      <span className="draft-time">{formatTimeAgo(draft.timestamp)}</span>
                    </div>
                    <div className="draft-preview">
                      <pre>{draft.content.slice(0, 100)}...</pre>
                    </div>
                    <div className="draft-actions">
                      <button 
                        className="recover-draft-btn" 
                        onClick={() => handleRecoverDraft(draft)}
                      >
                        Recover
                      </button>
                      <button 
                        className="delete-draft-btn" 
                        onClick={() => handleDeleteDraft(draft.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!hasCurrentBackup && recentDrafts.length === 0 && (
            <div className="no-recovery">
              <p>No unsaved content found</p>
            </div>
          )}
        </div>

        <div className="recovery-panel-footer">
          <button className="close-btn" onClick={onDismiss}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}