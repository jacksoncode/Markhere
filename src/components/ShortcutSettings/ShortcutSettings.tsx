import { useState, useEffect, useCallback } from 'react';
import { useShortcutsStore, Shortcut } from '../../store/shortcutsStore';
import './ShortcutSettings.css';

interface ShortcutSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const categoryLabels: Record<Shortcut['category'], string> = {
  file: 'File',
  edit: 'Edit',
  view: 'View',
  format: 'Format',
  insert: 'Insert',
};

export function ShortcutSettings({ isOpen, onClose }: ShortcutSettingsProps) {
  const {
    shortcuts,
    isRecording,
    recordingId,
    updateShortcut,
    resetShortcut,
    resetAllShortcuts,
    startRecording,
    stopRecording,
    getShortcutsByCategory,
  } = useShortcutsStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<Shortcut['category'] | 'all'>('all');

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isRecording || !recordingId) return;

      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') {
        stopRecording();
        return;
      }

      const parts: string[] = [];
      if (e.metaKey || e.ctrlKey) parts.push('Cmd');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');

      const key = e.key.toUpperCase();
      if (key !== 'META' && key !== 'CONTROL' && key !== 'ALT' && key !== 'SHIFT') {
        parts.push(key);
      }

      if (parts.length > 1) {
        const shortcutKey = parts.join('+');
        updateShortcut(recordingId, shortcutKey);
      }
    },
    [isRecording, recordingId, updateShortcut, stopRecording]
  );

  useEffect(() => {
    if (isRecording) {
      window.addEventListener('keydown', handleKeyDown, true);
      return () => window.removeEventListener('keydown', handleKeyDown, true);
    }
  }, [isRecording, handleKeyDown]);

  const filteredShortcuts =
    activeCategory === 'all'
      ? shortcuts.filter(
          (s) =>
            s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.description.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : getShortcutsByCategory(activeCategory).filter(
          (s) =>
            s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.description.toLowerCase().includes(searchQuery.toLowerCase())
        );

  const categories: Shortcut['category'][] = ['file', 'edit', 'view', 'format', 'insert'];

  if (!isOpen) return null;

  return (
    <div className="shortcut-settings-overlay" onClick={onClose}>
      <div className="shortcut-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="shortcut-settings-header">
          <h2>Keyboard Shortcuts</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="shortcut-settings-toolbar">
          <input
            type="text"
            className="search-input"
            placeholder="Search shortcuts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button className="reset-all-btn" onClick={resetAllShortcuts}>
            Reset All
          </button>
        </div>

        <div className="shortcut-settings-categories">
          <button
            className={`category-btn ${activeCategory === 'all' ? 'active' : ''}`}
            onClick={() => setActiveCategory('all')}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              className={`category-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {categoryLabels[cat]}
            </button>
          ))}
        </div>

        <div className="shortcut-settings-content">
          {filteredShortcuts.map((shortcut) => (
            <div key={shortcut.id} className="shortcut-item">
              <div className="shortcut-info">
                <span className="shortcut-name">{shortcut.name}</span>
                <span className="shortcut-desc">{shortcut.description}</span>
              </div>
              <div className="shortcut-key-wrapper">
                <button
                  className={`shortcut-key-btn ${isRecording && recordingId === shortcut.id ? 'recording' : ''} ${shortcut.currentKey !== shortcut.defaultKey ? 'modified' : ''}`}
                  onClick={() => startRecording(shortcut.id)}
                >
                  {isRecording && recordingId === shortcut.id ? 'Press key...' : shortcut.currentKey}
                </button>
                {shortcut.currentKey !== shortcut.defaultKey && (
                  <button
                    className="reset-btn"
                    onClick={() => resetShortcut(shortcut.id)}
                    title="Reset to default"
                  >
                    ↺
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="shortcut-settings-footer">
          <span className="hint">Click a shortcut key to customize. Press Esc to cancel.</span>
        </div>
      </div>
    </div>
  );
}