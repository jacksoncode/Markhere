import { useState, useEffect } from 'react';
import EmojiPicker from 'emoji-picker-react';
import './EmojiPickerPanel.css';

export function EmojiPickerPanel({ onInsert }: { onInsert: (emoji: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [isOpen]);

  const handleEmojiClick = (emojiData: any) => {
    onInsert(emojiData.emoji);
    setIsOpen(false);
  };

  return (
    <div className="emoji-picker-container">
      <button onClick={() => setIsOpen(!isOpen)} className="emoji-trigger">
        😀
      </button>

      {isOpen && (
        <div className="emoji-panel">
          <EmojiPicker onEmojiClick={handleEmojiClick} width={350} height={400} />
        </div>
      )}
    </div>
  );
}