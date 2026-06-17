export interface GestureState {
  scale: number;
  rotation: number;
  deltaX: number;
  deltaY: number;
}

export type GestureCallback = (state: GestureState) => void;

export class GestureService {
  private element: HTMLElement | null = null;
  private callbacks: Map<string, GestureCallback> = new Map();
  private state: GestureState = {
    scale: 1,
    rotation: 0,
    deltaX: 0,
    deltaY: 0,
  };
  
  private initialDistance = 0;
  private initialAngle = 0;
  private lastX = 0;
  private lastY = 0;

  attach(element: HTMLElement): void {
    this.element = element;
    
    this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    this.element.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
    
    this.element.addEventListener('gesturestart', this.handleGestureStart.bind(this));
    this.element.addEventListener('gesturechange', this.handleGestureChange.bind(this));
    this.element.addEventListener('gestureend', this.handleGestureEnd.bind(this));
  }

  detach(): void {
    if (!this.element) return;
    
    this.element.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    this.element.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    this.element.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    this.element.removeEventListener('wheel', this.handleWheel.bind(this));
    
    this.element.removeEventListener('gesturestart', this.handleGestureStart.bind(this));
    this.element.removeEventListener('gesturechange', this.handleGestureChange.bind(this));
    this.element.removeEventListener('gestureend', this.handleGestureEnd.bind(this));
    
    this.element = null;
  }

  on(event: 'pinch' | 'swipe' | 'rotate' | 'zoom', callback: GestureCallback): void {
    this.callbacks.set(event, callback);
  }

  off(event: string): void {
    this.callbacks.delete(event);
  }

  private handleTouchStart(e: TouchEvent): void {
    if (e.touches.length === 2) {
      this.initialDistance = this.getDistance(e.touches[0], e.touches[1]);
      this.initialAngle = this.getAngle(e.touches[0], e.touches[1]);
      this.state.scale = 1;
      this.state.rotation = 0;
    } else if (e.touches.length === 1) {
      this.lastX = e.touches[0].clientX;
      this.lastY = e.touches[0].clientY;
      this.state.deltaX = 0;
      this.state.deltaY = 0;
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    if (e.touches.length === 2) {
      const currentDistance = this.getDistance(e.touches[0], e.touches[1]);
      const currentAngle = this.getAngle(e.touches[0], e.touches[1]);
      
      this.state.scale = currentDistance / this.initialDistance;
      this.state.rotation = currentAngle - this.initialAngle;
      
      this.emit('pinch', this.state);
      this.emit('rotate', this.state);
    } else if (e.touches.length === 1) {
      this.state.deltaX = e.touches[0].clientX - this.lastX;
      this.state.deltaY = e.touches[0].clientY - this.lastY;
      
      this.lastX = e.touches[0].clientX;
      this.lastY = e.touches[0].clientY;
      
      this.emit('swipe', this.state);
    }
  }

  private handleTouchEnd(_e: TouchEvent): void {
    this.state = {
      scale: 1,
      rotation: 0,
      deltaX: 0,
      deltaY: 0,
    };
  }

  private handleWheel(e: WheelEvent): void {
    if (e.ctrlKey) {
      e.preventDefault();
      this.state.scale = 1 - (e.deltaY / 1000);
      this.emit('zoom', this.state);
    }
  }

  private handleGestureStart(e: Event): void {
    const gestureEvent = e as any;
    this.state.scale = gestureEvent.scale;
    this.state.rotation = gestureEvent.rotation;
  }

  private handleGestureChange(e: Event): void {
    const gestureEvent = e as any;
    this.state.scale = gestureEvent.scale;
    this.state.rotation = gestureEvent.rotation;
    
    this.emit('pinch', this.state);
    this.emit('rotate', this.state);
  }

  private handleGestureEnd(_e: Event): void {
    this.state.scale = 1;
    this.state.rotation = 0;
  }

  private getDistance(t1: Touch, t2: Touch): number {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private getAngle(t1: Touch, t2: Touch): number {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.atan2(dy, dx) * (180 / Math.PI);
  }

  private emit(event: string, state: GestureState): void {
    const callback = this.callbacks.get(event);
    if (callback) {
      callback(state);
    }
  }
}