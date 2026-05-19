import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { renderScheduler, useDeferredRender, DEFAULT_VIRTUAL_SCROLL_CONFIG } from './virtualScroll';

// ---------------------------------------------------------------------------
// RenderScheduler tests
// ---------------------------------------------------------------------------

describe('RenderScheduler', () => {
  let pendingFrames: Array<() => void>;

  beforeEach(() => {
    pendingFrames = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback): number => {
      const wrapped = () => {
        cb(0);
      };
      pendingFrames.push(wrapped);
      return pendingFrames.length;
    });

    // Cancel any leftover items from the singleton
    // We use unique IDs per test to avoid cross-test interference
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function processOneFrame(): void {
    const frame = pendingFrames.shift();
    if (frame) frame();
  }

  function processAllFrames(): void {
    while (pendingFrames.length > 0) {
      processOneFrame();
    }
  }

  it('schedule adds tasks and processes them in priority order', () => {
    const calls: string[] = [];

    renderScheduler.schedule('low', () => calls.push('low'), 0);
    renderScheduler.schedule('high', () => calls.push('high'), 10);
    renderScheduler.schedule('medium', () => calls.push('medium'), 5);

    // schedule only triggers processQueue when isProcessing is false
    // So the first schedule starts processing, subsequent ones just add to queue
    processAllFrames();

    // High priority (10) should be processed first, then medium (5), then low (0)
    expect(calls).toEqual(['high', 'medium', 'low']);
  });

  it('cancel removes a specific task before it is processed', () => {
    const calls: string[] = [];

    renderScheduler.schedule('remove-me', () => calls.push('removed'), 0);
    renderScheduler.cancel('remove-me');

    // Process whatever frames remain
    processAllFrames();

    expect(calls).not.toContain('removed');
  });

  it('cancel on non-existent ID does not throw', () => {
    expect(() => renderScheduler.cancel('nonexistent-id')).not.toThrow();
  });

  it('schedule with duplicate ID replaces existing item', () => {
    const calls: string[] = [];

    renderScheduler.schedule('dup', () => calls.push('first'), 0);
    // Replace with new render function
    renderScheduler.schedule('dup', () => calls.push('second'), 0);

    processAllFrames();

    // Only the second callback should fire
    expect(calls).toEqual(['second']);
  });

  it('schedule does not throw with default priority', () => {
    expect(() => {
      renderScheduler.schedule('test-default', () => {
        // empty
      });
    }).not.toThrow();

    processAllFrames();
  });
});

// ---------------------------------------------------------------------------
// useDeferredRender tests
// ---------------------------------------------------------------------------

describe('useDeferredRender', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns false when shouldRender is false', () => {
    const { result } = renderHook(() => useDeferredRender(false));

    expect(result.current).toBe(false);
  });

  it('returns false initially when shouldRender is true', () => {
    const { result } = renderHook(() => useDeferredRender(true, { delay: 100 }));

    expect(result.current).toBe(false);
  });

  it('returns true after delay when shouldRender is true', () => {
    const { result } = renderHook(() => useDeferredRender(true, { delay: 100 }));

    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBe(true);
  });

  it('returns false when shouldRender transitions from true to false', () => {
    const { result, rerender } = renderHook(
      ({ shouldRender }) => useDeferredRender(shouldRender, { delay: 100 }),
      { initialProps: { shouldRender: true } }
    );

    expect(result.current).toBe(false);

    // Rerender with shouldRender=false before timer fires
    rerender({ shouldRender: false });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBe(false);
  });

  it('uses default delay of 100ms when no options provided', () => {
    const { result } = renderHook(() => useDeferredRender(true));

    expect(result.current).toBe(false);

    // Timer hasn't fired yet at 50ms
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(result.current).toBe(false);

    // After default 100ms
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(result.current).toBe(true);
  });

  it('uses custom delay', () => {
    const { result } = renderHook(() => useDeferredRender(true, { delay: 200 }));

    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(199);
    });
    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// DEFAULT_VIRTUAL_SCROLL_CONFIG tests
// ---------------------------------------------------------------------------

describe('DEFAULT_VIRTUAL_SCROLL_CONFIG', () => {
  it('has all required fields', () => {
    expect(DEFAULT_VIRTUAL_SCROLL_CONFIG).toHaveProperty('chunkSize');
    expect(DEFAULT_VIRTUAL_SCROLL_CONFIG).toHaveProperty('overscan');
    expect(DEFAULT_VIRTUAL_SCROLL_CONFIG).toHaveProperty('enabled');
    expect(DEFAULT_VIRTUAL_SCROLL_CONFIG).toHaveProperty('threshold');
  });

  it('has valid default values', () => {
    expect(DEFAULT_VIRTUAL_SCROLL_CONFIG.chunkSize).toBe(25);
    expect(DEFAULT_VIRTUAL_SCROLL_CONFIG.overscan).toBe(1);
    expect(DEFAULT_VIRTUAL_SCROLL_CONFIG.enabled).toBe(true);
    expect(DEFAULT_VIRTUAL_SCROLL_CONFIG.threshold).toBe(50);
  });

  it('all fields are of correct types', () => {
    expect(typeof DEFAULT_VIRTUAL_SCROLL_CONFIG.chunkSize).toBe('number');
    expect(typeof DEFAULT_VIRTUAL_SCROLL_CONFIG.overscan).toBe('number');
    expect(typeof DEFAULT_VIRTUAL_SCROLL_CONFIG.enabled).toBe('boolean');
    expect(typeof DEFAULT_VIRTUAL_SCROLL_CONFIG.threshold).toBe('number');
  });
});
