import { describe, it, expect, vi } from 'vitest';

vi.mock('../store/aiStore', () => ({
  useAIStore: { getState: () => ({ getCurrentApiKey: () => '', config: { providerId: 'deepseek' } }) },
  callAI: vi.fn().mockResolvedValue('Mocked AI response'),
}));

import { AIAdvanced } from './AIAdvanced';

describe('AIAdvanced', () => {
  it('generateMindmap returns result', async () => {
    const r = await AIAdvanced.generateMindmap('# Title\n## Sub');
    expect(r.success).toBe(false);
  });

  it('optimizeCode returns result', async () => {
    const r = await AIAdvanced.optimizeCode('function f(){}', 'javascript');
    expect(r.success).toBe(false);
  });

  it('analyzeTable returns result', async () => {
    const r = await AIAdvanced.analyzeTable('| A | B |\n|---|---|\n| 1 | 2 |');
    expect(r.success).toBe(false);
  });

  it('checkStyleConsistency returns result', async () => {
    const r = await AIAdvanced.checkStyleConsistency('Some text.');
    expect(r.success).toBe(false);
  });

  it('generateTOC returns result', async () => {
    const r = await AIAdvanced.generateTOC('# Title\n## Section');
    expect(r.success).toBe(false);
  });
});
