import { useState, useEffect } from 'react';
import { useWordGoalStore } from '../../store/wordGoalStore';
import { useEditorState } from '../../store/editorStore';
import './WordGoalProgress.css';

export function WordGoalProgress() {
  const { targetWords, enabled, showProgress, setTargetWords, setEnabled, setShowProgress, calculateProgress } = useWordGoalStore();
  const { content } = useEditorState();
  const [currentWords, setCurrentWords] = useState(0);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const text = content || '';
    const words = text.trim().split(/\s+/).filter((w) => w.length > 0).length;
    setCurrentWords(words);
  }, [content]);

  const progress = calculateProgress(currentWords);
  const remaining = targetWords - currentWords;

  if (!enabled) return null;

  return (
    <div className="word-goal-container">
      {isEditing ? (
        <div className="word-goal-edit">
          <input
            type="number"
            value={targetWords}
            onChange={(e) => setTargetWords(parseInt(e.target.value) || 0)}
            className="target-input"
            placeholder="Target words"
            autoFocus
          />
          <button className="apply-btn" onClick={() => setIsEditing(false)}>
            ✓
          </button>
        </div>
      ) : (
        <div className="word-goal-display">
          <div className="word-count-info">
            <span className="current-words">{currentWords}</span>
            <span className="separator">/</span>
            <span className="target-words clickable" onClick={() => setIsEditing(true)}>
              {targetWords}
            </span>
            <span className="words-label">words</span>
          </div>

          {showProgress && (
            <div className="progress-bar-container">
              <div
                className={`progress-bar ${progress >= 100 ? 'complete' : progress >= 75 ? 'high' : progress >= 50 ? 'medium' : 'low'}`}
                style={{ width: `${progress}%` }}
              />
              <span className="progress-text">{progress}%</span>
            </div>
          )}

          <div className="remaining-info">
            {remaining > 0 ? (
              <span className="remaining">{remaining} words remaining</span>
            ) : (
              <span className="complete-message">🎉 Goal achieved!</span>
            )}
          </div>

          <div className="word-goal-controls">
            <button className="toggle-progress-btn" onClick={() => setShowProgress(!showProgress)}>
              {showProgress ? 'Hide Progress' : 'Show Progress'}
            </button>
            <button className="disable-btn" onClick={() => setEnabled(false)}>
              Disable
            </button>
          </div>
        </div>
      )}
    </div>
  );
}