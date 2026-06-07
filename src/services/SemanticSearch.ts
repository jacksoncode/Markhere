import { MetadataService, type NoteMeta } from './MetadataService';

export interface SearchResult {
  note: NoteMeta;
  score: number;   // 0-1 cosine similarity
  snippet: string; // matching snippet
}

export class SemanticSearch {
  private static embeddings = new Map<string, number[]>();

  /** 使用 Ollama embedding 模型构建索引 */
  static async buildIndex(noteContents: Array<{ path: string; content: string }>): Promise<void> {
    this.embeddings.clear();
    for (const note of noteContents) {
      const emb = await this.getEmbedding(note.content);
      if (emb) this.embeddings.set(note.path, emb);
    }
  }

  /** 语义搜索 */
  static async search(query: string, topK: number = 5): Promise<SearchResult[]> {
    const queryEmb = await this.getEmbedding(query);
    if (!queryEmb) return [];

    const results: SearchResult[] = [];
    const notes = MetadataService.getAll();

    for (const note of notes) {
      const emb = this.embeddings.get(note.path);
      if (!emb) continue;

      const similarity = this.cosineSimilarity(queryEmb, emb);
      if (similarity > 0.3) { // threshold
        results.push({
          note,
          score: Math.round(similarity * 100) / 100,
          snippet: note.title,
        });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  /** 简单关键词回退搜索（无 embedding 模型时） */
  static keywordSearch(query: string, topK: number = 5): SearchResult[] {
    const notes = MetadataService.getAll();
    const terms = query.toLowerCase().split(/\s+/);

    return notes
      .map(note => {
        let score = 0;
        const content = [note.title, note.tags.join(' '), note.category || '', ...Object.values(note.fields)].join(' ').toLowerCase();
        for (const term of terms) {
          if (content.includes(term)) score += 1;
          // Boost title match
          if (note.title.toLowerCase().includes(term)) score += 3;
        }
        return { note, score: Math.min(1, score / (terms.length * 4)), snippet: note.title };
      })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  private static async getEmbedding(text: string): Promise<number[] | null> {
    try {
      const resp = await fetch('http://127.0.0.1:11434/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'nomic-embed-text', prompt: text.slice(0, 2048) }),
      });
      if (!resp.ok) return null;
      const data = await resp.json();
      return data.embedding || null;
    } catch { return null; }
  }

  private static cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
  }
}
