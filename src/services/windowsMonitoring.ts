import * as Sentry from '@sentry/react';
import { invoke } from '@tauri-apps/api/core';

interface WindowsMetrics {
  [key: string]: unknown;
  startupTime: number;
  memoryUsage: number;
  cpuUsage: number;
  crashCount: number;
}

export class WindowsMonitoring {
  private static metrics: WindowsMetrics = {
    startupTime: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    crashCount: 0,
  };

  static init() {
    if (!this.isWindows()) return;

    console.log('🪟 Windows monitoring initialized');

    // 追踪启动时间
    this.trackStartupTime();

    // 监控窗口事件
    this.monitorWindowEvents();

    // 监控系统资源
    this.monitorSystemResources();

    // 定期上报
    this.startPeriodicReporting();
  }

  private static isWindows(): boolean {
    return navigator.userAgent.includes('Windows');
  }

  private static trackStartupTime() {
    const startTime = performance.now();

    window.addEventListener('load', () => {
      this.metrics.startupTime = performance.now() - startTime;

      Sentry.addBreadcrumb({
        category: 'startup',
        message: `Windows app started in ${this.metrics.startupTime.toFixed(0)}ms`,
        level: this.metrics.startupTime > 2000 ? 'warning' : 'info',
      });

      // 目标：< 1500ms
      if (this.metrics.startupTime > 2000) {
        Sentry.captureMessage('Slow startup on Windows', 'warning');
      }
    });
  }

  private static monitorWindowEvents() {
    const events = ['focus', 'blur', 'resize', 'beforeunload'];

    events.forEach((eventName) => {
      window.addEventListener(eventName, () => {
        Sentry.addBreadcrumb({
          category: 'window',
          message: `Window ${eventName}`,
          level: 'info',
        });
      });
    });

    // 监控未捕获的异常
    window.addEventListener('error', (event) => {
      this.metrics.crashCount++;

      Sentry.captureException(event.error, {
        tags: {
          platform: 'windows',
          event_type: 'unhandled_error',
        },
        contexts: {
          metrics: this.metrics,
        },
      });
    });

    // 监控未处理的 Promise 拒绝
    window.addEventListener('unhandledrejection', (event) => {
      this.metrics.crashCount++;

      Sentry.captureException(event.reason, {
        tags: {
          platform: 'windows',
          event_type: 'unhandled_rejection',
        },
        contexts: {
          metrics: this.metrics,
        },
      });
    });
  }

  private static async monitorSystemResources() {
    setInterval(async () => {
      try {
        // 调用 Tauri 命令获取系统信息
        const memory = await invoke<number>('get_memory_usage');
        const cpu = await invoke<number>('get_cpu_usage');

        this.metrics.memoryUsage = memory;
        this.metrics.cpuUsage = cpu;

        // 内存告警：> 500MB
        if (memory > 500 * 1024 * 1024) {
          Sentry.captureMessage(
            `High memory usage: ${(memory / 1024 / 1024).toFixed(0)}MB`,
            'warning'
          );
        }

        // CPU 告警：空闲时 > 10%
        if (cpu > 10 && document.hidden) {
          Sentry.captureMessage(
            `High CPU usage while idle: ${cpu.toFixed(1)}%`,
            'warning'
          );
        }
      } catch (error) {
        console.warn('Failed to get system metrics:', error);
      }
    }, 30000); // 每 30 秒
  }

  private static startPeriodicReporting() {
    setInterval(() => {
      Sentry.addBreadcrumb({
        category: 'metrics',
        message: 'Windows metrics snapshot',
        level: 'info',
        data: this.metrics,
      });
    }, 5 * 60 * 1000); // 每 5 分钟
  }

  static getMetrics(): WindowsMetrics {
    return { ...this.metrics };
  }
}
