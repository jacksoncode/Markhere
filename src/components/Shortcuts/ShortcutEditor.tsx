import { useShortcutStore, ShortcutConfig } from '../../store/shortcutStore';
import './ShortcutEditor.css';

export function ShortcutEditor() {
  const { shortcuts, resetShortcuts } = useShortcutStore();

  const formatShortcut = (config: ShortcutConfig) => {
    const mods = config.modifiers.map((m) => m === 'Meta' ? '⌘' : m).join('+');
    return `${mods}+${config.key.toUpperCase()}`;
  };

  return (
    <div className="shortcut-editor">
      <div className="shortcut-list">
        {shortcuts.map((shortcut: ShortcutConfig) => (
          <div key={shortcut.action} className="shortcut-item">
            <span className="shortcut-action">{shortcut.action}</span>
            <span className="shortcut-keys">{formatShortcut(shortcut)}</span>
          </div>
        ))}
      </div>

      <button onClick={resetShortcuts} className="reset-btn">
        重置默认快捷键
      </button>
    </div>
  );
}