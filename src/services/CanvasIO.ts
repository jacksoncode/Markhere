interface CanvasData {
  cards: Array<{ id: string; x: number; y: number; text: string; color: string }>;
  connections: Array<{ from: string; to: string }>;
}

export class CanvasIO {
  static export(data: CanvasData): string {
    return JSON.stringify(data, null, 2);
  }

  static import(json: string): CanvasData {
    const raw = JSON.parse(json);
    return {
      cards: raw.cards || [],
      connections: raw.connections || [],
    };
  }

  static download(data: CanvasData, filename = 'canvas.json') {
    const blob = new Blob([this.export(data)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}
