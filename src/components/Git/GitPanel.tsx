import { useState } from 'react';
import { useGitStore } from '../../store/gitStore';
import './GitPanel.css';

export function GitPanel() {
  const { isEnabled, status, commit, push, pull } = useGitStore();
  const [message, setMessage] = useState('');

  if (!isEnabled) {
    return <div className="git-disabled">未检测到Git仓库</div>;
  }

  const handleCommit = async () => {
    if (message.trim()) {
      await commit('', message);
      setMessage('');
    }
  };

  return (
    <div className="git-panel">
      <div className="git-status">
        <span className="branch">{status?.branch || 'main'}</span>
        <span className="changes">
          {status?.modified || 0} modified, {status?.staged || 0} staged
        </span>
      </div>

      <div className="git-actions">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Commit message..."
        />
        <button onClick={handleCommit} disabled={!message.trim()}>
          Commit
        </button>
      </div>

      <div className="git-remote">
        <button onClick={() => pull('')}>Pull</button>
        <button onClick={() => push('')}>Push</button>
      </div>
    </div>
  );
}