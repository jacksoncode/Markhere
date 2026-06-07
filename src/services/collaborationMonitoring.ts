import * as Sentry from '@sentry/react';

export class CollaborationMonitoring {
  private static latencyHistory: number[] = [];
  private static readonly MAX_HISTORY = 50;

  static trackLatency(latency: number) {
    this.latencyHistory.push(latency);
    if (this.latencyHistory.length > this.MAX_HISTORY) {
      this.latencyHistory.shift();
    }

    const avgLatency = this.getAverageLatency();

    if (avgLatency > 1000) {
      console.warn(`⚠️ High collaboration latency: avg ${avgLatency.toFixed(0)}ms`);
    }

    if (avgLatency > 2000) {
      Sentry.addBreadcrumb({
        category: 'collaboration',
        message: `High sync latency: avg ${avgLatency.toFixed(0)}ms`,
        level: 'warning',
      });
    }
  }

  static getAverageLatency(): number {
    if (this.latencyHistory.length === 0) return 0;
    const sum = this.latencyHistory.reduce((a, b) => a + b, 0);
    return sum / this.latencyHistory.length;
  }

  static getP95Latency(): number {
    if (this.latencyHistory.length === 0) return 0;
    const sorted = [...this.latencyHistory].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * 0.95) - 1;
    return sorted[index];
  }

  static getP50Latency(): number {
    if (this.latencyHistory.length === 0) return 0;
    const sorted = [...this.latencyHistory].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * 0.5) - 1;
    return sorted[index];
  }

  static getConnectionQuality(): 'excellent' | 'good' | 'fair' | 'poor' {
    const avg = this.getAverageLatency();
    if (avg < 100) return 'excellent';
    if (avg < 500) return 'good';
    if (avg < 1500) return 'fair';
    return 'poor';
  }

  static reset() {
    this.latencyHistory = [];
  }
}
