import { useUIState } from '../../store/uiStore';
import './FocusMode.css';

export function FocusMode() {
  const { focusMode, toggleFocusMode } = useUIState();

  return (
    <>
      <div className="focus-mode-overlay" />
      {focusMode && (
        <button 
          className="focus-mode-exit-btn"
          onClick={toggleFocusMode}
        >
          Exit Focus Mode (Esc)
        </button>
      )}
    </>
  );
}