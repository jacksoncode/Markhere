export interface Comment {
  id: string;
  text: string;
  author: string;
  createdAt: number;
  updatedAt?: number;
  resolved: boolean;
  replies?: CommentReply[];
}

export interface CommentReply {
  id: string;
  text: string;
  author: string;
  createdAt: number;
}

export interface CommentThread {
  id: string;
  comments: Comment[];
  from: number;
  to: number;
  resolved: boolean;
}

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export class CommentService {
  private threads: Map<string, CommentThread> = new Map();
  private storageKey: string;

  constructor(docId: string) {
    this.storageKey = `comments_${docId}`;
    this.loadFromStorage();
  }

  addThread(from: number, to: number, initialComment: string, author: string): CommentThread {
    const threadId = generateId();
    const commentId = generateId();
    
    const thread: CommentThread = {
      id: threadId,
      from,
      to,
      resolved: false,
      comments: [{
        id: commentId,
        text: initialComment,
        author,
        createdAt: Date.now(),
        resolved: false,
        replies: [],
      }],
    };
    
    this.threads.set(threadId, thread);
    this.saveToStorage();
    
    return thread;
  }

  addReply(threadId: string, text: string, author: string): CommentReply | null {
    const thread = this.threads.get(threadId);
    if (!thread) return null;
    
    const reply: CommentReply = {
      id: generateId(),
      text,
      author,
      createdAt: Date.now(),
    };
    
    thread.comments[0].replies?.push(reply);
    this.saveToStorage();
    
    return reply;
  }

  resolveThread(threadId: string): boolean {
    const thread = this.threads.get(threadId);
    if (!thread) return false;
    
    thread.resolved = true;
    thread.comments[0].resolved = true;
    this.saveToStorage();
    
    return true;
  }

  deleteThread(threadId: string): boolean {
    const deleted = this.threads.delete(threadId);
    if (deleted) {
      this.saveToStorage();
    }
    return deleted;
  }

  getThreads(): CommentThread[] {
    return Array.from(this.threads.values())
      .sort((a, b) => a.from - b.from);
  }

  getThread(threadId: string): CommentThread | null {
    return this.threads.get(threadId) || null;
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.forEach((thread: CommentThread) => {
          this.threads.set(thread.id, thread);
        });
      }
    } catch {
      // ignore
    }
  }

  private saveToStorage(): void {
    try {
      const data = JSON.stringify(Array.from(this.threads.values()));
      localStorage.setItem(this.storageKey, data);
    } catch {
      // ignore
    }
  }

  clear(): void {
    this.threads.clear();
    localStorage.removeItem(this.storageKey);
  }
}