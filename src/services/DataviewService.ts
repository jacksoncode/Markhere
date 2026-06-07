import { MetadataService, type NoteMeta } from './MetadataService';

/** Dataview 查询结果 */
export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  total: number;
  elapsed: number;
  error?: string;
}

/** 简化的 SQL-like 查询解析器 */
export class DataviewService {
  /** 执行查询 */
  static execute(query: string, notes: NoteMeta[]): QueryResult {
    const start = performance.now();

    try {
      const tokens = this.tokenize(query);
      const selectCols = tokens.select || ['title', 'tags', 'created'];
      let rows: NoteMeta[] = [...notes];

      // FROM (ignore — we query all notes; syntax kept for familiarity)
      // WHERE
      if (tokens.where) {
        rows = this.applyWhere(rows, tokens.where);
      }
      // SORT
      if (tokens.sort) {
        rows = this.applySort(rows, tokens.sort);
      }
      // LIMIT
      if (tokens.limit) {
        rows = rows.slice(0, tokens.limit);
      }

      return {
        columns: selectCols,
        rows: rows.map(r => this.project(r, selectCols)),
        total: rows.length,
        elapsed: performance.now() - start,
      };
    } catch (e: unknown) {
      return {
        columns: [], rows: [], total: 0,
        elapsed: performance.now() - start,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  /** 建立完整索引（调用 MetadataService） */
  static async buildIndex(dirPath: string): Promise<NoteMeta[]> {
    return MetadataService.scanDirectory(dirPath);
  }

  // -- 内部 --

  private static tokenize(q: string): {
    select?: string[];
    from?: string;
    where?: { field: string; op: string; value: string };
    sort?: { field: string; dir: 'asc' | 'desc' };
    limit?: number;
  } {
    const tokens: ReturnType<typeof DataviewService.tokenize> = {};

    // SELECT
    const selMatch = q.match(/SELECT\s+(.+?)\s+FROM/i);
    if (selMatch) {
      tokens.select = selMatch[1].split(',').map(s => s.trim());
    }

    // FROM（忽略实际路径，保留语法）
    const fromMatch = q.match(/FROM\s+"([^"]+)"/i);
    if (fromMatch) tokens.from = fromMatch[1];

    // WHERE field OP value
    const whereMatch = q.match(/WHERE\s+(\w+)\s+(CONTAINS|!=|=|>|<|>=|<=)\s+"([^"]+)"/i);
    if (whereMatch) {
      tokens.where = { field: whereMatch[1], op: whereMatch[2].toUpperCase(), value: whereMatch[3] };
    }

    // SORT field ASC/DESC
    const sortMatch = q.match(/SORT\s+(\w+)\s*(ASC|DESC)?/i);
    if (sortMatch) {
      tokens.sort = { field: sortMatch[1], dir: (sortMatch[2] || 'ASC').toUpperCase() as 'asc' | 'desc' };
    }

    // LIMIT N
    const limitMatch = q.match(/LIMIT\s+(\d+)/i);
    if (limitMatch) tokens.limit = parseInt(limitMatch[1], 10);

    return tokens;
  }

  private static applyWhere(rows: NoteMeta[], where: { field: string; op: string; value: string }): NoteMeta[] {
    return rows.filter(r => {
      const fieldVal = this.getField(r, where.field);
      switch (where.op) {
        case 'CONTAINS':
          if (Array.isArray(fieldVal)) return fieldVal.includes(where.value);
          return String(fieldVal).toLowerCase().includes(where.value.toLowerCase());
        case '=': return String(fieldVal) === where.value;
        case '!=': return String(fieldVal) !== where.value;
        default: return String(fieldVal) === where.value;
      }
    });
  }

  private static applySort(rows: NoteMeta[], sort: { field: string; dir: 'asc' | 'desc' }): NoteMeta[] {
    return [...rows].sort((a, b) => {
      const va = String(this.getField(a, sort.field) ?? '');
      const vb = String(this.getField(b, sort.field) ?? '');
      return sort.dir === 'desc' ? vb.localeCompare(va) : va.localeCompare(vb);
    });
  }

  private static getField(meta: NoteMeta, field: string): unknown {
    switch (field) {
      case 'title': return meta.title;
      case 'tags': return meta.tags;
      case 'created': return meta.created;
      case 'category': return meta.category;
      case 'status': return meta.status;
      case 'path': return meta.path;
      default: return meta.fields[field] ?? null;
    }
  }

  private static project(meta: NoteMeta, columns: string[]): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const col of columns) {
      switch (col) {
        case 'title': result.title = meta.title; break;
        case 'tags': result.tags = meta.tags.join(', '); break;
        case 'created': result.created = meta.created; break;
        case 'category': result.category = meta.category; break;
        case 'status': result.status = meta.status; break;
        case 'path': result.path = meta.path; break;
        default: result[col] = meta.fields[col] ?? null;
      }
    }
    return result;
  }
}
