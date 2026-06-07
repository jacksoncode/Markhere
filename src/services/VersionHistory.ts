/**
 * 版本历史管理 — 自动保存 + 手动标记 + diff 对比
 */
import lzstring from 'lz-string';

export interface Version {
  id: string;
  timestamp: number;
  content: string;        // compressed snapshot
  label?: string;         // manual tag
  filePath: string;
  wordCount: number;
}

const STORAGE_KEY = 'markhere-versions';
const MAX_VERSIONS = 50;
const AUTO_SAVE_INTERVAL = 30000; // 30s

export class VersionHistory {
  private static intervalId: ReturnType<typeof setInterval> | null = null;

  /** 开始自动保存 */
  static startAutoSave(getContent: () => string, getPath: () => string | null): void {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => {
      const content = getContent();
      const path = getPath() || 'untitled';
      if (content.trim().length > 0) {
        this.saveSnapshot(path, content);
      }
    }, AUTO_SAVE_INTERVAL);
  }

  /** 停止自动保存 */
  static stopAutoSave(): void {
    if (this.intervalId) { clearInterval(this.intervalId); this.intervalId = null; }
  }

  /** 手动标记版本 */
  static tagVersion(path: string, content: string, label: string): Version {
    return this.saveSnapshot(path, content, label);
  }

  /** 保存快照 */
  private static saveSnapshot(path: string, content: string, label?: string): Version {
    const compressed = lzstring.compressToBase64(content.slice(0, 500000)); // Max 500KB
    const version: Version = {
      id: `v_${Date.now()}`,
      timestamp: Date.now(),
      content: compressed,
      label,
      filePath: path,
      wordCount: content.split(/\s+/).filter(Boolean).length,
    };

    const versions = this.getVersionsFor(path);
    versions.unshift(version);
    if (versions.length > MAX_VERSIONS) versions.length = MAX_VERSIONS;

    localStorage.setItem(`${STORAGE_KEY}_${path}`, JSON.stringify(versions));
    return version;
  }

  /** 获取某文件的所有版本 */
  static getVersionsFor(path: string): Version[] {
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY}_${path}`);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  /** 获取版本内容 */
  static getVersionContent(version: Version): string {
    try {
      return lzstring.decompressFromBase64(version.content) || '';
    } catch { return version.content; }
  }

  /** 计算两个版本的 diff（简化版行 diff）*/
  static diff(v1: string, v2: string): Array<{ type: 'add' | 'remove' | 'same'; text: string }> {
    const lines1 = v1.split('\n');
    const lines2 = v2.split('\n');
    const result: Array<{ type: 'add' | 'remove' | 'same'; text: string }> = [];
    const maxLen = Math.max(lines1.length, lines2.length);

    for (let i = 0; i < maxLen; i++) {
      if (i < lines1.length && i < lines2.length) {
        if (lines1[i] === lines2[i]) {
          result.push({ type: 'same', text: ` ${lines1[i]}` });
        } else {
          if (lines1[i]) result.push({ type: 'remove', text: `- ${lines1[i]}` });
          if (lines2[i]) result.push({ type: 'add', text: `+ ${lines2[i]}` });
        }
      } else if (i < lines1.length) {
        result.push({ type: 'remove', text: `- ${lines1[i]}` });
      } else {
        result.push({ type: 'add', text: `+ ${lines2[i]}` });
      }
    }
    return result;
  }

  /** 还原到指定版本 */
  static restore(version: Version, setContent: (c: string) => void): void {
    const content = this.getVersionContent(version);
    setContent(content);
  }

  /** 清空某文件的版本历史 */
  static clearFor(path: string): void {
    localStorage.removeItem(`${STORAGE_KEY}_${path}`);
  }
}
