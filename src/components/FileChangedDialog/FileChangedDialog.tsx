import { useTranslation } from '../../i18n';
import '../UnsavedChangesDialog.css';

interface FileChangedDialogProps {
  /** Reload from disk, discarding in-editor changes. */
  onReload: () => void;
  /** Keep the in-editor version. */
  onKeep: () => void;
}

/**
 * Shown when the open file was modified by another program while the editor
 * has unsaved changes. Lets the user choose between the on-disk version and
 * their own edits.
 */
export function FileChangedDialog({ onReload, onKeep }: FileChangedDialogProps) {
  const { t } = useTranslation();

  return (
    <div className="unsaved-dialog-overlay">
      <div className="unsaved-dialog">
        <h2>{t('fileChanged.title')}</h2>
        <p>{t('fileChanged.message')}</p>
        <div className="unsaved-dialog-actions">
          <button className="unsaved-btn discard" onClick={onReload}>
            {t('fileChanged.reload')}
          </button>
          <button className="unsaved-btn save" onClick={onKeep}>
            {t('fileChanged.keep')}
          </button>
        </div>
      </div>
    </div>
  );
}
