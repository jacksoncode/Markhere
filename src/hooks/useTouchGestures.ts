import { useEffect, RefObject } from 'react';

export interface TouchGesture {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinchZoom?: (scale: number) => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
}

export function useTouchGestures(
  ref: RefObject<HTMLElement | null>,
  gestures: TouchGesture
) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    let lastTapTime = 0;
    let longPressTimer: ReturnType<typeof setTimeout> | null = null;
    let pinchStartDist = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();

        // Long press detection
        if (gestures.onLongPress) {
          longPressTimer = setTimeout(() => {
            gestures.onLongPress?.();
          }, 600);
        }
      }

      // Pinch start
      if (e.touches.length === 2 && gestures.onPinchZoom) {
        pinchStartDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (longPressTimer && e.touches.length > 0) {
        const deltaX = Math.abs(e.touches[0].clientX - touchStartX);
        const deltaY = Math.abs(e.touches[0].clientY - touchStartY);
        if (deltaX > 10 || deltaY > 10) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      }

      // Pinch zoom
      if (e.touches.length === 2 && gestures.onPinchZoom && pinchStartDist > 0) {
        const currentDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const scale = currentDist / pinchStartDist;
        gestures.onPinchZoom(scale);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }

      if (e.changedTouches.length !== 1) return;

      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const touchEndTime = Date.now();

      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;
      const duration = touchEndTime - touchStartTime;

      // Double tap detection
      if (duration < 200 && Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
        const timeSinceLastTap = touchEndTime - lastTapTime;
        if (timeSinceLastTap < 300) {
          gestures.onDoubleTap?.();
          lastTapTime = 0;
          return;
        }
        lastTapTime = touchEndTime;
      }

      // Swipe detection
      if (duration < 300) {
        const absDx = Math.abs(deltaX);
        const absDy = Math.abs(deltaY);

        if (absDx > absDy && absDx > 50) {
          if (deltaX > 0) {
            gestures.onSwipeRight?.();
          } else {
            gestures.onSwipeLeft?.();
          }
        } else if (absDy > 50) {
          if (deltaY > 0) {
            gestures.onSwipeDown?.();
          } else {
            gestures.onSwipeUp?.();
          }
        }
      }
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('touchend', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      if (longPressTimer) clearTimeout(longPressTimer);
    };
  }, [ref, gestures]);
}
