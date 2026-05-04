import { useState, useEffect, useCallback } from 'react';
import './SpellCheck.css';

interface SpellError {
  word: string;
  suggestions: string[];
  range: { start: number; end: number };
}

interface SpellCheckProps {
  content: string;
  onCorrect: (word: string, correction: string, range: { start: number; end: number }) => void;
  language?: string;
}

export function SpellCheck({ content, onCorrect, language = 'en-US' }: SpellCheckProps) {
  const [errors, setErrors] = useState<SpellError[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [selectedError, setSelectedError] = useState<SpellError | null>(null);

  const checkSpelling = useCallback(async () => {
    if (!content.trim()) {
      setErrors([]);
      return;
    }

    setIsChecking(true);
    
    const words = content.match(/\b[a-zA-Z]+\b/g) || [];
    const uniqueWords = [...new Set(words)];
    
    const spellErrors: SpellError[] = [];
    
    for (const word of uniqueWords) {
      if (word.length < 3) continue;
      
      try {
        const response = await fetch(
          `https://api.languagetoolplus.com/v2/check?text=${word}&language=${language}`
        );
        const data = await response.json();
        
        if (data.matches && data.matches.length > 0) {
          const match = data.matches[0];
          const wordIndex = content.indexOf(word);
          
          spellErrors.push({
            word,
            suggestions: match.replacements?.slice(0, 5).map((r: any) => r.value) || [],
            range: { start: wordIndex, end: wordIndex + word.length },
          });
        }
      } catch {
        // Fallback: use browser spellcheck if API fails
        if (typeof window !== 'undefined' && 'spellcheck' in document.body) {
          // Browser's built-in spellcheck will handle this
        }
      }
    }
    
    setErrors(spellErrors);
    setIsChecking(false);
  }, [content, language]);

  useEffect(() => {
    const debounce = setTimeout(checkSpelling, 1000);
    return () => clearTimeout(debounce);
  }, [checkSpelling]);

  const handleCorrect = (correction: string) => {
    if (selectedError) {
      onCorrect(selectedError.word, correction, selectedError.range);
      setErrors(errors.filter((e) => e.word !== selectedError.word));
      setSelectedError(null);
    }
  };

  const handleIgnore = () => {
    if (selectedError) {
      setErrors(errors.filter((e) => e.word !== selectedError.word));
      setSelectedError(null);
    }
  };

  return (
    <div className="spell-check-panel">
      <div className="spell-check-header">
        <h3>Spell Check</h3>
        {isChecking && <span className="checking-indicator">Checking...</span>}
      </div>

      {errors.length === 0 ? (
        <div className="no-errors">
          <span className="success-icon">✓</span>
          <span>No spelling errors found</span>
        </div>
      ) : (
        <div className="errors-list">
          <div className="errors-summary">
            {errors.length} potential errors
          </div>
          
          {errors.map((error, index) => (
            <div
              key={index}
              className={`error-item ${selectedError?.word === error.word ? 'selected' : ''}`}
              onClick={() => setSelectedError(error)}
            >
              <span className="error-word">{error.word}</span>
              <span className="error-type">Spelling</span>
            </div>
          ))}
        </div>
      )}

      {selectedError && (
        <div className="correction-panel">
          <div className="correction-header">
            Suggestions for "{selectedError.word}"
          </div>
          <div className="suggestions-list">
            {selectedError.suggestions.length > 0 ? (
              selectedError.suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  className="suggestion-btn"
                  onClick={() => handleCorrect(suggestion)}
                >
                  {suggestion}
                </button>
              ))
            ) : (
              <div className="no-suggestions">No suggestions available</div>
            )}
          </div>
          <button className="ignore-btn" onClick={handleIgnore}>
            Ignore
          </button>
        </div>
      )}
    </div>
  );
}

export function SpellCheckInline({ 
  content
}: { 
  content: string; 
}) {
  const [errors, setErrors] = useState<SpellError[]>([]);
  
  useEffect(() => {
    if (!content.trim()) {
      setErrors([]);
      return;
    }
    
    const words = content.match(/\b[a-zA-Z]+\b/g) || [];
    const uniqueWords = [...new Set(words)];
    
    const spellErrors: SpellError[] = uniqueWords
      .filter(word => word.length >= 3)
      .map(word => {
        const wordIndex = content.indexOf(word);
        return {
          word,
          suggestions: [],
          range: { start: wordIndex, end: wordIndex + word.length },
        };
      });
    
    setErrors(spellErrors);
  }, [content]);

  return (
    <div className="spell-check-inline">
      {errors.length > 0 && (
        <div className="inline-indicator">
          <span className="error-count">{errors.length}</span>
          <span className="error-label">spelling issues</span>
        </div>
      )}
    </div>
  );
}