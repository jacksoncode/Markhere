/**
 * Canvas 协作服务 — WebSocket 实时同步卡片和连线
 */

interface CanvasState {
  cards: Array<{ id: string; x: number; y: number; text: string; color: string }>;
  connections: Array<{ from: string; to: string }>;
  sequence: number;
}

type CanvasSyncCallback = (state: CanvasState) => void;

export class CanvasCollaboration {
  private static ws: WebSocket | null = null;
  private static callbacks: Set<CanvasSyncCallback> = new Set();
  private static seq = 0;

  /** 连接到协作房间 */
  static connect(roomId: string, userName: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

    const url = `wss://signaling.yjs.dev?room=${encodeURIComponent(roomId)}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('[CanvasCollab] Connected to room:', roomId);
      this.broadcast({ type: 'join', user: userName });
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'sync' && msg.state) {
          this.seq = msg.state.sequence || 0;
          this.callbacks.forEach(cb => cb(msg.state));
        }
      } catch { /* ignore */ }
    };

    this.ws.onclose = () => { console.log('[CanvasCollab] Disconnected'); this.ws = null; };
    this.ws.onerror = (e) => console.warn('[CanvasCollab] Error:', e);
  }

  /** 断开连接 */
  static disconnect(): void {
    if (this.ws) { this.ws.close(); this.ws = null; }
    this.callbacks.clear();
    this.seq = 0;
  }

  /** 发送 Canvas 状态更新 */
  static sendState(state: Omit<CanvasState, 'sequence'>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const payload = { type: 'sync', state: { ...state, sequence: ++this.seq } };
    this.ws.send(JSON.stringify(payload));
  }

  /** 订阅状态变化 */
  static subscribe(callback: CanvasSyncCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /** 广播消息 */
  private static broadcast(msg: Record<string, unknown>): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  /** 是否已连接 */
  static get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
