import { describe, it, expect, beforeEach } from 'vitest';
import { ExportQuality } from './ExportQuality';

describe('ExportQuality', () => {
  beforeEach(() => { ExportQuality.clearHistory(); });

  it('has defaults', () => {
    expect(ExportQuality.defaults.imageQuality).toBe(80);
    expect(ExportQuality.defaults.pageSize).toBe('a4');
  });

  it('adds and retrieves export history', async () => {
    await ExportQuality.addToHistory({ format: 'pdf', path: '/out.pdf', title: 'Doc', fileSize: 1024 });
    const hist = await ExportQuality.getHistory();
    expect(hist).toHaveLength(1);
    expect(hist[0].format).toBe('pdf');
    expect(hist[0].title).toBe('Doc');
  });

  it('truncates history to 50 entries', async () => {
    for (let i = 0; i < 60; i++) {
      await ExportQuality.addToHistory({ format: 'pdf', path: `/out${i}.pdf`, title: `Doc${i}`, fileSize: 1024 });
    }
    const hist = await ExportQuality.getHistory();
    expect(hist.length).toBeLessThanOrEqual(50);
  });

  it('returns templates', async () => {
    const templates = await ExportQuality.getTemplateList();
    expect(templates.length).toBeGreaterThanOrEqual(5);
    expect(templates[0]).toHaveProperty('id');
    expect(templates[0]).toHaveProperty('name');
  });

  it('clears history', async () => {
    await ExportQuality.addToHistory({ format: 'pdf', path: '/test.pdf', title: 'T', fileSize: 100 });
    await ExportQuality.clearHistory();
    expect(await ExportQuality.getHistory()).toHaveLength(0);
  });
});
