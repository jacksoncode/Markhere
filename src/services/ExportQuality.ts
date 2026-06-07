export interface ExportQualityOptions {
  compressImages: boolean;
  embedFonts: boolean;
  imageQuality: number; // 0-100
  pageSize: 'a4' | 'letter' | 'slide';
  marginTop: number;
  marginBottom: number;
}

export interface ExportHistoryEntry {
  id: string;
  format: string;
  path: string;
  timestamp: number;
  title: string;
  fileSize: number;
}

export class ExportQuality {
  static defaults: ExportQualityOptions = {
    compressImages: true, embedFonts: true, imageQuality: 80, pageSize: 'a4', marginTop: 25, marginBottom: 25,
  };

  static async getHistory(): Promise<ExportHistoryEntry[]> {
    try {
      const raw = localStorage.getItem('markhere-export-history');
      if (!raw) return [];

      // Remove entries older than 30 days
      const entries: ExportHistoryEntry[] = JSON.parse(raw);
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const filtered = entries.filter(e => e.timestamp > cutoff);

      if (filtered.length !== entries.length) {
        localStorage.setItem('markhere-export-history', JSON.stringify(filtered));
      }
      return filtered.reverse();
    } catch { return []; }
  }

  static async addToHistory(entry: Omit<ExportHistoryEntry, 'id'|'timestamp'>) {
    const history = await this.getHistory();
    const e: ExportHistoryEntry = { ...entry, id: `exp_${Date.now()}`, timestamp: Date.now() };
    history.unshift(e);
    localStorage.setItem('markhere-export-history', JSON.stringify(history.slice(0, 50)));
  }

  static async getTemplateList(): Promise<Array<{id:string;name:string;description:string;icon:string}>> {
    return [
      { id:'academic', name:'Academic Paper', description:'LaTeX template for research papers', icon:'📐' },
      { id:'presentation', name:'Presentation', description:'Reveal.js slide deck template', icon:'📊' },
      { id:'resume', name:'Resume', description:'Clean one-page CV template', icon:'📄' },
      { id:'report', name:'Business Report', description:'Formal report with executive summary', icon:'📋' },
      { id:'blog', name:'Blog Post', description:'Web-optimized article template', icon:'✍️' },
    ];
  }

  static async clearHistory(): Promise<void> {
    localStorage.removeItem('markhere-export-history');
  }
}
