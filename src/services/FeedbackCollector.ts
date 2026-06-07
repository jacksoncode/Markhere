export interface FeedbackReport {
  id: string;
  type: 'bug' | 'performance' | 'ux' | 'feature';
  description: string;
  email?: string;
  systemInfo: { os: string; version: string; memory: number; cpu: string };
  stepsToReproduce?: string;
  editorState?: { fileSize: number; contentLength: number; extensions: string[] };
  timestamp: number;
}

export class FeedbackCollector {
  private static readonly STORAGE_KEY = 'markhere-feedback';
  private static readonly API_URL = 'https://api.github.com/repos/jacksoncode/Markhere/issues';

  /** 收集系统信息 */
  static getSystemInfo(): FeedbackReport['systemInfo'] {
    const nav = navigator as any;
    return {
      os: nav.userAgentData?.platform || nav.platform || 'unknown',
      version: nav.userAgent || 'unknown',
      memory: nav.deviceMemory || 0,
      cpu: nav.hardwareConcurrency || 0,
    };
  }

  /** 提交反馈 */
  static async submit(report: Omit<FeedbackReport, 'id' | 'timestamp' | 'systemInfo'>): Promise<boolean> {
    const full: FeedbackReport = {
      ...report,
      id: `fb_${Date.now()}`,
      timestamp: Date.now(),
      systemInfo: this.getSystemInfo(),
    };

    // 本地存储
    const existing = this.getLocalFeedbacks();
    existing.push(full);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(existing.slice(-20)));

    // GitHub Issue（如果配置了 token）
    const token = localStorage.getItem('markhere-gh-token');
    if (token) {
      try {
        const resp = await fetch(this.API_URL, {
          method: 'POST',
          headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `[${report.type}] ${report.description.slice(0, 80)}`,
            body: `**类型**: ${report.type}\n**描述**: ${report.description}\n**系统**: ${JSON.stringify(full.systemInfo)}\n${report.stepsToReproduce ? `**复现步骤**: ${report.stepsToReproduce}` : ''}`,
            labels: [report.type],
          }),
        });
        return resp.ok;
      } catch { /* offline */ }
    }
    return true; // at least saved locally
  }

  static getLocalFeedbacks(): FeedbackReport[] {
    try { return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]'); } catch { return []; }
  }

  static clear(): void { localStorage.removeItem(this.STORAGE_KEY); }
}
