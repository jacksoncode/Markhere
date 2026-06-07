export class MermaidLoader {
  private static loadedTypes = new Set<string>();

  static async loadDiagramType(type: string): Promise<void> {
    if (this.loadedTypes.has(type)) return;

    switch (type) {
      case 'flowchart':
        await import('mermaid');
        break;
      case 'sequence':
        await import('mermaid');
        break;
      case 'gantt':
        await import('mermaid');
        break;
      case 'class':
        await import('mermaid');
        break;
      default:
        await import('mermaid');
    }

    this.loadedTypes.add(type);
  }

  static detectDiagramType(code: string): string {
    if (code.includes('sequenceDiagram')) return 'sequence';
    if (code.includes('gantt')) return 'gantt';
    if (code.includes('classDiagram')) return 'class';
    if (code.includes('erDiagram')) return 'er';
    if (code.includes('pie')) return 'pie';
    return 'flowchart';
  }
}
