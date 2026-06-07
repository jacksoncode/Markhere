/**
 * 元数据索引服务 — 扫描笔记 YAML frontmatter，构建可查询索引。
 * 这是 Database 和 Dataview 的共享基础。
 */
import { invoke } from '@tauri-apps/api/core';

export interface NoteMeta {
  path: string;
  title: string;
  tags: string[];
  created: string | null;
  updated: string | null;
  category: string | null;
  status: string | null;
  fields: Record<string, unknown>;
}

export interface IndexStats {
  totalNotes: number;
  lastScan: number | null;
  scanDuration: number;
}

export class MetadataService {
  private static index: Map<string, NoteMeta> = new Map();
  private static stats: IndexStats = { totalNotes: 0, lastScan: null, scanDuration: 0 };
  private static indexing = false;

  /** 扫描一个目录下所有 .md 文件，解析 frontmatter */
  static async scanDirectory(dirPath: string): Promise<NoteMeta[]> {
    if (this.indexing) return Array.from(this.index.values());
    this.indexing = true;
    const start = performance.now();

    try {
      // 通过 Tauri 遍历文件系统获取 .md 文件列表
      const files = await invoke<string[]>('list_markdown_files', { dirPath });
      const results: NoteMeta[] = [];

      for (const filePath of files) {
        const content = await invoke<string>('read_file', { path: filePath });
        const meta = this.parseFrontmatter(filePath, content);
        this.index.set(filePath, meta);
        results.push(meta);
      }

      this.stats = {
        totalNotes: results.length,
        lastScan: Date.now(),
        scanDuration: performance.now() - start,
      };

      return results;
    } finally {
      this.indexing = false;
    }
  }

  /** 更新单条笔记索引（编辑器保存时调用） */
  static indexNote(path: string, content: string): void {
    const meta = this.parseFrontmatter(path, content);
    this.index.set(path, meta);
  }

  /** 从索引中移除笔记 */
  static removeNote(path: string): void {
    this.index.delete(path);
  }

  /** 按标签查询 */
  static queryByTag(tag: string): NoteMeta[] {
    return Array.from(this.index.values()).filter(m => m.tags.includes(tag));
  }

  /** 按分类查询 */
  static queryByCategory(category: string): NoteMeta[] {
    return Array.from(this.index.values()).filter(m => m.category === category);
  }

  /** 获取全部索引 */
  static getAll(): NoteMeta[] {
    return Array.from(this.index.values());
  }

  /** 获取索引统计 */
  static getStats(): IndexStats {
    return { ...this.stats, totalNotes: this.index.size };
  }

  /** 清空索引 */
  static clear(): void {
    this.index.clear();
    this.stats = { totalNotes: 0, lastScan: null, scanDuration: 0 };
  }

  // ---- 内部解析 ----

  private static parseFrontmatter(path: string, markdown: string): NoteMeta {
    const fm = this.extractYaml(markdown);
    const fileName = path.split('/').pop()?.replace(/\.md$/, '') || 'Untitled';

    const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);

    return {
      path,
      title: str(fm.title) || fileName,
      tags: this.normalizeTags(fm.tags),
      created: str(fm.created) || str(fm.date),
      updated: str(fm.updated) || str(fm.modified),
      category: str(fm.category),
      status: str(fm.status),
      fields: fm,
    };
  }

  private static extractYaml(md: string): Record<string, unknown> {
    const match = md.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return {};

    const yaml = match[1];
    const result: Record<string, unknown> = {};

    for (const line of yaml.split('\n')) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;

      const key = line.slice(0, colonIdx).trim();
      let value: unknown = line.slice(colonIdx + 1).trim();

      // 去除引号
      if (typeof value === 'string') {
        value = value.replace(/^["']|["']$/g, '');
      }

      // 解析列表
      if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
        value = value.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
      }

      result[key] = value;
    }

    return result;
  }

  private static normalizeTags(tags: unknown): string[] {
    if (Array.isArray(tags)) return tags.map(String);
    if (typeof tags === 'string') return tags.split(/[,，]/).map(s => s.trim()).filter(Boolean);
    return [];
  }
}
