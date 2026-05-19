import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from '../../i18n';
import './SpellCheck.css';

interface SpellError {
  word: string;
  message: string;
  suggestions: string[];
  offset: number;
  length: number;
  range: { start: number; end: number };
}

interface SpellCheckProps {
  content: string;
  onCorrect: (word: string, correction: string, range: { start: number; end: number }) => void;
  language?: string;
}

export function SpellCheck({ content, onCorrect, language = 'en-US' }: SpellCheckProps) {
  const { t } = useTranslation();
  const [errors, setErrors] = useState<SpellError[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [selectedError, setSelectedError] = useState<SpellError | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [hasChecked, setHasChecked] = useState(false);
  const [lastCheckedContent, setLastCheckedContent] = useState('');
  const [checkRequested, setCheckRequested] = useState(false);
  const checkIdRef = useRef(0);

  const triggerCheck = useCallback(() => {
    if (!content.trim()) return;
    setCheckRequested(true);
  }, [content]);

  useEffect(() => {
    if (!checkRequested) return;
    if (!content.trim()) {
      setCheckRequested(false);
      setIsChecking(false);
      return;
    }

    setIsChecking(true);
    setApiError(null);

    checkIdRef.current += 1;
    const checkId = checkIdRef.current;

    const timer = setTimeout(async () => {
      try {
        const response = await fetch('https://api.languagetoolplus.com/v2/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `text=${encodeURIComponent(content)}&language=${language}`,
        });

        if (checkId !== checkIdRef.current) return;

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        if (checkId !== checkIdRef.current) return;

        const spellErrors: SpellError[] = (data.matches || []).map((match: any) => ({
          word: content.substring(match.offset, match.offset + match.length),
          message: match.message || match.shortMessage || 'Spelling error',
          suggestions: match.replacements?.slice(0, 5).map((r: any) => r.value) || [],
          offset: match.offset,
          length: match.length,
          range: { start: match.offset, end: match.offset + match.length },
        }));

        setErrors(spellErrors);
        setHasChecked(true);
        setLastCheckedContent(content);
      } catch (err: any) {
        if (checkId !== checkIdRef.current) return;
        setApiError(err.message || t('spellCheck.failedToCheck'));
        setErrors([]);
      } finally {
        if (checkId === checkIdRef.current) {
          setIsChecking(false);
          setCheckRequested(false);
        }
      }
    }, 1500);

    return () => {
      clearTimeout(timer);
    };
  }, [content, checkRequested, language]);

  const isStale = hasChecked && !isChecking && content !== lastCheckedContent;

  const handleCorrect = (correction: string) => {
    if (selectedError) {
      onCorrect(selectedError.word, correction, selectedError.range);
      setErrors((prev) =>
        prev.filter(
          (e) => e.offset !== selectedError.offset || e.word !== selectedError.word
        )
      );
      setSelectedError(null);
      // Mark results as stale since content has changed due to the correction
      setLastCheckedContent('');
    }
  };

  const handleIgnore = () => {
    if (selectedError) {
      setErrors((prev) =>
        prev.filter(
          (e) => e.offset !== selectedError.offset || e.word !== selectedError.word
        )
      );
      setSelectedError(null);
    }
  };

  return (
    <div className="spell-check-panel">
      <div className="spell-check-header">
        <h3>{t('spellCheck.title')}</h3>
        <button
          className="check-spelling-btn"
          onClick={triggerCheck}
          disabled={isChecking || !content.trim()}
        >
          {isChecking ? t('spellCheck.checking') : t('spellCheck.checkSpelling')}
        </button>
      </div>

      {isChecking && (
        <div className="checking-status">
          <div className="spinner" />
          <span>{t('spellCheck.checkingSpelling')}</span>
        </div>
      )}

      {apiError && !isChecking && (
        <div className="api-error">
          <span className="error-icon">!</span>
          <span>{apiError}</span>
          <button className="retry-btn" onClick={triggerCheck}>
            {t('spellCheck.retry')}
          </button>
        </div>
      )}

      {!isChecking && !apiError && !hasChecked && (
        <div className="empty-state">
          <span>{t('spellCheck.clickToCheck')}</span>
        </div>
      )}

      {!isChecking && !apiError && hasChecked && errors.length === 0 && (
        <div className="no-errors">
          <span className="success-icon">&#10003;</span>
          <span>{t('spellCheck.noErrors')}</span>
        </div>
      )}

      {isStale && (
        <div className="stale-indicator">
          {t('spellCheck.textChanged')}
        </div>
      )}

      {errors.length > 0 && !isChecking && (
        <div className="errors-list">
          <div className="errors-summary">
            {errors.length === 1
              ? t('spellCheck.potentialError', undefined, { count: errors.length })
              : t('spellCheck.potentialError', undefined, { count: errors.length })}
          </div>

          {errors.map((error, index) => (
            <div
              key={index}
              className={`error-item ${
                selectedError?.offset === error.offset &&
                selectedError?.word === error.word
                  ? 'selected'
                  : ''
              }`}
              onClick={() => setSelectedError(error)}
            >
              <div className="error-main">
                <span className="error-word">{error.word}</span>
                <span className="error-type">{t('spellCheck.spelling')}</span>
              </div>
              <span className="error-message">{error.message}</span>
            </div>
          ))}
        </div>
      )}

      {selectedError && (
        <div className="correction-panel">
          <div className="correction-header">
            {t('spellCheck.suggestionsFor', undefined, { word: selectedError.word })}
          </div>
          <div className="suggestions-list">
            {selectedError.suggestions.length > 0 ? (
              selectedError.suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  className="suggestion-btn"
                  onClick={() => handleCorrect(suggestion)}
                >
                  {suggestion}
                </button>
              ))
            ) : (
              <div className="no-suggestions">{t('spellCheck.noSuggestions')}</div>
            )}
          </div>
          <button className="ignore-btn" onClick={handleIgnore}>
            {t('spellCheck.ignore')}
          </button>
        </div>
      )}
    </div>
  );
}

interface SpellCheckInlineProps {
  content: string;
  language?: string;
  onErrorClick?: () => void;
}

export function SpellCheckInline({
  content,
  language = 'en-US',
  onErrorClick,
}: SpellCheckInlineProps) {
  const { t } = useTranslation();
  const [errorCount, setErrorCount] = useState<number>(0);
  const [isChecking, setIsChecking] = useState(false);
  const checkIdRef = useRef(0);

  useEffect(() => {
    if (!content.trim()) {
      setErrorCount(0);
      setIsChecking(false);
      return;
    }

    setIsChecking(true);

    checkIdRef.current += 1;
    const checkId = checkIdRef.current;

    const timer = setTimeout(async () => {
      try {
        const response = await fetch('https://api.languagetoolplus.com/v2/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `text=${encodeURIComponent(content)}&language=${language}`,
        });

        if (checkId !== checkIdRef.current) return;

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        if (checkId !== checkIdRef.current) return;

        setErrorCount(data.matches?.length || 0);
      } catch {
        if (checkId !== checkIdRef.current) return;
        setErrorCount(0);
      } finally {
        if (checkId === checkIdRef.current) {
          setIsChecking(false);
        }
      }
    }, 1500);

    return () => {
      clearTimeout(timer);
    };
  }, [content, language]);

  return (
    <div
      className="spell-check-inline"
      onClick={onErrorClick}
      role="button"
      tabIndex={0}
    >
      {errorCount > 0 && !isChecking && (
        <div className="inline-indicator">
          <span className="error-count">{errorCount}</span>
          <span className="error-label">
            {t('spellCheck.spellingIssue', undefined, { count: errorCount })}
          </span>
        </div>
      )}
      {isChecking && errorCount === 0 && (
        <div className="inline-indicator checking">
          <span className="error-label">{t('spellCheck.checking')}</span>
        </div>
      )}
    </div>
  );
}
