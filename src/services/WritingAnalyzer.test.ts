import { describe, it, expect, beforeEach } from 'vitest';
import { WritingAnalyzer } from './WritingAnalyzer';

describe('WritingAnalyzer', () => {
  beforeEach(() => { WritingAnalyzer.clearHistory(); });

  it('analyzes text and returns stats', () => {
    const text = 'Hello world. This is a test. Goodbye.';
    const stats = WritingAnalyzer.analyze(text);

    expect(stats.totalWords).toBeGreaterThan(0);
    expect(stats.totalSentences).toBe(3);
    expect(stats.readingTimeMinutes).toBeGreaterThan(0);
    expect(stats.avgSentenceLength).toBeGreaterThan(0);
  });

  it('handles empty text', () => {
    const stats = WritingAnalyzer.analyze('');
    expect(stats.totalWords).toBe(0);
    expect(stats.totalSentences).toBe(0);
    expect(stats.readingTimeMinutes).toBe(0);
  });

  it('calculates fluency score', () => {
    const text = 'This is a well-structured document with multiple paragraphs.\n\nEach paragraph has sentences that are appropriately sized.\n\nThe lexical diversity is quite good and the structure flows well.';
    const stats = WritingAnalyzer.analyze(text);
    const score = WritingAnalyzer.getFluencyScore(stats);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('records sessions and tracks history', () => {
    WritingAnalyzer.recordSession(500, 10);
    WritingAnalyzer.recordSession(300, 5);

    const history = WritingAnalyzer.getHistory();
    expect(history.sessions).toHaveLength(2);
    expect(history.totalMinutes).toBe(15);
  });

  it('handles Chinese text', () => {
    const text = '你好世界。这是一个测试文档。用于验证中文分词能力。';
    const stats = WritingAnalyzer.analyze(text);
    expect(stats.totalWords).toBeGreaterThan(0);
  });
});
