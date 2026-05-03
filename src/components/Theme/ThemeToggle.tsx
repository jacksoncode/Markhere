import { useThemeStore } from '../../store/themeStore';
import './ThemeToggle.css';

export function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <button 
      className="theme-toggle"
      onClick={toggleTheme}
      title={theme === 'light' ? '切换到深色模式' : '切换到浅色模式'}
      aria-label={theme === 'light' ? '切换到深色模式' : '切换到浅色模式'}
    >
      <span className="theme-icon">
        {theme === 'light' ? '🌙' : '☀️'}
      </span>
    </button>
  );
}