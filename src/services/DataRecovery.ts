/**
 * v1.0 数据恢复 — 断电保护、崩溃恢复、备份校验
 */

export interface RecoverySnapshot {
  id: string;
  content: string;
  path: string | null;
  timestamp: number;
  checksum: string;
}

const RECOVERY_KEY = 'markhere-recovery-snapshot';
const BACKUP_KEY = 'markhere-backup-snapshots';
const MAX_BACKUPS = 5;

export class DataRecovery {
  /** 保存紧急快照（每次 keystroke 节流后调用） */
  static saveSnapshot(content: string, path: string | null): void {
    if (!content.trim()) return;
    const snapshot: RecoverySnapshot = {
      id: `rec_${Date.now()}`,
      content: content.slice(0, 200000), // max 200KB
      path,
      timestamp: Date.now(),
      checksum: this.checksum(content),
    };
    localStorage.setItem(RECOVERY_KEY, JSON.stringify(snapshot));

    // 同时写入备份队列
    this.pushBackup(snapshot);
  }

  /** 获取紧急快照 */
  static getSnapshot(): RecoverySnapshot | null {
    try {
      const raw = localStorage.getItem(RECOVERY_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  /** 从崩溃中恢复 */
  static recover(checkCurrent: (content: string) => boolean): RecoverySnapshot | null {
    const snap = this.getSnapshot();
    if (!snap) return null;

    // 校验完整性
    const calc = this.checksum(snap.content);
    if (calc !== snap.checksum) {
      console.warn('Recovery checksum mismatch — snapshot corrupted');
      return null;
    }

    // 如果当前编辑器已有内容，不需要恢复
    if (checkCurrent(snap.content)) return null;

    // 清理快照（恢复成功）
    localStorage.removeItem(RECOVERY_KEY);
    return snap;
  }

  /** 双重备份（本地 JSON 堆栈） */
  private static pushBackup(snapshot: RecoverySnapshot): void {
    try {
      const raw = localStorage.getItem(BACKUP_KEY);
      const backups: RecoverySnapshot[] = raw ? JSON.parse(raw) : [];
      backups.push(snapshot);
      if (backups.length > MAX_BACKUPS) backups.shift();
      localStorage.setItem(BACKUP_KEY, JSON.stringify(backups));
    } catch { /* storage full — skip */ }
  }

  /** 获取备份列表 */
  static getBackups(): RecoverySnapshot[] {
    try {
      const raw = localStorage.getItem(BACKUP_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  /** 清除所有恢复数据 */
  static clear(): void {
    localStorage.removeItem(RECOVERY_KEY);
    localStorage.removeItem(BACKUP_KEY);
  }

  /** 简单校验和 */
  private static checksum(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash |= 0; // 32-bit int
    }
    return hash.toString(16);
  }
}
