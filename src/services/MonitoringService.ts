import { initPerformanceMonitoring } from './performanceMonitoring';
import { WindowsMonitoring } from './windowsMonitoring';
import { ContrastAdjustment } from './contrastAdjustment';

/**
 * 统一监控服务入口
 * 集中管理 Sentry、Web Vitals、Windows 监控和可访问性设置
 */
export class MonitoringService {
  private static initialized = false;

  static init(): void {
    if (this.initialized) return;

    // 1. Web Vitals 性能监控（始终启用）
    initPerformanceMonitoring();

    // 2. Windows 平台专用监控（仅生产环境）
    if (import.meta.env.PROD) {
      WindowsMonitoring.init();
    }

    // 3. 可访问性设置恢复
    ContrastAdjustment.init();

    this.initialized = true;
    console.log('📊 Monitoring service initialized');
  }

  /** 上报业务指标（大文件加载时间、编辑器操作延迟等）*/
  static trackBusinessMetric(name: string, value: number, tags?: Record<string, string>): void {
    // 生产环境接入自定义指标上报
    // 当前通过 console 输出，可替换为 Sentry Metrics 或其他 APM
    console.debug(`[Metric] ${name}: ${value}`, tags || {});
  }
}
