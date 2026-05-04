import { useState } from 'react';
import { useCollaborationStore, Collaborator } from '../../store/collaborationStore';
import './CollaborationPanel.css';

interface CollaborationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CollaborationPanel({ isOpen, onClose }: CollaborationPanelProps) {
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
      setError('Please enter your name');
      return;
    }
    if (!newRoomId.trim()) {
      setError('Please enter a room ID');
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
          <h2>Real-time Collaboration</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="collaboration-content">
          {!isConnected ? (
            <div className="connect-section">
              <div className="input-group">
                <label>Your Name</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Enter your name"
                  className="name-input"
                />
              </div>

              <div className="input-group">
                <label>Room ID</label>
                <div className="room-input-wrapper">
                  <input
                    type="text"
                    value={newRoomId}
                    onChange={(e) => setNewRoomId(e.target.value)}
                    placeholder="Enter room ID or generate"
                    className="room-input"
                  />
                  <button className="generate-btn" onClick={generateRoomId}>
                    Generate
                  </button>
                </div>
              </div>

              {error && <div className="error-message">{error}</div>}

              <button className="connect-btn" onClick={handleConnect}>
                Connect
              </button>

              <div className="help-text">
                Share the room ID with collaborators to join the same document.
                All changes will be synchronized in real-time.
              </div>
            </div>
          ) : (
            <div className="connected-section">
              <div className="room-info">
                <div className="room-id-display">
                  <span className="room-label">Room:</span>
                  <span className="room-value">{roomId}</span>
                  <button className="copy-btn" onClick={copyRoomId}>
                    Copy
                  </button>
                </div>
                <div className="connection-status">
                  <span className="status-indicator connected">●</span>
                  Connected
                </div>
              </div>

              <div className="collaborators-section">
                <h3>Collaborators ({collaborators.length})</h3>
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
                          editing at position {collab.cursor.from}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="sync-info">
                <h3>Sync Status</h3>
                <div className="sync-status">
                  Document is synchronized across all collaborators.
                  All edits are merged automatically using Y.js CRDT technology.
                </div>
              </div>

              <button className="disconnect-btn" onClick={handleDisconnect}>
                Disconnect
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}