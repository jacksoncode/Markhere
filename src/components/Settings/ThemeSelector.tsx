import { useThemeStore } from '../../store/themeStore';
import { themes } from '../../store/themes';
import './ThemeSelector.css';

export function ThemeSelector() {
  const { currentTheme, setTheme } = useThemeStore();

  return (
    <div className="theme-selector">
      <div className="theme-grid">
        {Object.entries(themes).map(([key, theme]) => (
          <button
            key={key}
            className={`theme-card ${currentTheme === key ? 'active' : ''}`}
            onClick={() => setTheme(key as any)}
            style={{
              backgroundColor: theme.colors.bg,
              color: theme.colors.text,
              borderColor: currentTheme === key ? theme.colors.primary : theme.colors.border,
            }}
          >
            <span className="theme-name">{theme.name}</span>
            <div className="theme-preview">
              <span style={{ color: theme.colors.primary }}>●</span>
              <span style={{ color: theme.colors.text }}>●</span>
              <span style={{ color: theme.colors.border }}>●</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}