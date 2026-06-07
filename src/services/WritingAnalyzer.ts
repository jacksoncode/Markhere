/**
 * 写作分析服务 — 流畅度 / 句子长度 / 阅读时间 / 习惯统计
 * 对标 iA Writer 的写作分析
 */

export interface WritingStats {
  totalChars: number;
  totalWords: number;
  totalSentences: number;
  totalParagraphs: number;
  avgSentenceLength: number;
  avgParagraphLength: number;
  readingTimeMinutes: number;
  speakingTimeMinutes: number;
  uniqueWords: number;
  lexicalDensity: number;
  longestSentence: number;
  shortestSentence: number;
  // 习惯统计
  sessionCount: number;
  totalWritingTimeMinutes: number;
  wordsPerMinute: number;
}

export class WritingAnalyzer {
  /** 全面分析文本 */
  static analyze(text: string): WritingStats {
    const sentences = text.split(/[.!?。！？\n]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const chineseChars = (text.match(/[一-鿿]/g) || []).length;
    const totalWords = words.length + chineseChars; // 中文按字计数
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);

    const sentLengths = sentences.map(s => s.trim().split(/\s+/).length);
    const paraLengths = paragraphs.map(p => p.trim().split(/\s+/).length);

    const unique = new Set(words.map(w => w.toLowerCase()));

    // 从 localStorage 获取历史统计
    const history = this.getHistory();
    const sessionCount = history.sessions.length;

    return {
      totalChars: text.replace(/\s/g, '').length,
      totalWords,
      totalSentences: sentences.length,
      totalParagraphs: paragraphs.length,
      avgSentenceLength: sentLengths.length > 0 ? Math.round(sentLengths.reduce((a, b) => a + b, 0) / sentLengths.length) : 0,
      avgParagraphLength: paraLengths.length > 0 ? Math.round(paraLengths.reduce((a, b) => a + b, 0) / paraLengths.length) : 0,
      readingTimeMinutes: Math.ceil(totalWords / 200), // 200 wpm
      speakingTimeMinutes: Math.ceil(totalWords / 130), // 130 wpm
      uniqueWords: unique.size,
      lexicalDensity: totalWords > 0 ? Math.round((unique.size / totalWords) * 100) : 0,
      longestSentence: sentLengths.length > 0 ? Math.max(...sentLengths) : 0,
      shortestSentence: sentLengths.length > 0 ? Math.min(...sentLengths) : 0,
      sessionCount,
      totalWritingTimeMinutes: history.totalMinutes,
      wordsPerMinute: history.totalMinutes > 0 ? Math.round(totalWords / history.totalMinutes) : 0,
    };
  }

  /** 记录写作会话 */
  static recordSession(wordCount: number, durationMinutes: number): void {
    const history = this.getHistory();
    history.sessions.push({ date: Date.now(), wordCount, durationMinutes });
    history.totalMinutes += durationMinutes;

    // 保留最近 100 次会话
    if (history.sessions.length > 100) history.sessions = history.sessions.slice(-100);

    localStorage.setItem('markhere-writing-history', JSON.stringify(history));
  }

  /** 获取写作流畅度评分（0-100）*/
  static getFluencyScore(stats: WritingStats): number {
    let score = 50;
    // 理想句子长度 10-20 词
    if (stats.avgSentenceLength >= 10 && stats.avgSentenceLength <= 20) score += 15;
    else if (stats.avgSentenceLength >= 8 && stats.avgSentenceLength <= 25) score += 5;
    // 词汇多样性 > 50%
    if (stats.lexicalDensity > 50) score += 15;
    else if (stats.lexicalDensity > 30) score += 5;
    // 段落长度适中
    if (stats.avgParagraphLength >= 2 && stats.avgParagraphLength <= 8) score += 10;
    // 有多个段落
    if (stats.totalParagraphs >= 3) score += 10;
    return Math.min(score, 100);
  }

  /** 获取历史统计 */
  static getHistory(): { sessions: Array<{ date: number; wordCount: number; durationMinutes: number }>; totalMinutes: number } {
    try {
      const raw = localStorage.getItem('markhere-writing-history');
      return raw ? JSON.parse(raw) : { sessions: [], totalMinutes: 0 };
    } catch { return { sessions: [], totalMinutes: 0 }; }
  }

  /** 清空历史 */
  static clearHistory(): void {
    localStorage.removeItem('markhere-writing-history');
  }
}
