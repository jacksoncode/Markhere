import { describe, it, expect } from 'vitest';
import { MermaidLoader } from './mermaidLoader';

describe('MermaidLoader', () => {
  it('detects diagram type from code', () => {
    expect(MermaidLoader.detectDiagramType('sequenceDiagram\nA->B')).toBe('sequence');
    expect(MermaidLoader.detectDiagramType('gantt\nsection A')).toBe('gantt');
    expect(MermaidLoader.detectDiagramType('classDiagram\nclass A')).toBe('class');
    expect(MermaidLoader.detectDiagramType('graph TD\nA-->B')).toBe('flowchart');
    expect(MermaidLoader.detectDiagramType('erDiagram\nCUSTOMER')).toBe('er');
    expect(MermaidLoader.detectDiagramType('pie')).toBe('pie');
  });

  it('defaults to flowchart for unknown', () => {
    expect(MermaidLoader.detectDiagramType('unknown')).toBe('flowchart');
  });
});
