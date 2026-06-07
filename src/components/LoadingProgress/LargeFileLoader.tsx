import { useUIState } from '../../store/uiStore';
import './LargeFileLoader.css';

export function LargeFileLoader() {
  const { loadingMessage, loadingProgress } = useUIState();

  if (!loadingMessage) return null;

  return (
    <div className="large-file-loader-overlay">
      <div className="large-file-loader">
        <div className="loader-icon">📄</div>
        <h3>{loadingMessage}</h3>

        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${loadingProgress}%` }}
          />
        </div>

        <p className="progress-text">
          {Math.round(loadingProgress)}% complete
        </p>

        <small className="progress-hint">
          This may take a moment for very large files
        </small>
      </div>
    </div>
  );
}
