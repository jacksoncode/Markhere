export class MermaidCache {
  private static cache = new Map<string, string>();
  private static readonly MAX_CACHE_SIZE = 100;

  static getCacheKey(code: string, theme: string): string {
    return `${theme}:${this.normalizeCode(code)}`;
  }

  static get(code: string, theme: string): string | null {
    const key = this.getCacheKey(code, theme);
    return this.cache.get(key) || null;
  }

  static set(code: string, theme: string, svg: string): void {
    const key = this.getCacheKey(code, theme);

    // LRU 清理
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, svg);
  }

  static clear(): void {
    this.cache.clear();
  }

  static getStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
      hitRate: 0, // Would need tracking
    };
  }

  private static normalizeCode(code: string): string {
    return code.replace(/\s+/g, ' ').trim();
  }
}
