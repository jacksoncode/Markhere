import { useState } from 'react';
import { useCollaborationStore, Collaborator } from '../../store/collaborationStore';
import { useTranslation } from '../../i18n';
import './CollaborationPanel.css';

interface CollaborationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CollaborationPanel({ isOpen, onClose }: CollaborationPanelProps) {
  const { t } = useTranslation();
  const {
    isConnected,
    roomId,
    collaborators,
    connect,
    disconnect,
  } = useCollaborationStore();

  const [userName, setUserName] = useState('');
  const [newRoomId, setNewRoomId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleConnect = () => {
    if (!userName.trim()) {
      setError(t('collaboration.enterName'));
      return;
    }
    if (!newRoomId.trim()) {
      setError(t('collaboration.enterRoomId'));
      return;
    }

    setError(null);
    connect(newRoomId.trim(), userName.trim());
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const generateRoomId = () => {
    const id = Math.random().toString(36).substring(2, 8).toUpperCase();
    setNewRoomId(id);
  };

  const copyRoomId = async () => {
    if (roomId) {
      await navigator.clipboard.writeText(roomId);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="collaboration-panel-overlay" onClick={onClose}>
      <div className="collaboration-panel-modal" onClick={(e) => e.stopPropagation()}>
        <div className="collaboration-panel-header">
          <h2>{t('collaboration.title')}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="collaboration-content">
          {!isConnected ? (
            <div className="connect-section">
              <div className="input-group">
                <label>{t('collaboration.yourName')}</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder={t('collaboration.enterName')}
                  className="name-input"
                />
              </div>

              <div className="input-group">
                <label>{t('collaboration.roomId')}</label>
                <div className="room-input-wrapper">
                  <input
                    type="text"
                    value={newRoomId}
                    onChange={(e) => setNewRoomId(e.target.value)}
                    placeholder={t('collaboration.enterNameOrGenerate')}
                    className="room-input"
                  />
                  <button className="generate-btn" onClick={generateRoomId}>
                    {t('collaboration.generate')}
                  </button>
                </div>
              </div>

              {error && <div className="error-message">{error}</div>}

              <button className="connect-btn" onClick={handleConnect}>
                {t('collaboration.connect')}
              </button>

              <div className="help-text">
                {t('collaboration.shareRoomInfo')}
              </div>
            </div>
          ) : (
            <div className="connected-section">
              <div className="room-info">
                <div className="room-id-display">
                  <span className="room-label">{t('collaboration.room')}:</span>
                  <span className="room-value">{roomId}</span>
                  <button className="copy-btn" onClick={copyRoomId}>
                    {t('collaboration.copy')}
                  </button>
                </div>
                <div className="connection-status">
                  <span className="status-indicator connected">●</span>
                  {t('collaboration.connected')}
                </div>
              </div>

              <div className="collaborators-section">
                <h3>{t('collaboration.collaborators')} ({collaborators.length})</h3>
                <div className="collaborators-list">
                  {collaborators.map((collab: Collaborator) => (
                    <div key={collab.id} className="collaborator-item">
                      <div 
                        className="collaborator-avatar"
                        style={{ backgroundColor: collab.color }}
                      >
                        {collab.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="collaborator-name">{collab.name}</span>
                      {collab.cursor && (
                        <span className="cursor-indicator">
                          {t('collaboration.editingAt', undefined, { pos: collab.cursor.from })}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="sync-info">
                <h3>{t('collaboration.syncStatus')}</h3>
                <div className="sync-status">
                  {t('collaboration.synced')}
                </div>
              </div>

              <button className="disconnect-btn" onClick={handleDisconnect}>
                {t('collaboration.disconnect')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}