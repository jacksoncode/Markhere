import { useEffect, useMemo } from 'react';
import { useTranslation } from '../../i18n';
import { useEditorState } from '../../store/editorStore';
import './WordCountDialog.css';

interface WordCountDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Stats {
  characters: number;
  charactersNoSpaces: number;
  words: number;
  chineseChars: number;
  englishWords: number;
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
  
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const englishWords = text.trim() ? text.trim().split(/[a-zA-Z]+/).filter(w => /[a-zA-Z]/.test(w)).length : 0;
  const words = chineseChars + englishWords;
  
  const sentences = text.split(/[.!?。！？]+/).filter(s => s.trim().length > 0).length;
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0).length;
  const lines = text.split('\n').filter(l => l.trim().length > 0).length;
  
  const readingTime = Math.ceil(words / 300);
  const speakingTime = Math.ceil(words / 200);
  
  return {
    characters,
    charactersNoSpaces,
    words,
    chineseChars,
    englishWords,
    sentences,
    paragraphs,
    lines,
    readingTime,
    speakingTime,
  };
}

export function WordCountDialog({ isOpen, onClose }: WordCountDialogProps) {
  const { t } = useTranslation();
  const editorInstance = useEditorState((state) => state.editorInstance);
  
  const content = useMemo(() => {
    if (!editorInstance) return '';
    return (editorInstance.storage as any)?.markdown?.getMarkdown?.() || '';
  }, [editorInstance]);
  
  const stats = useMemo(() => calculateStats(content), [content]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  return (
    <div className="word-count-dialog-overlay" onClick={onClose}>
      <div className="word-count-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>{t('edit.wordCount')}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="dialog-content">
          <div className="stats-section">
            <h3>{t('wordCount.documentStats')}</h3>
            <div className="stats-grid">
              <div className="stat-row">
                <span className="stat-label">{t('wordCount.words')}</span>
                <span className="stat-value">{stats.words}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">{t('wordCount.chineseChars')}</span>
                <span className="stat-value">{stats.chineseChars}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">{t('wordCount.englishWords')}</span>
                <span className="stat-value">{stats.englishWords}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">{t('wordCount.characters')}</span>
                <span className="stat-value">{stats.characters}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">{t('wordCount.charactersNoSpaces')}</span>
                <span className="stat-value">{stats.charactersNoSpaces}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">{t('wordCount.paragraphs')}</span>
                <span className="stat-value">{stats.paragraphs}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">{t('wordCount.lines')}</span>
                <span className="stat-value">{stats.lines}</span>
              </div>
            </div>
          </div>
          
          <div className="stats-section">
            <h3>{t('wordCount.readingTime')}</h3>
            <div className="time-stats">
              <div className="time-item">
                <span className="time-icon">📖</span>
                <div className="time-details">
                  <span className="time-value">{stats.readingTime} {t('wordCount.minutes')}</span>
                  <span className="time-label">{t('wordCount.readingSpeed')}</span>
                </div>
              </div>
              <div className="time-item">
                <span className="time-icon">🎤</span>
                <div className="time-details">
                  <span className="time-value">{stats.speakingTime} {t('wordCount.minutes')}</span>
                  <span className="time-label">{t('wordCount.speakingSpeed')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}