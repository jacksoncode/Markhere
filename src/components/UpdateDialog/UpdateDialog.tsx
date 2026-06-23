import { useState, useCallback, useEffect } from 'react';
import { UpdaterService, type UpdaterProgress } from '../../services/UpdaterService';
import { useTranslation } from '../../i18n';
import '../UnsavedChangesDialog.css';

interface UpdateDialogProps {
  onClose: () => void;
}

export function UpdateDialog({ onClose }: UpdateDialogProps) {
  const { t } = useTranslation();
  const [progress, setProgress] = useState<UpdaterProgress>({ status: 'checking' });

  const handleCheck = useCallback(async () => {
    const update = await UpdaterService.check(setProgress);
    if (!update) return; // uptodate or error; keep dialog visible briefly for status
  }, []);

  useEffect(() => {
    void handleCheck();
  }, [handleCheck]);

  const handleInstall = useCallback(async () => {
    if (!progress.update) return;
    await UpdaterService.downloadAndInstall(progress.update, setProgress);
  }, [progress.update]);

  const statusText = (() => {
    switch (progress.status) {
      case 'checking':
        return t('update.checking');
      case 'available':
        return t('update.available', '', { version: progress.update?.version || '' });
      case 'downloading':
        return t('update.downloading');
      case 'ready':
        return t('update.ready');
      case 'uptodate':
        return t('update.uptodate');
      case 'error':
        return t('update.error', '', { message: progress.error || '' });
    }
  })();

  return (
    <div className="unsaved-dialog-overlay">
      <div className="unsaved-dialog">
        <h2>{t('update.title')}</h2>
        <p>{statusText}</p>

        {progress.status === 'downloading' && progress.totalBytes ? (
          <div style={{ margin: '12px 0' }}>
            <div
              style={{
                height: 6,
                borderRadius: 3,
                background: 'var(--bg-secondary)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, ((progress.downloadedBytes ?? 0) / progress.totalBytes) * 100)}%`,
                  background: 'var(--accent-color, #3b82f6)',
                  transition: 'width 0.2s',
                }}
              />
            </div>
          </div>
        ) : null}

        <div className="unsaved-dialog-actions">
          {progress.status === 'available' && progress.update && (
            <button className="unsaved-btn save" onClick={handleInstall}>
              {t('update.install')}
            </button>
          )}
          {progress.status === 'ready' && (
            <span className="unsaved-btn save" style={{ cursor: 'default' }}>
              {t('update.relaunching')}
            </span>
          )}
          <button className="unsaved-btn cancel" onClick={onClose}>
            {progress.status === 'uptodate' || progress.status === 'error' ? t('update.close') : t('update.later')}
          </button>
        </div>
      </div>
    </div>
  );
}
