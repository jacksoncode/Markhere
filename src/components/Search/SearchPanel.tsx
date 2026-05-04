import { useState, useEffect } from 'react';
import { useEditorState } from '../../store/editorStore';
import { SearchService, SearchResult } from '../../services/SearchService';
import { useTranslation } from '../../i18n';
import './SearchPanel.css';

export function SearchPanel() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showReplace, setShowReplace] = useState(false);
  const { editorInstance } = useEditorState();

  useEffect(() => {
    if (query && editorInstance) {
      const content = editorInstance.getHTML();
      const found = SearchService.findInDocument(content, query);
      setResults(found);
      setCurrentIndex(0);
    } else {
      setResults([]);
    }
  }, [query, editorInstance]);

  const handleFindNext = () => {
    if (results.length > 0) {
      const next = (currentIndex + 1) % results.length;
      setCurrentIndex(next);
      editorInstance?.commands.setTextSelection({
        from: results[next].from,
        to: results[next].to,
      });
      editorInstance?.commands.focus();
    }
  };

  const handleFindPrev = () => {
    if (results.length > 0) {
      const prev = currentIndex === 0 ? results.length - 1 : currentIndex - 1;
      setCurrentIndex(prev);
      editorInstance?.commands.setTextSelection({
        from: results[prev].from,
        to: results[prev].to,
      });
      editorInstance?.commands.focus();
    }
  };

  const handleReplace = () => {
    if (query && replacement && editorInstance) {
      const content = editorInstance.getHTML();
      const updated = SearchService.replaceInDocument(content, query, replacement);
      editorInstance.commands.setContent(updated);
      setResults([]);
    }
  };

  const handleReplaceAll = () => {
    if (query && replacement && editorInstance) {
      const content = editorInstance.getHTML();
      const updated = SearchService.replaceInDocument(content, query, replacement);
      editorInstance.commands.setContent(updated);
      setResults([]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="search-panel">
      <div className="search-header">
        <span>{t('search.title')}</span>
        <button onClick={() => setIsOpen(false)} title={t('search.close')}>✕</button>
      </div>
      
      <div className="search-input-group">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('search.findPlaceholder')}
          autoFocus
        />
        <span className="search-count">
          {results.length > 0 ? `${currentIndex + 1}/${results.length}` : t('search.noResults')}
        </span>
      </div>

      <div className="search-actions">
        <button onClick={handleFindPrev} disabled={results.length === 0}>{t('edit.findPrevious')}</button>
        <button onClick={handleFindNext} disabled={results.length === 0}>{t('edit.findNext')}</button>
        <button onClick={() => setShowReplace(!showReplace)}>{t('search.replace')}</button>
      </div>

      {showReplace && (
        <div className="replace-group">
          <input
            type="text"
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
            placeholder={t('search.replacePlaceholder')}
          />
          <button onClick={handleReplace}>{t('search.replace')}</button>
          <button onClick={handleReplaceAll}>{t('search.replaceAll')}</button>
        </div>
      )}
    </div>
  );
}