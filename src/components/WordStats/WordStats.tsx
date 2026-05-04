import { useMemo } from 'react';
import './WordStats.css';

interface WordStatsProps {
  content: string;
}

interface Stats {
  characters: number;
  charactersNoSpaces: number;
  words: number;
  sentences: number;
  paragraphs: number;
  lines: number;
  readingTime: number;
  speakingTime: number;
}

function calculateStats(content: string): Stats {
  const text = content || '';
  
  const characters = text.length;
  const charactersNoSpaces = text.replace(/\s/g, '').length;
  
  const words = text.trim() ? text.trim().split(/\s+/).filter(w => w.length > 0).length : 0;
  
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0).length;
  
  const lines = text.split('\n').filter(l => l.trim().length > 0).length;
  
  const readingTime = Math.ceil(words / 200); // 200 words per minute
  const speakingTime = Math.ceil(words / 150); // 150 words per minute
  
  return {
    characters,
    charactersNoSpaces,
    words,
    sentences,
    paragraphs,
    lines,
    readingTime,
    speakingTime,
  };
}

export function WordStats({ content }: WordStatsProps) {
  const stats = useMemo(() => calculateStats(content), [content]);
  
  return (
    <div className="word-stats">
      <div className="stats-grid">
        <div className="stat-item">
          <span className="stat-value">{stats.words}</span>
          <span className="stat-label">Words</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.characters}</span>
          <span className="stat-label">Characters</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.charactersNoSpaces}</span>
          <span className="stat-label">Characters (no spaces)</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.sentences}</span>
          <span className="stat-label">Sentences</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.paragraphs}</span>
          <span className="stat-label">Paragraphs</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.lines}</span>
          <span className="stat-label">Lines</span>
        </div>
      </div>
      
      <div className="time-stats">
        <div className="time-stat">
          <span className="time-icon">📖</span>
          <span className="time-value">{stats.readingTime} min</span>
          <span className="time-label">Reading time</span>
        </div>
        <div className="time-stat">
          <span className="time-icon">🎤</span>
          <span className="time-value">{stats.speakingTime} min</span>
          <span className="time-label">Speaking time</span>
        </div>
      </div>
    </div>
  );
}

export function WordStatsPanel({ content }: WordStatsProps) {
  return (
    <div className="word-stats-panel">
      <h3>Document Statistics</h3>
      <WordStats content={content} />
    </div>
  );
}