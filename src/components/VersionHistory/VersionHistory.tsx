import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useGitStore } from '../../store/gitStore';
import { useFileStore } from '../../store/fileStore';
import { useTranslation } from '../../i18n';
import { useNotificationStore } from '../Notification/Notification';
import './VersionHistory.css';

interface VersionHistoryProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VersionHistory({ isOpen, onClose }: VersionHistoryProps) {
  const { t } = useTranslation();
  const currentPath = useFileStore((s) => s.currentPath);
  const notify = useNotificationStore((s) => s.notify);

  const {
    isEnabled,
    loading,
    error,
    commits,
    currentDiff,
    selectedHash,
    loadHistory,
    loadDiff,
    selectCommit,
    clearDiff,
  } = useGitStore();

  const [viewMode, setViewMode] = useState<'diff' | 'content'>('diff');
  const [contentLoading, setContentLoading] = useState(false);
  const [contentAtCommit, setContentAtCommit] = useState<string | null>(null);

  // Load commit history when the modal opens
  useEffect(() => {
    if (isOpen && currentPath) {
      loadHistory(currentPath);
    }
  }, [isOpen, currentPath, loadHistory]);

  // Surface store errors as toast notifications
  useEffect(() => {
    if (error) {
      notify('error', error);
    }
  }, [error, notify]);

  // Fetch diff or file content for a given commit
  const loadCommitData = useCallback(
    async (hash: string, index: number, mode: 'diff' | 'content') => {
      if (mode === 'content') {
        setContentLoading(true);
        try {
          const content = await invoke<string>('get_file_at_commit', {
            filePath: currentPath,
            hash,
          });
          setContentAtCommit(content);
        } catch (e) {
          notify('error', String(e));
        } finally {
          setContentLoading(false);
        }
      } else {
        const parentHash = index + 1 < commits.length ? commits[index + 1].hash : '';
        await loadDiff(currentPath!, parentHash, hash);
      }
    },
    [currentPath, commits, loadDiff, notify],
  );

  const handleCommitClick = useCallback(
    (hash: string, index: number) => {
      // Toggle off if clicking the already-selected commit
      if (selectedHash === hash) {
        clearDiff();
        setContentAtCommit(null);
        return;
      }

      selectCommit(hash);
      setContentAtCommit(null);
      loadCommitData(hash, index, viewMode);
    },
    [selectedHash, selectCommit, clearDiff, loadCommitData, viewMode],
  );

  // When the user switches view mode, clear displayed data so they re-select
  const handleViewModeChange = useCallback(
    (mode: 'diff' | 'content') => {
      setViewMode(mode);
      clearDiff();
      setContentAtCommit(null);
    },
    [clearDiff],
  );

  /* ---- render helpers ---- */

  const renderDiffLines = () => {
    if (!currentDiff) return null;

    const oldLines = currentDiff.old_content.split('\n');
    const newLines = currentDiff.new_content.split('\n');

    return (
      <div className="diff-view">
        <div className="diff-stats">
          <span className="additions">+{currentDiff.additions}</span>
          <span className="deletions">-{currentDiff.deletions}</span>
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

  const renderRightPanel = () => {
    if (loading) {
      return <div className="vh-state"><div className="vh-loading">{t('git.loadingDiff')}</div></div>;
    }

    if (contentLoading) {
      return <div className="vh-state"><div className="vh-loading">{t('versionHistory.loading')}</div></div>;
    }

    if (!selectedHash) {
      return (
        <div className="no-selection">{t('versionHistory.selectCommit')}</div>
      );
    }

    if (viewMode === 'content' && contentAtCommit) {
      return (
        <div className="content-view">
          <pre>{contentAtCommit}</pre>
        </div>
      );
    }

    if (viewMode === 'diff') {
      return renderDiffLines();
    }

    return null;
  };

  const renderBody = () => {
    // --- terminal / empty states (full-width) ---

    if (!currentPath) {
      return <div className="vh-empty-state">{t('git.noFileOpen')}</div>;
    }

    if (!isEnabled && !loading) {
      return <div className="vh-empty-state">{t('git.noRepo')}</div>;
    }

    if (loading && commits.length === 0) {
      return <div className="vh-loading">{t('git.loadingHistory')}</div>;
    }

    if (!loading && commits.length === 0) {
      return <div className="vh-empty-state">{t('git.noCommits')}</div>;
    }

    // --- normal split layout ---

    return (
      <div className="version-history-content">
        <div className="commits-list">
          {commits.map((commit, index) => (
            <div
              key={commit.hash}
              className={`commit-item ${selectedHash === commit.hash ? 'selected' : ''}`}
              onClick={() => handleCommitClick(commit.hash, index)}
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
          {renderRightPanel()}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="version-history-overlay" onClick={onClose}>
      <div className="version-history-modal" onClick={(e) => e.stopPropagation()}>
        <div className="version-history-header">
          <h2>{t('versionHistory.title')}</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="version-history-toolbar">
          <button
            className={`view-mode-btn ${viewMode === 'diff' ? 'active' : ''}`}
            onClick={() => handleViewModeChange('diff')}
          >
            {t('versionHistory.diffView')}
          </button>
          <button
            className={`view-mode-btn ${viewMode === 'content' ? 'active' : ''}`}
            onClick={() => handleViewModeChange('content')}
          >
            {t('versionHistory.contentView')}
          </button>
        </div>

        {renderBody()}
      </div>
    </div>
  );
}
