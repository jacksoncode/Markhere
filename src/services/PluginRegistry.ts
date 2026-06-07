/** 插件清单格式 */
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  icon?: string;
  category: 'editor' | 'theme' | 'collaboration' | 'ai' | 'export' | 'utility';
  tags: string[];
  permissions: string[];
  main: string;
  repo?: string;
  homepage?: string;
  screenshots?: string[];
  rating?: number;
  downloads?: number;
}

export class PluginRegistry {
  static registry: Map<string, PluginManifest> = new Map();
  static installed: Set<string> = new Set(
    JSON.parse(localStorage.getItem('markhere-plugins') || '[]')
  );

  /** 注册插件 */
  static register(manifest: PluginManifest): void {
    this.registry.set(manifest.id, manifest);
  }

  /** 从在线源加载插件列表 */
  static async fetchFromRemote(url: string): Promise<PluginManifest[]> {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const plugins: PluginManifest[] = await res.json();
      plugins.forEach(p => this.register(p));
      return plugins;
    } catch { return []; }
  }

  /** 搜索插件 */
  static search(query: string): PluginManifest[] {
    const q = query.toLowerCase();
    return Array.from(this.registry.values()).filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some(t => t.toLowerCase().includes(q)) ||
      p.author.toLowerCase().includes(q)
    );
  }

  /** 按分类筛选 */
  static byCategory(cat: PluginManifest['category']): PluginManifest[] {
    return Array.from(this.registry.values()).filter(p => p.category === cat);
  }

  /** 获取插件详情 */
  static get(id: string): PluginManifest | undefined {
    return this.registry.get(id);
  }

  /** 安装插件 */
  static install(id: string): void {
    this.installed.add(id);
    localStorage.setItem('markhere-plugins', JSON.stringify(Array.from(this.installed)));
  }

  /** 卸载插件 */
  static uninstall(id: string): void {
    this.installed.delete(id);
    localStorage.setItem('markhere-plugins', JSON.stringify(Array.from(this.installed)));
  }

  /** 是否已安装 */
  static isInstalled(id: string): boolean {
    return this.installed.has(id);
  }

  /** 获取已安装插件列表 */
  static getInstalled(): PluginManifest[] {
    return Array.from(this.installed).map(id => this.registry.get(id)).filter(Boolean) as PluginManifest[];
  }

  /** 获取所有可用插件 */
  static getAll(): PluginManifest[] {
    return Array.from(this.registry.values());
  }

  /** 检查更新 */
  static checkForUpdates(): Array<{ id: string; current: string }> {
    // 简化版本：比较注册表中的版本
    return Array.from(this.installed).map(id => {
      const p = this.registry.get(id);
      return p ? { id, current: p.version } : null;
    }).filter(Boolean) as Array<{ id: string; current: string; latest: string }>;
  }

  /** 沙箱安全校验 */
  static validatePermissions(permissions: string[]): { valid: boolean; blocked: string[] } {
    const ALLOWED = ['fs.read','fs.write','network','clipboard.read','clipboard.write','ui.render','editor.extend'];
    const blocked = permissions.filter(p => !ALLOWED.includes(p));
    return { valid: blocked.length === 0, blocked };
  }

  /** 官方认证 */
  static isOfficial(id: string): boolean {
    return this.get(id)?.author === 'Markhere Team';
  }

  /** 排行榜 */
  static getLeaderboard(sortBy: 'downloads'|'rating'='downloads', limit=10): PluginManifest[] {
    return Array.from(this.registry.values()).sort((a,b)=>(sortBy==='downloads'?(b.downloads||0)-(a.downloads||0):(b.rating||0)-(a.rating||0))).slice(0,limit);
  }

  /** 内置官方插件列表 */
  static loadBuiltin(): void {
    const builtins: PluginManifest[] = [
      { id: 'markhere-export-pptx', name: 'PPTX Exporter', version: '1.0.0', author: 'Markhere Team', description: 'Export documents as PowerPoint slides', category: 'export', tags: ['export', 'pptx', 'presentation'], permissions: ['fs.write'], main: 'export-pptx', rating: 4.5, downloads: 1200 },
      { id: 'markhere-export-latex', name: 'LaTeX Exporter', version: '1.0.0', author: 'Markhere Team', description: 'Export as LaTeX for academic writing', category: 'export', tags: ['export', 'latex', 'academic'], permissions: ['fs.write'], main: 'export-latex', rating: 4.3, downloads: 890 },
      { id: 'markhere-mindmap', name: 'Mind Map Generator', version: '1.0.0', author: 'Markhere Team', description: 'Auto-generate mind maps from headings', category: 'editor', tags: ['mindmap', 'visualization'], permissions: [], main: 'mindmap', rating: 4.7, downloads: 2100 },
      { id: 'markhere-grammar', name: 'Grammar Checker', version: '1.0.0', author: 'Markhere Team', description: 'Advanced grammar and spell check using LanguageTool', category: 'ai', tags: ['grammar', 'spell-check', 'ai'], permissions: ['network'], main: 'grammar', rating: 4.1, downloads: 3400 },
      { id: 'markhere-code-runner', name: 'Code Runner', version: '1.0.0', author: 'Markhere Team', description: 'Execute code blocks directly in the editor', category: 'utility', tags: ['code', 'execute'], permissions: ['shell.run'], main: 'code-runner', rating: 4.8, downloads: 5600 },
    ];
    builtins.forEach(p => this.register(p));
  }
}

// Auto-load builtins
PluginRegistry.loadBuiltin();
