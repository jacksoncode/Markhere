import { useTranslation } from '../i18n';
import './UnsavedChangesDialog.css';

interface UnsavedChangesDialogProps {
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export function UnsavedChangesDialog({ onSave, onDiscard, onCancel }: UnsavedChangesDialogProps) {
  const { t } = useTranslation();

  return (
    <div className="unsaved-dialog-overlay">
      <div className="unsaved-dialog">
        <h2>{t('unsaved.title')}</h2>
        <p>{t('unsaved.message')}</p>
        <div className="unsaved-dialog-actions">
          <button className="unsaved-btn save" onClick={onSave}>
            {t('unsaved.save')}
          </button>
          <button className="unsaved-btn discard" onClick={onDiscard}>
            {t('unsaved.discard')}
          </button>
          <button className="unsaved-btn cancel" onClick={onCancel}>
            {t('unsaved.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}