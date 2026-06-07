import { documentTemplates, type DocumentTemplate } from '../data/templates';

export interface CommunityTemplate extends DocumentTemplate {
  author: string;
  downloads: number;
  rating: number;
  repoUrl: string;
  previewUrl?: string;
}

export class TemplateMarketplace {
  private static communityTemplates: CommunityTemplate[] = [];

  /** 从 GitHub 仓库加载社区模板列表 */
  static async fetchFromGitHub(repoUrl: string): Promise<CommunityTemplate[]> {
    try {
      const apiUrl = repoUrl.replace('github.com', 'api.github.com/repos') + '/contents/templates';
      const resp = await fetch(apiUrl);
      if (!resp.ok) return [];
      const files: Array<{ name: string; download_url: string }> = await resp.json();

      const templates: CommunityTemplate[] = [];
      for (const f of files.filter(f => f.name.endsWith('.json'))) {
        const tplResp = await fetch(f.download_url);
        if (tplResp.ok) {
          const tpl = await tplResp.json();
          templates.push({ ...tpl, repoUrl: f.download_url });
        }
      }
      this.communityTemplates = templates;
      return templates;
    } catch { return []; }
  }

  /** 获取全部可用模板（内置 + 社区） */
  static getAll(): (DocumentTemplate | CommunityTemplate)[] {
    return [...documentTemplates, ...this.communityTemplates];
  }

  /** 模板评分 */
  static rateTemplate(id: string, rating: number): void {
    const tpl = this.communityTemplates.find(t => t.id === id);
    if (tpl) tpl.rating = (tpl.rating * (tpl.downloads || 1) + rating) / ((tpl.downloads || 1) + 1);
  }

  /** 记录下载 */
  static recordDownload(id: string): void {
    const tpl = this.communityTemplates.find(t => t.id === id);
    if (tpl) tpl.downloads = (tpl.downloads || 0) + 1;
  }

  /** 搜索模板 */
  static search(query: string): (DocumentTemplate | CommunityTemplate)[] {
    const q = query.toLowerCase();
    return this.getAll().filter(t => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
  }

  /** 按分类筛选 */
  static byCategory(cat: DocumentTemplate['category']): (DocumentTemplate | CommunityTemplate)[] {
    return this.getAll().filter(t => t.category === cat);
  }
}
