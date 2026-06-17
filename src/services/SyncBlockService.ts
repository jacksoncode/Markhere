export interface SyncBlock {
  id: string;
  content: string;
  references: string[];
  createdAt: number;
  updatedAt: number;
}

function generateId(): string {
  return `sync_${Math.random().toString(36).substring(2)}`;
}

export class SyncBlockService {
  private blocks: Map<string, SyncBlock> = new Map();
  private storageKey: string;
  private updateCallbacks: Set<(blockId: string) => void> = new Set();

  constructor(docId: string) {
    this.storageKey = `syncblocks_${docId}`;
    this.loadFromStorage();
  }

  createBlock(initialContent: string): SyncBlock {
    const id = generateId();
    const now = Date.now();
    
    const block: SyncBlock = {
      id,
      content: initialContent,
      references: [],
      createdAt: now,
      updatedAt: now,
    };
    
    this.blocks.set(id, block);
    this.saveToStorage();
    
    return block;
  }

  updateBlock(blockId: string, content: string): boolean {
    const block = this.blocks.get(blockId);
    if (!block) return false;
    
    block.content = content;
    block.updatedAt = Date.now();
    
    this.blocks.set(blockId, block);
    this.saveToStorage();
    
    this.notifyUpdate(blockId);
    
    return true;
  }

  getBlock(blockId: string): SyncBlock | null {
    return this.blocks.get(blockId) || null;
  }

  getAllBlocks(): SyncBlock[] {
    return Array.from(this.blocks.values())
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  deleteBlock(blockId: string): boolean {
    const deleted = this.blocks.delete(blockId);
    if (deleted) {
      this.saveToStorage();
    }
    return deleted;
  }

  onUpdate(callback: (blockId: string) => void): () => void {
    this.updateCallbacks.add(callback);
    return () => this.updateCallbacks.delete(callback);
  }

  private notifyUpdate(blockId: string): void {
    this.updateCallbacks.forEach((cb) => cb(blockId));
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.forEach((block: SyncBlock) => {
          this.blocks.set(block.id, block);
        });
      }
    } catch {
      // ignore
    }
  }

  private saveToStorage(): void {
    try {
      const data = JSON.stringify(Array.from(this.blocks.values()));
      localStorage.setItem(this.storageKey, data);
    } catch {
      // ignore
    }
  }

  clear(): void {
    this.blocks.clear();
    localStorage.removeItem(this.storageKey);
  }
}