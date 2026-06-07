import { useRef, useEffect, useCallback } from 'react';

/**
 * Makes a fixed-position button draggable.
 * Stores the final position in localStorage so it persists across sessions.
 */
export function useDraggable(storageKey: string) {
  const ref = useRef<HTMLButtonElement>(null);
  const isDragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const { x, y } = JSON.parse(saved);
        el.style.right = 'auto'; el.style.bottom = 'auto';
        el.style.left = `${x}px`; el.style.top = `${y}px`;
      }
    } catch { /* ignore */ }
  }, [storageKey]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    e.preventDefault();
    isDragging.current = true;
    const rect = el.getBoundingClientRect();
    startPos.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    el.style.cursor = 'grabbing';
  }, []);

  useEffect(() => {
    const onMove = (e: globalThis.MouseEvent) => {
      if (!isDragging.current || !ref.current) return;
      const el = ref.current;
      const x = e.clientX - startPos.current.x;
      const y = e.clientY - startPos.current.y;
      el.style.right = 'auto'; el.style.bottom = 'auto';
      el.style.left = `${Math.max(0, Math.min(window.innerWidth - el.offsetWidth, x))}px`;
      el.style.top = `${Math.max(0, Math.min(window.innerHeight - el.offsetHeight, y))}px`;
    };
    const onUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      const el = ref.current;
      if (el) {
        el.style.cursor = 'grab';
        const r = el.getBoundingClientRect();
        localStorage.setItem(storageKey, JSON.stringify({ x: r.left, y: r.top }));
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [storageKey]);

  return { ref, onMouseDown };
}
