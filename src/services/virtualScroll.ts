import { useState, useEffect, useRef, useCallback } from 'react';

interface VirtualScrollOptions {
  itemCount: number;
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

interface VirtualScrollResult {
  visibleStartIndex: number;
  visibleEndIndex: number;
  visibleItems: number[];
  containerStyle: { height: string };
  contentStyle: { height: string; transform: string };
  handleScroll: (event: React.UIEvent<HTMLElement>) => void;
}

export function useVirtualScroll(options: VirtualScrollOptions): VirtualScrollResult {
  const { itemCount, itemHeight, containerHeight, overscan = 3 } = options;
  
  const [scrollTop, setScrollTop] = useState(0);
  const scrollTopRef = useRef(0);
  
  const totalHeight = itemCount * itemHeight;
  
  const visibleStartIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleEndIndex = Math.min(
    itemCount - 1,
    Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
  );
  
  const visibleItems = [];
  for (let i = visibleStartIndex; i <= visibleEndIndex; i++) {
    visibleItems.push(i);
  }
  
  const handleScroll = useCallback((event: React.UIEvent<HTMLElement>) => {
    const target = event.currentTarget;
    scrollTopRef.current = target.scrollTop;
    setScrollTop(target.scrollTop);
  }, []);
  
  const containerStyle = {
    height: `${containerHeight}px`,
  };
  
  const contentStyle = {
    height: `${totalHeight}px`,
    transform: `translateY(${visibleStartIndex * itemHeight}px)`,
  };
  
  return {
    visibleStartIndex,
    visibleEndIndex,
    visibleItems,
    containerStyle,
    contentStyle,
    handleScroll,
  };
}

interface DeferredRenderOptions {
  priority?: 'high' | 'medium' | 'low';
  delay?: number;
}

export function useDeferredRender(
  shouldRender: boolean,
  options: DeferredRenderOptions = {}
): boolean {
  const { delay = 100 } = options;
  const [isRendered, setIsRendered] = useState(false);
  
  useEffect(() => {
    if (!shouldRender) {
      setIsRendered(false);
      return;
    }
    
    const timeoutId = setTimeout(() => {
      setIsRendered(true);
    }, delay);
    
    return () => clearTimeout(timeoutId);
  }, [shouldRender, delay]);
  
  return isRendered;
}

interface RenderQueueItem {
  id: string;
  render: () => void;
  priority: number;
}

class RenderScheduler {
  private queue: RenderQueueItem[] = [];
  private isProcessing = false;
  
  schedule(id: string, render: () => void, priority: number = 0): void {
    const existingIndex = this.queue.findIndex((item) => item.id === id);
    
    if (existingIndex >= 0) {
      this.queue[existingIndex] = { id, render, priority };
    } else {
      this.queue.push({ id, render, priority });
    }
    
    this.queue.sort((a, b) => b.priority - a.priority);
    
    if (!this.isProcessing) {
      this.processQueue();
    }
  }
  
  private processQueue(): void {
    this.isProcessing = true;
    
    requestAnimationFrame(() => {
      if (this.queue.length === 0) {
        this.isProcessing = false;
        return;
      }
      
      const item = this.queue.shift();
      if (item) {
        item.render();
      }
      
      if (this.queue.length > 0) {
        this.processQueue();
      } else {
        this.isProcessing = false;
      }
    });
  }
  
  cancel(id: string): void {
    const index = this.queue.findIndex((item) => item.id === id);
    if (index >= 0) {
      this.queue.splice(index, 1);
    }
  }
}

export const renderScheduler = new RenderScheduler();