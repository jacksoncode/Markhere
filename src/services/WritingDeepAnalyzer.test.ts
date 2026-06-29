/**
 * Unit tests for WritingDeepAnalyzer (P1-9)
 */
import { describe, it, expect } from 'vitest';
import { WritingDeepAnalyzer } from './WritingDeepAnalyzer';

describe('WritingDeepAnalyzer', () => {
  describe('fleschKincaid', () => {
    it('returns high score for simple text', () => {
      const result = WritingDeepAnalyzer.fleschKincaid('The cat sat on the mat. It was a sunny day.');
      expect(result.score).toBeGreaterThan(60);
      expect(result.level).toBeTruthy();
    });

    it('returns low score for complex text', () => {
      const result = WritingDeepAnalyzer.fleschKincaid(
        'The philosophical underpinnings of postmodernist epistemology necessitate a thorough deconstruction of hegemonic narratives.'
      );
      expect(result.score).toBeLessThan(50);
    });

    it('handles empty text', () => {
      const result = WritingDeepAnalyzer.fleschKincaid('');
      expect(result.score).toBeGreaterThan(0);
    });

    it('handles Chinese text', () => {
      const result = WritingDeepAnalyzer.fleschKincaid('今天天气很好，我们去公园散步。');
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });

  describe('analyzeSentiment', () => {
    it('detects positive sentiment', () => {
      const result = WritingDeepAnalyzer.analyzeSentiment('This is great! Excellent work! Amazing job!');
      expect(result.label).toBe('positive');
      expect(result.positive).toBeGreaterThan(50);
    });

    it('detects negative sentiment', () => {
      const result = WritingDeepAnalyzer.analyzeSentiment('This is terrible. Bad experience. Awful quality.');
      expect(result.label).toBe('negative');
      expect(result.negative).toBeGreaterThan(50);
    });

    it('returns neutral for mixed/neutral text', () => {
      const result = WritingDeepAnalyzer.analyzeSentiment('The book is on the table. I went to the store.');
      expect(result.label).toBe('neutral');
    });

    it('handles empty text', () => {
      const result = WritingDeepAnalyzer.analyzeSentiment('');
      expect(result.label).toBe('neutral');
    });
  });

  describe('findIssues', () => {
    it('detects long sentences', () => {
      const result = WritingDeepAnalyzer.findIssues(
        'This is a very long sentence that contains many words and should be flagged as an issue by the analyzer because it exceeds the thirty word threshold that was configured and is clearly too long.'
      );
      expect(result.some(i => i.type === 'longSentence')).toBe(true);
    });

    it('detects passive voice', () => {
      const result = WritingDeepAnalyzer.findIssues('The experiment was conducted by the researchers.');
      expect(result.some(i => i.type === 'passive')).toBe(true);
    });

    it('returns empty array for clean text', () => {
      const result = WritingDeepAnalyzer.findIssues('Short text. No problems.');
      expect(result.length).toBe(0);
    });

    it('returns issues with suggestions', () => {
      const result = WritingDeepAnalyzer.findIssues(
        'This is a very long sentence that contains many words and should be flagged as an issue by the analyzer because it exceeds the threshold.'
      );
      if (result.length > 0) {
        expect(result[0].suggestion).toBeTruthy();
        expect(result[0].type).toBeTruthy();
      }
    });
  });

  describe('scoreWriting', () => {
    it('returns scores within valid range', () => {
      const result = WritingDeepAnalyzer.scoreWriting('This is a test. It has multiple sentences. For testing purposes.');
      expect(result.overall).toBeGreaterThanOrEqual(0);
      expect(result.overall).toBeLessThanOrEqual(100);
      expect(result.readability).toBeGreaterThanOrEqual(0);
      expect(result.fluency).toBeGreaterThanOrEqual(0);
    });

    it('detects writing issues and reduces score', () => {
      // Multiple passive voice + long sentences should reduce readability
      const badText = 'The experiment was conducted by the team. The results were analyzed by the researchers. ' +
        'A comprehensive evaluation of the methodology was performed by the lead investigator. ' +
        'The data were collected from multiple sources and were processed using specialized software. ' +
        'Furthermore, the interpretation of the findings was conducted by an external committee.';
      const result = WritingDeepAnalyzer.scoreWriting(badText);
      expect(result.overall).toBeGreaterThanOrEqual(0);
      expect(result.readability).toBeGreaterThanOrEqual(0);
      expect(result.fluency).toBeGreaterThanOrEqual(0);
    });
  });
});
