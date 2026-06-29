import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useEditorState } from '../../store/editorStore';
import { useTabsStore, TabInfo } from '../../store/tabsStore';
import { useFileStore } from '../../store/fileStore';
import { SearchService, SearchResult, FileSearchResult } from '../../services/SearchService';
import { setSearchHighlight, clearSearchHighlight } from '../../extensions';
import { useTranslation } from '../../i18n';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import './SearchPanel.css';

type SearchScope = 'currentFile' | 'openFiles' | 'directory';

export function SearchPanel() {
  const { t } = useTranslation();
  const { editorInstance } = useEditorState();
  const { tabs, switchTab } = useTabsStore();
  const { setCurrentPath, setSavedContent } = useFileStore();

  // Core search state
  const [isOpen, setIsOpen] = useState(true);
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showReplace, setShowReplace] = useState(false);

  // Scope & multi-file state
  const [searchScope, setSearchScope] = useState<SearchScope>('currentFile');
  const [directoryPath, setDirectoryPath] = useState<string | null>(null);
  const [fileResults, setFileResults] = useState<FileSearchResult[]>([]);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState<{ current: number; total: number } | null>(null);

  // Search options
  const [useRegex, setUseRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [fileExtensionFilter, setFileExtensionFilter] = useState('md');

  // Debounce timer ref
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Search scope change: immediately clear editor highlights ---
  // This must run BEFORE the per-scope debounced effects so that
  // switching away from currentFile instantly removes decorations.
  useEffect(() => {
    if (searchScope !== 'currentFile') {
      clearSearchHighlight(editorInstance);
      setResults([]);
      setCurrentIndex(0);
    }
  }, [searchScope, editorInstance]);

  // --- Current File Search ---
  useEffect(() => {
    if (searchScope !== 'currentFile') return;

    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (query && editorInstance) {
        const content = editorInstance.getHTML();
        const found = SearchService.findInDocument(content, query, { useRegex, caseSensitive });
        setResults(found);
        setCurrentIndex(0);
        // Highlight matches in the editor itself.
        setSearchHighlight(editorInstance, {
          query,
          useRegex,
          caseSensitive,
          activeIndex: 0,
        });
      } else {
        setResults([]);
        clearSearchHighlight(editorInstance);
      }
    }, 300);

    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, editorInstance, useRegex, caseSensitive, searchScope]);

  // --- Open Files Search ---
  useEffect(() => {
    if (searchScope !== 'openFiles') return;

    // In multi-file scopes the user browses results in the panel — no editor highlights.
    clearSearchHighlight(editorInstance);

    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (!query.trim()) {
        setFileResults([]);
        return;
      }

      const allResults: FileSearchResult[] = [];

      for (const tab of tabs) {
        const matches = SearchService.findInDocument(tab.content, query, { useRegex, caseSensitive });
        if (matches.length > 0) {
          allResults.push({
            filePath: tab.path,
            fileName: tab.name,
            matches,
          });
        }
      }

      setFileResults(allResults);
      // Auto-expand all file groups
      const paths = new Set<string>();
      allResults.forEach((r) => paths.add(r.filePath));
      setExpandedFiles(paths);
    }, 300);

    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, tabs, useRegex, caseSensitive, searchScope]);

  // --- Directory Search ---
  useEffect(() => {
    if (searchScope !== 'directory' || !directoryPath) return;

    // In multi-file scopes the user browses results in the panel — no editor highlights.
    clearSearchHighlight(editorInstance);

    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      if (!query.trim()) {
        setFileResults([]);
        return;
      }

      setIsSearching(true);
      setSearchProgress(null);

      const extensions = fileExtensionFilter
        .split(',')
        .map((ext) => ext.trim().toLowerCase())
        .filter((ext) => ext.length > 0);

      try {
        const results = await SearchService.searchInDirectory(
          directoryPath,
          query,
          {
            useRegex,
            caseSensitive,
            fileExtensions: extensions.length > 0 ? extensions : ['md'],
          },
          (current, total) => {
            setSearchProgress({ current, total });
          },
        );

        setFileResults(results);
        const paths = new Set<string>();
        results.forEach((r) => paths.add(r.filePath));
        setExpandedFiles(paths);
      } catch (err) {
        console.error('Directory search failed:', err);
        setFileResults([]);
      } finally {
        setIsSearching(false);
        setSearchProgress(null);
      }
    }, 300);

    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, directoryPath, useRegex, caseSensitive, fileExtensionFilter, searchScope]);

  // --- Find/Replace Actions (current file only) ---
  const handleFindNext = useCallback(() => {
    if (results.length > 0) {
      const next = (currentIndex + 1) % results.length;
      setCurrentIndex(next);
      if (editorInstance) {
        editorInstance.commands.setTextSelection({
          from: results[next].from,
          to: results[next].to,
        });
        editorInstance.commands.focus();
        setSearchHighlight(editorInstance, { activeIndex: next });
      }
    }
  }, [results, currentIndex, editorInstance]);

  const handleFindPrev = useCallback(() => {
    if (results.length > 0) {
      const prev = currentIndex === 0 ? results.length - 1 : currentIndex - 1;
      setCurrentIndex(prev);
      if (editorInstance) {
        editorInstance.commands.setTextSelection({
          from: results[prev].from,
          to: results[prev].to,
        });
        editorInstance.commands.focus();
        setSearchHighlight(editorInstance, { activeIndex: prev });
      }
    }
  }, [results, currentIndex, editorInstance]);

  const handleReplace = useCallback(() => {
    if (query && replacement && editorInstance) {
      const content = editorInstance.getHTML();
      const updated = SearchService.replaceInDocument(content, query, replacement, { useRegex, caseSensitive });
      editorInstance.commands.setContent(updated);
      setResults([]);
      clearSearchHighlight(editorInstance);
    }
  }, [query, replacement, editorInstance, useRegex, caseSensitive]);

  const handleReplaceAll = useCallback(() => {
    if (query && replacement && editorInstance) {
      const content = editorInstance.getHTML();
      const updated = SearchService.replaceInDocument(content, query, replacement, { useRegex, caseSensitive });
      editorInstance.commands.setContent(updated);
      setResults([]);
      clearSearchHighlight(editorInstance);
    }
  }, [query, replacement, editorInstance, useRegex, caseSensitive]);

  // --- Directory Picker ---
  const handlePickDirectory = useCallback(async () => {
    try {
      const selected = await open({ directory: true, multiple: false, title: t('search.pickDirectory') });
      if (selected && typeof selected === 'string') {
        setDirectoryPath(selected);
        setFileResults([]);
        setExpandedFiles(new Set());
      }
    } catch (err) {
      console.error('Directory picker failed:', err);
    }
  }, [t]);

  // --- Open File from Results ---
  const handleOpenFile = useCallback(
    async (filePath: string) => {
      try {
        // Check if the file is already open in a tab
        const existingTab = tabs.find((tab) => tab.path === filePath);
        if (existingTab) {
          switchTab(existingTab.id);
          setCurrentPath(filePath);
          setSavedContent(existingTab.content);
          return;
        }

        // Read file content and open in a new tab
        const content = await invoke<string>('read_file', { path: filePath });
        const fileName = filePath.split('/').pop() || filePath;

        setCurrentPath(filePath);
        setSavedContent(content);
        editorInstance?.commands.setContent(content);

        // Also register in tabsStore via openTab
        const { openTab } = useTabsStore.getState();
        openTab(filePath, fileName, content);
      } catch (err) {
        console.error('Failed to open file:', err);
      }
    },
    [tabs, switchTab, setCurrentPath, setSavedContent, editorInstance],
  );

  // --- Toggle file group expansion ---
  const toggleFileExpanded = useCallback((filePath: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(filePath)) {
        next.delete(filePath);
      } else {
        next.add(filePath);
      }
      return next;
    });
  }, []);

  // --- Total match count across all files ---
  const totalMultiFileMatches = useMemo(() => {
    return fileResults.reduce((sum, fr) => sum + fr.matches.length, 0);
  }, [fileResults]);

  // --- Cleanup on unmount ---
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  const isMultiFile = searchScope === 'openFiles' || searchScope === 'directory';

  return (
    <div className="search-panel">
      {/* Header */}
      <div className="search-header">
        <span>{t('search.title')}</span>
        <button onClick={() => setIsOpen(false)} title={t('search.close')}>✕</button>
      </div>

      {/* Scope Selector */}
      <div className="search-scope-selector">
        <button
          className={`search-scope-btn ${searchScope === 'currentFile' ? 'active' : ''}`}
          onClick={() => setSearchScope('currentFile')}
        >
          {t('search.scopeCurrentFile')}
        </button>
        <button
          className={`search-scope-btn ${searchScope === 'openFiles' ? 'active' : ''}`}
          onClick={() => setSearchScope('openFiles')}
        >
          {t('search.scopeOpenFiles')}
        </button>
        <button
          className={`search-scope-btn ${searchScope === 'directory' ? 'active' : ''}`}
          onClick={() => setSearchScope('directory')}
        >
          {t('search.scopeDirectory')}
        </button>
      </div>

      {/* Directory Path Display & Picker */}
      {searchScope === 'directory' && (
        <div className="search-directory-row">
          <button className="search-pick-dir-btn" onClick={handlePickDirectory}>
            {t('search.pickDirectory')}
          </button>
          {directoryPath && (
            <span className="search-directory-path" title={directoryPath}>
              {directoryPath}
            </span>
          )}
        </div>
      )}

      {/* Search Input */}
      <div className="search-input-group">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={isMultiFile ? t('search.multiFilePlaceholder') : t('search.findPlaceholder')}
          autoFocus
        />
        {!isMultiFile && (
          <span className="search-count">
            {results.length > 0 ? `${currentIndex + 1}/${results.length}` : t('search.noResults')}
          </span>
        )}
        {isMultiFile && fileResults.length > 0 && (
          <span className="search-count">
            {totalMultiFileMatches} {t('search.matchesInFiles')}
          </span>
        )}
      </div>

      {/* Search Options */}
      <div className="search-options">
        <label className="search-option-label">
          <input
            type="checkbox"
            checked={useRegex}
            onChange={(e) => setUseRegex(e.target.checked)}
          />
          {t('search.useRegex')}
        </label>
        <label className="search-option-label">
          <input
            type="checkbox"
            checked={caseSensitive}
            onChange={(e) => setCaseSensitive(e.target.checked)}
          />
          {t('search.caseSensitive')}
        </label>
        {isMultiFile && (
          <div className="search-extension-filter">
            <input
              type="text"
              value={fileExtensionFilter}
              onChange={(e) => setFileExtensionFilter(e.target.value)}
              placeholder="md,txt,markdown"
              className="search-ext-input"
              title={t('search.fileExtensionFilter')}
            />
          </div>
        )}
      </div>

      {/* Search Progress Indicator */}
      {isSearching && searchProgress && (
        <div className="search-progress">
          <div className="search-progress-bar">
            <div
              className="search-progress-fill"
              style={{ width: `${(searchProgress.current / searchProgress.total) * 100}%` }}
            />
          </div>
          <span className="search-progress-text">
            {t('search.searchingProgress', undefined, {
              current: String(searchProgress.current),
              total: String(searchProgress.total),
            })}
          </span>
        </div>
      )}

      {/* Actions row (for current file mode) */}
      {searchScope === 'currentFile' && (
        <>
          <div className="search-actions">
            <button onClick={handleFindPrev} disabled={results.length === 0}>
              {t('edit.findPrevious')}
            </button>
            <button onClick={handleFindNext} disabled={results.length === 0}>
              {t('edit.findNext')}
            </button>
            <button onClick={() => setShowReplace(!showReplace)}>
              {t('search.replace')}
            </button>
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
        </>
      )}

      {/* Multi-file Results */}
      {isMultiFile && fileResults.length > 0 && (
        <div className="search-multi-results">
          {fileResults.map((fileResult) => {
            const isExpanded = expandedFiles.has(fileResult.filePath);
            const isOpenInTabs = tabs.some((tab: TabInfo) => tab.path === fileResult.filePath);

            return (
              <div key={fileResult.filePath} className="search-file-group">
                {/* File group header */}
                <div className="search-file-header">
                  <button
                    className="search-file-toggle"
                    onClick={() => toggleFileExpanded(fileResult.filePath)}
                    title={isExpanded ? t('search.collapse') : t('search.expand')}
                  >
                    <span className={`search-file-chevron ${isExpanded ? 'open' : ''}`}>&#9656;</span>
                  </button>
                  <div className="search-file-info" onClick={() => toggleFileExpanded(fileResult.filePath)}>
                    <span className="search-file-name">
                      {isOpenInTabs && <span className="search-file-open-indicator" title={t('search.alreadyOpen')}>&#9679;</span>}
                      {fileResult.fileName}
                    </span>
                    <span className="search-file-count">
                      {fileResult.matches.length} {t('search.matches')}
                    </span>
                  </div>
                  <button
                    className="search-open-file-btn"
                    onClick={() => handleOpenFile(fileResult.filePath)}
                    title={t('search.openFile')}
                  >
                    {t('search.openFile')}
                  </button>
                </div>

                {/* Expanded match previews */}
                {isExpanded && (
                  <div className="search-file-matches">
                    {fileResult.matches.map((match, mIdx) => (
                      <div key={mIdx} className="search-match-item">
                        <span className="search-match-index">
                          {searchScope === 'directory'
                            ? t('search.lineNumber', undefined, { line: String(mIdx + 1) })
                            : String(mIdx + 1)}
                        </span>
                        <span
                          className="search-match-text"
                          onClick={() => handleOpenFile(fileResult.filePath)}
                        >
                          <span className="search-match-highlight">{match.text}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state for multi-file search */}
      {isMultiFile && query.trim() && fileResults.length === 0 && !isSearching && (
        <div className="search-no-results-multi">
          {searchScope === 'directory' && !directoryPath
            ? t('search.selectDirectoryHint')
            : t('search.noResults')}
        </div>
      )}
    </div>
  );
}
