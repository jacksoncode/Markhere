import { useEffect, useRef } from 'react';
import { GestureService, GestureState } from '../services/GestureService';

export function useGestures(
  ref: React.RefObject<HTMLElement>,
  onPinch?: (state: GestureState) => void,
  onSwipe?: (state: GestureState) => void,
  onRotate?: (state: GestureState) => void,
  onZoom?: (state: GestureState) => void
) {
  const serviceRef = useRef<GestureService | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    const service = new GestureService();
    service.attach(ref.current);
    
    if (onPinch) service.on('pinch', onPinch);
    if (onSwipe) service.on('swipe', onSwipe);
    if (onRotate) service.on('rotate', onRotate);
    if (onZoom) service.on('zoom', onZoom);
    
    serviceRef.current = service;

    return () => {
      service.detach();
    };
  }, [ref.current, onPinch, onSwipe, onRotate, onZoom]);
}