import { useState, useEffect, useRef, useCallback } from 'react';
import type { Editor } from '@tiptap/core';
import { getDocumentChunks, countTopLevelNodes } from './chunkLoader';
import type { DocumentChunk } from './chunkLoader';

// ---------------------------------------------------------------------------
// Virtual-scroll configuration
// ---------------------------------------------------------------------------

export interface VirtualScrollConfig {
  /** Maximum number of top-level block nodes per chunk (default 25). */
  chunkSize: number;
  /** Number of chunks above and below the viewport to keep active (default 1). */
  overscan: number;
  /** Master switch – when false the hook is a no-op. */
  enabled: boolean;
  /** Minimum number of top-level nodes before virtual scrolling activates (default 50). */
  threshold: number;
}

/** Default configuration values. */
export const DEFAULT_VIRTUAL_SCROLL_CONFIG: VirtualScrollConfig = {
  chunkSize: 25,
  overscan: 1,
  enabled: true,
  threshold: 50,
};

// ---------------------------------------------------------------------------
// Hook return type
// ---------------------------------------------------------------------------

export interface VirtualScrollState {
  /** First and last chunk indices currently considered visible. */
  visibleRange: { start: number; end: number };
  /** Total number of chunks in the document. */
  totalChunks: number;
  /** Whether virtual scrolling is actively engaged. */
  isEnabled: boolean;
  /** Reference to the scroll container DOM element (for CSS styling). */
  scrollContainerRef: React.RefCallback<HTMLElement>;
}

// ---------------------------------------------------------------------------
// useVirtualScroll
// ---------------------------------------------------------------------------

/**
 * React hook that tracks the editor's scroll position and determines which
 * document chunks are currently visible.
 *
 * Combine with CSS `content-visibility: auto` on top-level editor nodes for
 * browser-native virtual-scrolling behaviour.
 */
export function useVirtualScroll(
  editor: Editor | null,
  config: VirtualScrollConfig = DEFAULT_VIRTUAL_SCROLL_CONFIG,
): VirtualScrollState {
  // ---- chunk cache (updated on doc change) ---------------------------------
  const chunksRef = useRef<DocumentChunk[]>([]);
  const [totalChunks, setTotalChunks] = useState(0);
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    if (!editor || editor.isDestroyed) {
      chunksRef.current = [];
      setTotalChunks(0);
      setIsEnabled(false);
      return;
    }

    const recompute = (): void => {
      if (editor.isDestroyed) return;
      const doc = editor.state.doc;
      const topLevelCount = countTopLevelNodes(doc);
      chunksRef.current = getDocumentChunks(doc, config.chunkSize);
      setTotalChunks(chunksRef.current.length);
      setIsEnabled(config.enabled && topLevelCount > config.threshold);
    };

    recompute();
    editor.on('update', recompute);
    return () => {
      editor.off('update', recompute);
    };
  }, [editor, config.chunkSize, config.enabled, config.threshold]);

  // ---- visible range -------------------------------------------------------
  const [visibleStart, setVisibleStart] = useState(0);
  const [visibleEnd, setVisibleEnd] = useState(0);
  const scrollContainerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!editor || editor.isDestroyed || !config.enabled) return;

    const container = scrollContainerRef.current ?? editor.view.dom.parentElement;
    if (!container) return;

    let rafId = 0;

    const onScroll = (): void => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (editor.isDestroyed) return;

        const chunks = chunksRef.current;
        if (chunks.length === 0) return;

        const containerRect = container.getBoundingClientRect();
        const margin = 80; // px cushion so headings near the edge are included

        // Map viewport edges to document positions.
        const topResult = editor.view.posAtCoords({
          left: containerRect.left + 50,
          top: containerRect.top + margin,
        });
        const bottomResult = editor.view.posAtCoords({
          left: containerRect.left + 50,
          top: containerRect.bottom - margin,
        });

        const topPos = topResult?.pos ?? 0;
        const bottomPos = bottomResult?.pos ?? editor.state.doc.content.size;

        // Linear scan — fast enough for hundreds of chunks.
        let start = 0;
        let end = chunks.length - 1;

        for (let i = 0; i < chunks.length; i++) {
          if (chunks[i].endPos > topPos) {
            start = Math.max(0, i - config.overscan);
            break;
          }
        }
        for (let i = chunks.length - 1; i >= 0; i--) {
          if (chunks[i].startPos < bottomPos) {
            end = Math.min(chunks.length - 1, i + config.overscan);
            break;
          }
        }

        setVisibleStart(start);
        setVisibleEnd(end);
      });
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    // Fire once so the initial viewport is populated.
    onScroll();

    return () => {
      cancelAnimationFrame(rafId);
      container.removeEventListener('scroll', onScroll);
    };
  }, [editor, config.enabled, config.overscan, config.threshold]);

  // ---- scroll container callback ref ---------------------------------------
  const setScrollContainerRef = useCallback((node: HTMLElement | null) => {
    scrollContainerRef.current = node;
  }, []);

  const visibleRange = isEnabled
    ? { start: visibleStart, end: visibleEnd }
    : { start: 0, end: totalChunks - 1 };

  return {
    visibleRange,
    totalChunks,
    isEnabled,
    scrollContainerRef: setScrollContainerRef,
  };
}

// ---------------------------------------------------------------------------
// Deferred render helper (kept from original file)
// ---------------------------------------------------------------------------

interface DeferredRenderOptions {
  priority?: 'high' | 'medium' | 'low';
  delay?: number;
}

export function useDeferredRender(
  shouldRender: boolean,
  options: DeferredRenderOptions = {},
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

// ---------------------------------------------------------------------------
// Render scheduler (kept from original file)
// ---------------------------------------------------------------------------

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
