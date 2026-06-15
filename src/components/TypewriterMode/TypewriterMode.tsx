import { useEffect, useRef } from 'react';
import { useUIState } from '../../store/uiStore';
import './TypewriterMode.css';

export function TypewriterMode() {
  const { typewriterMode } = useUIState();
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!typewriterMode || !editorRef.current) return;

    const editor = editorRef.current;
    
    const handleScroll = () => {
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return;

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const editorRect = editor.getBoundingClientRect();
      
      const cursorY = rect.top - editorRect.top + editor.scrollTop;
      const targetY = cursorY - (editor.clientHeight * 0.33);
      
      editor.scrollTo({
        top: Math.max(0, targetY),
        behavior: 'smooth'
      });
    };

    document.addEventListener('selectionchange', handleScroll);
    return () => document.removeEventListener('selectionchange', handleScroll);
  }, [typewriterMode]);

  return (
    <>
      <div className="typewriter-center-indicator" />
      {/* Invisible scroll-target overlay — must NOT take flex space from the real editor */}
      <div
        ref={editorRef}
        className={typewriterMode ? 'typewriter-overlay' : ''}
        aria-hidden="true"
      />
    </>
  );
}