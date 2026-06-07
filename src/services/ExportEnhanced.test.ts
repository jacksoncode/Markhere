import { describe, it, expect, vi } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ save: vi.fn().mockResolvedValue('/output/test.tex') }));

import { ExportEnhanced } from './ExportEnhanced';

describe('ExportEnhanced', () => {
  it('exports LaTeX document', async () => {
    const result = await ExportEnhanced.exportLaTeX('# Title\n\nHello world.', 'TestDoc');
    expect(result).toBe('/output/test.tex');
  });

  it('handles cancellation', async () => {
    const { save } = await import('@tauri-apps/plugin-dialog');
    vi.mocked(save).mockResolvedValueOnce(null);
    const result = await ExportEnhanced.exportLaTeX('# Test', 'Doc');
    expect(result).toBeNull();
  });

  it('exports PPTX with heading slides', async () => {
    const { save } = await import('@tauri-apps/plugin-dialog');
    vi.mocked(save).mockResolvedValueOnce('/output/slides.pptx');
    const result = await ExportEnhanced.exportPPTX('# Slide 1\nContent\n\n## Slide 2\nMore', 'Deck');
    expect(result).toBeTruthy();
  });
});
