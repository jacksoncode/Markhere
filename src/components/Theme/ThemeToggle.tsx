import { useState } from 'react';
import { ThemeSelector } from '../Settings/ThemeSelector';
import './ThemeToggle.css';

export function ThemeToggle() {
  const [showSelector, setShowSelector] = useState(false);

  return (
    <div className="theme-toggle-container">
      <button 
        className="theme-toggle"
        onClick={() => setShowSelector(!showSelector)}
        title="选择主题"
        aria-label="选择主题"
      >
        <span className="theme-icon">🎨</span>
      </button>
      
      {showSelector && (
        <div className="theme-selector-popup">
          <ThemeSelector />
        </div>
      )}
    </div>
  );
}