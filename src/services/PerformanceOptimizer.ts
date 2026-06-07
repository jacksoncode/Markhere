/**
 * v1.0 性能优化器 — 大文件加载、滚动流畅度、内存管理
 */
import * as Sentry from '@sentry/react';

interface PerformanceSnapshot {
  timestamp: number;
  memoryMB: number;
  fps: number;
  startupMs: number;
  fileLoadMs: number;
}

export class PerformanceOptimizer {
  private static snapshots: PerformanceSnapshot[] = [];
  private static readonly MAX_SNAPSHOTS = 100;
  private static fpsFrames = 0;
  private static fpsLastTime = 0;

  /** 启动性能监控 */
  static start(): void {
    // FPS monitoring
    this.fpsLastTime = performance.now();
    const measureFps = () => {
      this.fpsFrames++;
      const now = performance.now();
      if (now - this.fpsLastTime >= 1000) {
        const fps = Math.round(this.fpsFrames * 1000 / (now - this.fpsLastTime));
        this.fpsFrames = 0;
        this.fpsLastTime = now;

        // Memory snapshot (if available)
        const mem = (performance as any).memory?.usedJSHeapSize;
        const memMB = mem ? Math.round(mem / 1024 / 1024) : 0;

        this.snapshot({ memoryMB: memMB, fps: fps });
        requestAnimationFrame(measureFps);
      } else {
        requestAnimationFrame(measureFps);
      }
    };
    requestAnimationFrame(measureFps);
  }

  /** 记录快照 */
  private static snapshot({memoryMB, fps}: {memoryMB: number; fps: number}): void {
    this.snapshots.push({ timestamp: Date.now(), memoryMB, fps, startupMs: 0, fileLoadMs: 0 });
    if (this.snapshots.length > this.MAX_SNAPSHOTS) this.snapshots.shift();

    // FPS warning
    if (fps < 30 && import.meta.env.PROD) {
      Sentry.addBreadcrumb({ category: 'performance', message: `Low FPS: ${fps}`, level: 'warning' });
    }
    // Memory warning
    if (memoryMB > 400 && import.meta.env.PROD) {
      Sentry.captureMessage(`High memory: ${memoryMB}MB`, 'warning');
    }
  }

  /** 记录文件加载时间 */
  static trackFileLoad(sizeBytes: number, durationMs: number): void {
    if (import.meta.env.PROD) {
      Sentry.setMeasurement('FILE_LOAD_TIME', durationMs, 'millisecond');
    }
    // Large file warning
    if (sizeBytes > 50 * 1024 * 1024 && durationMs > 10000) {
      console.warn(`Slow large file load: ${(sizeBytes/1024/1024).toFixed(0)}MB in ${durationMs}ms`);
    }
  }

  /** 获取统计报告 */
  static getReport(): { avgFps: number; maxMemory: number; minFps: number } {
    if (this.snapshots.length === 0) return { avgFps: 0, maxMemory: 0, minFps: 0 };
    const fpsVals = this.snapshots.map(s => s.fps);
    return {
      avgFps: Math.round(fpsVals.reduce((a,b)=>a+b,0) / fpsVals.length),
      maxMemory: Math.max(...this.snapshots.map(s => s.memoryMB)),
      minFps: Math.min(...fpsVals),
    };
  }

  /** 清除历史 */
  static clear(): void {
    this.snapshots = [];
    this.fpsFrames = 0;
  }
}
