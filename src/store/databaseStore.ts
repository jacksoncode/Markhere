/**
 * 轻量级数据库存储 — 对标 Notion 数据库视图。
 * 数据保存为 .db.json 文件，Markdown 文档通过双链语法引用。
 */
import { create } from 'zustand';

export type PropertyType = 'text' | 'number' | 'date' | 'select' | 'multi-select' | 'checkbox';
export type ViewType = 'table' | 'board' | 'calendar' | 'timeline' | 'list';

export interface Property {
  id: string;
  name: string;
  type: PropertyType;
  options?: string[]; // for select / multi-select
}

export interface DbRecord {
  id: string;
  values: Record<string, unknown>;
}

export interface DbView {
  id: string;
  name: string;
  type: ViewType;
  config: Record<string, unknown>;
}

export interface Database {
  id: string;
  title: string;
  properties: Property[];
  views: DbView[];
  records: DbRecord[];
  activeViewId: string | null;
}

interface DatabaseState {
  databases: Database[];
  activeDbId: string | null;

  createDatabase: (title: string) => Database;
  deleteDatabase: (id: string) => void;
  getDatabase: (id: string) => Database | undefined;
  setActiveDatabase: (id: string | null) => void;

  addProperty: (dbId: string, prop: Property) => void;
  removeProperty: (dbId: string, propId: string) => void;

  addRecord: (dbId: string, values: Record<string, unknown>) => DbRecord;
  updateRecord: (dbId: string, recordId: string, values: Record<string, unknown>) => void;
  deleteRecord: (dbId: string, recordId: string) => void;

  addView: (dbId: string, view: DbView) => void;
  removeView: (dbId: string, viewId: string) => void;
  setActiveView: (dbId: string, viewId: string) => void;

  /** 导出为 .db.json 格式 */
  exportToFile: (dbId: string) => string;
  /** 从 JSON 字符串导入 */
  importFromFile: (json: string) => Database;
}

let idCounter = 0;
function uid(): string {
  return `db_${Date.now()}_${++idCounter}`;
}

export const useDatabaseStore = create<DatabaseState>((set, get) => ({
  databases: [],
  activeDbId: null,

  createDatabase: (title) => {
    const db: Database = {
      id: uid(),
      title,
      properties: [
        { id: uid(), name: 'Name', type: 'text' },
        { id: uid(), name: 'Tags', type: 'multi-select' },
        { id: uid(), name: 'Created', type: 'date' },
      ],
      views: [{ id: uid(), name: 'Table View', type: 'table', config: {} }],
      records: [],
      activeViewId: null,
    };
    db.activeViewId = db.views[0].id;
    set(s => ({ databases: [...s.databases, db], activeDbId: db.id }));
    return db;
  },

  deleteDatabase: (id) => set(s => ({
    databases: s.databases.filter(d => d.id !== id),
    activeDbId: s.activeDbId === id ? null : s.activeDbId,
  })),

  getDatabase: (id) => get().databases.find(d => d.id === id),

  setActiveDatabase: (id) => set({ activeDbId: id }),

  addProperty: (dbId, prop) => set(s => ({
    databases: s.databases.map(d => d.id === dbId ? { ...d, properties: [...d.properties, prop] } : d),
  })),

  removeProperty: (dbId, propId) => set(s => ({
    databases: s.databases.map(d => d.id === dbId
      ? { ...d, properties: d.properties.filter(p => p.id !== propId) }
      : d),
  })),

  addRecord: (dbId, values) => {
    const rec: DbRecord = { id: uid(), values };
    set(s => ({
      databases: s.databases.map(d => d.id === dbId ? { ...d, records: [...d.records, rec] } : d),
    }));
    return rec;
  },

  updateRecord: (dbId, recordId, values) => set(s => ({
    databases: s.databases.map(d => d.id === dbId ? {
      ...d,
      records: d.records.map(r => r.id === recordId ? { ...r, values: { ...r.values, ...values } } : r),
    } : d),
  })),

  deleteRecord: (dbId, recordId) => set(s => ({
    databases: s.databases.map(d => d.id === dbId
      ? { ...d, records: d.records.filter(r => r.id !== recordId) }
      : d),
  })),

  addView: (dbId, view) => set(s => ({
    databases: s.databases.map(d => d.id === dbId ? { ...d, views: [...d.views, view] } : d),
  })),

  removeView: (dbId, viewId) => set(s => ({
    databases: s.databases.map(d => d.id === dbId
      ? { ...d, views: d.views.filter(v => v.id !== viewId) }
      : d),
  })),

  setActiveView: (dbId, viewId) => set(s => ({
    databases: s.databases.map(d => d.id === dbId ? { ...d, activeViewId: viewId } : d),
  })),

  exportToFile: (dbId) => {
    const db = get().databases.find(d => d.id === dbId);
    if (!db) return '{}';
    return JSON.stringify({ title: db.title, properties: db.properties, views: db.views, records: db.records }, null, 2);
  },

  importFromFile: (json) => {
    const raw = JSON.parse(json);
    const db: Database = {
      id: uid(),
      title: raw.title || 'Imported',
      properties: raw.properties || [],
      views: raw.views || [{ id: uid(), name: 'Table View', type: 'table', config: {} }],
      records: raw.records || [],
      activeViewId: null,
    };
    db.activeViewId = db.views[0]?.id || null;
    set(s => ({ databases: [...s.databases, db] }));
    return db;
  },
}));
