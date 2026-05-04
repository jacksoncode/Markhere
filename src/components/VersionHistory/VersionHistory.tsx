import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useFileStore } from '../../store/fileStore';
import './VersionHistory.css';

interface GitCommit {
  hash: string;
  short_hash: string;
  author: string;
  date: string;
  message: string;
}

interface GitDiff {
  old_content: string;
  new_content: string;
  additions: number;
  deletions: number;
}

interface VersionHistoryProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VersionHistory({ isOpen, onClose }: VersionHistoryProps) {
  const { currentPath } = useFileStore();
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [selectedCommit, setSelectedCommit] = useState<GitCommit | null>(null);
  const [diff, setDiff] = useState<GitDiff | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'diff' | 'content'>('diff');

  useEffect(() => {
    if (isOpen && currentPath) {
      loadHistory();
    }
  }, [isOpen, currentPath]);

  const loadHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const history = await invoke<GitCommit[]>('get_git_history', { filePath: currentPath });
      setCommits(history);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const loadDiff = async (commit: GitCommit) => {
    if (commits.length < 2) return;
    
    const currentIndex = commits.findIndex(c => c.hash === commit.hash);
    const prevCommit = commits[currentIndex + 1];
    
    if (!prevCommit) return;

    setLoading(true);
    try {
      const diffResult = await invoke<GitDiff>('get_git_diff', {
        filePath: currentPath,
        oldHash: prevCommit.hash,
        newHash: commit.hash,
      });
      setDiff(diffResult);
      setSelectedCommit(commit);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const loadContentAtCommit = async (commit: GitCommit) => {
    setLoading(true);
    try {
      const content = await invoke<string>('get_file_at_commit', {
        filePath: currentPath,
        hash: commit.hash,
      });
      setDiff({
        old_content: '',
        new_content: content,
        additions: 0,
        deletions: 0,
      });
      setSelectedCommit(commit);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleCommitClick = (commit: GitCommit) => {
    if (viewMode === 'diff') {
      loadDiff(commit);
    } else {
      loadContentAtCommit(commit);
    }
  };

  const renderDiff = () => {
    if (!diff) return null;

    if (viewMode === 'content') {
      return (
        <div className="content-view">
          <pre>{diff.new_content}</pre>
        </div>
      );
    }

    const oldLines = diff.old_content.split('\n');
    const newLines = diff.new_content.split('\n');

    return (
      <div className="diff-view">
        <div className="diff-stats">
          <span className="additions">+{diff.additions}</span>
          <span className="deletions">-{diff.deletions}</span>
        </div>
        <div className="diff-content">
          {newLines.map((line, i) => {
            const oldLine = oldLines[i];
            if (line === oldLine) {
              return <div key={i} className="diff-line unchanged">{line}</div>;
            } else if (!oldLine || !oldLines.includes(line)) {
              return <div key={i} className="diff-line added">+ {line}</div>;
            } else {
              return <div key={i} className="diff-line modified">{line}</div>;
            }
          })}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="version-history-overlay" onClick={onClose}>
      <div className="version-history-modal" onClick={(e) => e.stopPropagation()}>
        <div className="version-history-header">
          <h2>Version History</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="version-history-toolbar">
          <button
            className={`view-mode-btn ${viewMode === 'diff' ? 'active' : ''}`}
            onClick={() => setViewMode('diff')}
          >
            Diff View
          </button>
          <button
            className={`view-mode-btn ${viewMode === 'content' ? 'active' : ''}`}
            onClick={() => setViewMode('content')}
          >
            Content View
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="version-history-content">
          <div className="commits-list">
            {loading && commits.length === 0 && <div className="loading">Loading...</div>}
            {commits.map((commit) => (
              <div
                key={commit.hash}
                className={`commit-item ${selectedCommit?.hash === commit.hash ? 'selected' : ''}`}
                onClick={() => handleCommitClick(commit)}
              >
                <div className="commit-hash">{commit.short_hash}</div>
                <div className="commit-info">
                  <div className="commit-message">{commit.message}</div>
                  <div className="commit-meta">
                    <span className="commit-author">{commit.author}</span>
                    <span className="commit-date">{commit.date}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="diff-panel">
            {loading && <div className="loading">Loading...</div>}
            {!loading && selectedCommit && renderDiff()}
            {!loading && !selectedCommit && (
              <div className="no-selection">Select a commit to view changes</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}