import { WritingAnalyzer } from './WritingAnalyzer';

export interface WritingScore {
  overall: number;           // 0-100
  readability: number;
  fluency: number;
  vocabulary: number;
  structure: number;
}

export interface WritingIssue {
  type: 'passive' | 'repetition' | 'longSentence' | 'adverb' | 'jargon';
  text: string;
  suggestion: string;
  position: number;
}

export interface SentimentResult {
  positive: number;  // 0-100%
  neutral: number;
  negative: number;
  label: 'positive' | 'neutral' | 'negative';
}

export class WritingDeepAnalyzer {
  private static readonly READABILITY_FORMULA = {
    passivePatterns: /\b(is|are|was|were|been|being|am)\s+(\w+ed|written|made|done|taken|given|found|seen|known|shown)\b/gi,
    adverbPatterns: /\b(\w+ly)\b/gi,
    jargonTerms: /\b(synerg|leverage|utilize|optimize|streamline|innovative|disruptive|paradigm|ecosystem|scalable)\w*\b/gi,
  };

  /** 综合写作评分 */
  static scoreWriting(text: string): WritingScore {
    const stats = WritingAnalyzer.analyze(text);
    const issues = this.findIssues(text);

    const readability = Math.min(100, Math.max(0,
      60 + (20 - Math.abs(stats.avgSentenceLength - 15)) * 2 -
      (issues.filter(i => i.type === 'longSentence').length * 5)
    ));
    const fluency = Math.min(100, Math.max(0, 50 + stats.lexicalDensity - (issues.length * 3)));
    const vocabulary = Math.min(100, stats.lexicalDensity);
    const structure = Math.min(100, Math.max(0, stats.totalParagraphs > 2 ? 60 + stats.totalParagraphs * 5 : stats.totalParagraphs * 30));
    const overall = Math.round((readability + fluency + vocabulary + structure) / 4);

    return { overall, readability, fluency, vocabulary, structure };
  }

  /** 发现问题 */
  static findIssues(text: string): WritingIssue[] {
    const issues: WritingIssue[] = [];

    // 被动语态
    let match;
    while ((match = this.READABILITY_FORMULA.passivePatterns.exec(text)) !== null) {
      issues.push({ type: 'passive', text: match[0], suggestion: `考虑改为主动语态："${match[0]}"`, position: match.index });
    }

    // 长句检测
    const sentences = text.split(/[.!?。！？]+/);
    let pos = 0;
    for (const s of sentences) {
      const words = s.trim().split(/\s+/).length;
      if (words > 30) {
        issues.push({ type: 'longSentence', text: s.trim().slice(0, 80) + '...', suggestion: `长句（${words}词），建议拆分为短句`, position: pos });
      }
      pos += s.length + 1;
    }

    // 副词过量
    let advCount = 0;
    while ((match = this.READABILITY_FORMULA.adverbPatterns.exec(text)) !== null) {
      advCount++;
      if (advCount > 5) issues.push({ type: 'adverb', text: match[0], suggestion: '副词过多，考虑用更精确的动词替代', position: match.index });
    }

    return issues;
  }

  /** 情感分析 */
  static analyzeSentiment(text: string): SentimentResult {
    const positive = ['好', '优秀', '出色', '厉害', '完美', '棒', '赞', 'great', 'excellent', 'wonderful', 'amazing', 'fantastic', 'love', '喜欢'];
    const negative = ['差', '糟糕', '失败', '坏', '讨厌', '烦', '难', 'bad', 'terrible', 'awful', 'hate', 'disappointed', 'frustrating'];

    const lower = text.toLowerCase();
    let posCount = 0, negCount = 0;
    for (const w of positive) posCount += (lower.match(new RegExp(w, 'g')) || []).length;
    for (const w of negative) negCount += (lower.match(new RegExp(w, 'g')) || []).length;

    const total = posCount + negCount || 1;
    const posPct = Math.round((posCount / total) * 100);
    const negPct = Math.round((negCount / total) * 100);
    const neuPct = Math.max(0, 100 - posPct - negPct);

    let label: SentimentResult['label'] = 'neutral';
    if (posPct > 60) label = 'positive';
    else if (negPct > 60) label = 'negative';

    return { positive: posPct, neutral: neuPct, negative: negPct, label };
  }

  /** Flesch-Kincaid 可读性 */
  static fleschKincaid(text: string): { score: number; level: string } {
    const stats = WritingAnalyzer.analyze(text);
    const words = stats.totalWords || 1;
    const sentences = stats.totalSentences || 1;
    const syllables = this.countSyllables(text);

    const score = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
    const clamped = Math.max(0, Math.min(100, score));

    let level: string;
    if (clamped >= 90) level = '小学水平';
    else if (clamped >= 80) level = '初中水平';
    else if (clamped >= 70) level = '高中水平';
    else if (clamped >= 60) level = '大学水平';
    else if (clamped >= 50) level = '较难';
    else if (clamped >= 30) level = '困难';
    else level = '非常困难';

    return { score: Math.round(clamped), level };
  }

  private static countSyllables(text: string): number {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    let count = 0;
    for (const w of words) {
      const cleaned = w.replace(/[^a-zA-Z]/g, '').toLowerCase();
      if (!cleaned) { count++; continue; }
      const syllables = cleaned.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').match(/[aeiouy]{1,2}/g);
      count += syllables ? syllables.length : 1;
    }
    return count || 1;
  }
}
