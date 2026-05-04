import { useEffect, useState } from 'react';
import './AutoHideUI.css';

export function AutoHideUI() {
  const [isHidden, setIsHidden] = useState(false);
  const [scrollTimeout, setScrollTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsHidden(true);
      
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      
      const timeout = setTimeout(() => {
        setIsHidden(false);
      }, 2000);
      
      setScrollTimeout(timeout);
    };

    const handleMouseMove = () => {
      if (isHidden) {
        setIsHidden(false);
        if (scrollTimeout) {
          clearTimeout(scrollTimeout);
          setScrollTimeout(null);
        }
      }
    };

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('mousemove', handleMouseMove);
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
    };
  }, [isHidden, scrollTimeout]);

  return null;
}

export function useAutoHide() {
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    const appContainer = document.querySelector('.app-container');
    if (!appContainer) return;

    let timeout: ReturnType<typeof setTimeout>;
    
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('editor-wrapper') || target.classList.contains('editor-content')) {
        setIsHidden(true);
        
        timeout = setTimeout(() => {
          setIsHidden(false);
        }, 2000);
      }
    };

    const handleMouseMove = () => {
      if (isHidden) {
        setIsHidden(false);
        clearTimeout(timeout);
      }
    };

    appContainer.addEventListener('scroll', handleScroll, true);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      appContainer.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timeout);
    };
  }, [isHidden]);

  return isHidden;
}