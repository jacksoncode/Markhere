import { describe, it, expect } from 'vitest';
import { CanvasIO } from './CanvasIO';

describe('CanvasIO', () => {
  it('exports and imports canvas data', () => {
    const data = {
      cards: [{ id: 'c1', x: 100, y: 200, text: 'Hello', color: '#3b82f6' }],
      connections: [{ from: 'c1', to: 'c2' }],
    };
    const json = CanvasIO.export(data);
    const parsed = CanvasIO.import(json);
    expect(parsed.cards).toHaveLength(1);
    expect(parsed.cards[0].text).toBe('Hello');
    expect(parsed.connections).toHaveLength(1);
  });

  it('handles empty data gracefully', () => {
    const parsed = CanvasIO.import('{}');
    expect(parsed.cards).toEqual([]);
    expect(parsed.connections).toEqual([]);
  });
});
