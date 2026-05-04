import { useState } from 'react';
import { useFontStore } from '../../store/fontStore';

const availableFonts = [
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  'Georgia, serif',
  'Times New Roman, Times, serif',
  'Arial, Helvetica, sans-serif',
  'Courier New, Courier, monospace',
  'Menlo, Monaco, monospace',
  'Fira Code, monospace',
  'Source Code Pro, monospace',
  'Inter, sans-serif',
  'Open Sans, sans-serif',
  'Lato, sans-serif',
  'Merriweather, serif',
  'Noto Serif, serif',
  'PT Serif, serif',
];

export function FontSettings() {
  const { fontFamily, fontSize, lineHeight, setFontFamily, setFontSize, setLineHeight } = useFontStore();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="font-settings">
      <button onClick={() => setIsOpen(!isOpen)} className="settings-trigger">
        字体设置
      </button>

      {isOpen && (
        <div className="settings-panel">
          <div className="setting-group">
            <label>字体</label>
            <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)}>
              {availableFonts.map((font) => (
                <option key={font} value={font}>{font.split(',')[0]}</option>
              ))}
            </select>
          </div>

          <div className="setting-group">
            <label>字号 ({fontSize}px)</label>
            <input
              type="range"
              min="10"
              max="32"
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value))}
            />
          </div>

          <div className="setting-group">
            <label>行高 ({lineHeight})</label>
            <input
              type="range"
              min="1.0"
              max="3.0"
              step="0.1"
              value={lineHeight}
              onChange={(e) => setLineHeight(parseFloat(e.target.value))}
            />
          </div>
        </div>
      )}
    </div>
  );
}