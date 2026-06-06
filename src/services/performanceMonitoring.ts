/**
 * Performance monitoring using Web Vitals
 * Tracks Core Web Vitals and reports to Sentry
 */

import { onCLS, onFCP, onLCP, onTTFB, onINP, Metric } from 'web-vitals';
import * as Sentry from '@sentry/react';

// Performance thresholds (in milliseconds)
const THRESHOLDS = {
  LCP: 2500,  // Largest Contentful Paint
  FID: 100,   // First Input Delay (deprecated, use INP)
  CLS: 0.1,   // Cumulative Layout Shift
  FCP: 1800,  // First Contentful Paint
  TTFB: 800,  // Time to First Byte
  INP: 200,   // Interaction to Next Paint
};

interface PerformanceData {
  metric: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

// Store performance metrics
const performanceMetrics: PerformanceData[] = [];

/**
 * Report metric to console and Sentry
 */
function reportMetric(metric: Metric) {
  const { name, value, rating } = metric;

  const data: PerformanceData = {
    metric: name,
    value: Math.round(value),
    rating,
    timestamp: Date.now(),
  };

  performanceMetrics.push(data);

  // Log in development
  if (import.meta.env.DEV) {
    console.log(`[Performance] ${name}:`, {
      value: `${data.value}ms`,
      rating,
      threshold: THRESHOLDS[name as keyof typeof THRESHOLDS],
    });
  }

  // Report to Sentry in production
  if (import.meta.env.PROD) {
    // Report as custom measurement
    Sentry.setMeasurement(name, value, 'millisecond');

    // Also report as breadcrumb for context
    Sentry.addBreadcrumb({
      category: 'performance',
      message: `${name}: ${data.value}ms`,
      level: rating === 'poor' ? 'warning' : 'info',
      data: {
        value: data.value,
        rating,
      },
    });
  }
}

/**
 * Initialize performance monitoring
 */
export function initPerformanceMonitoring() {
  // Core Web Vitals
  onCLS(reportMetric);
  onLCP(reportMetric);
  onINP(reportMetric); // Replaces FID as of web-vitals v3

  // Additional metrics
  onFCP(reportMetric);
  onTTFB(reportMetric);

  // Track custom app startup time
  if (window.performance) {
    const perfData = window.performance.timing;
    const startupTime = perfData.loadEventEnd - perfData.navigationStart;

    if (startupTime > 0) {
      const startupMetric: PerformanceData = {
        metric: 'APP_STARTUP',
        value: startupTime,
        rating: startupTime < 2000 ? 'good' : startupTime < 4000 ? 'needs-improvement' : 'poor',
        timestamp: Date.now(),
      };

      performanceMetrics.push(startupMetric);

      if (import.meta.env.DEV) {
        console.log('[Performance] App Startup:', `${startupTime}ms`);
      }

      if (import.meta.env.PROD) {
        Sentry.setMeasurement('APP_STARTUP', startupTime, 'millisecond');
      }
    }
  }
}

/**
 * Get all collected performance metrics
 */
export function getPerformanceMetrics(): PerformanceData[] {
  return [...performanceMetrics];
}

/**
 * Get performance summary
 */
export function getPerformanceSummary() {
  const summary = {
    good: 0,
    needsImprovement: 0,
    poor: 0,
    metrics: performanceMetrics,
  };

  performanceMetrics.forEach(({ rating }) => {
    if (rating === 'good') summary.good++;
    else if (rating === 'needs-improvement') summary.needsImprovement++;
    else summary.poor++;
  });

  return summary;
}

/**
 * Track custom performance mark
 */
export function trackPerformanceMark(name: string) {
  if (window.performance) {
    window.performance.mark(name);

    if (import.meta.env.DEV) {
      console.log(`[Performance] Mark: ${name}`);
    }
  }
}

/**
 * Measure time between two performance marks
 */
export function measurePerformance(measureName: string, startMark: string, endMark: string) {
  if (window.performance) {
    try {
      window.performance.measure(measureName, startMark, endMark);
      const measure = window.performance.getEntriesByName(measureName)[0];

      if (measure && import.meta.env.DEV) {
        console.log(`[Performance] ${measureName}:`, `${Math.round(measure.duration)}ms`);
      }

      return measure?.duration || 0;
    } catch (e) {
      console.warn('Failed to measure performance:', e);
      return 0;
    }
  }
  return 0;
}

/**
 * Track file operation performance
 */
export function trackFileOperation(operation: 'open' | 'save' | 'export', duration: number) {
  const metricName = `FILE_${operation.toUpperCase()}`;

  if (import.meta.env.DEV) {
    console.log(`[Performance] ${metricName}:`, `${duration}ms`);
  }

  if (import.meta.env.PROD) {
    Sentry.setMeasurement(metricName, duration, 'millisecond');
  }
}

/**
 * Track editor operation performance
 */
export function trackEditorOperation(operation: string, duration: number) {
  if (import.meta.env.DEV) {
    console.log(`[Performance] EDITOR_${operation.toUpperCase()}:`, `${duration}ms`);
  }

  if (import.meta.env.PROD) {
    Sentry.setMeasurement(`EDITOR_${operation.toUpperCase()}`, duration, 'millisecond');
  }
}
