import { useState, useEffect, useMemo, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation } from '../../i18n';
import { useTabsStore, TabInfo } from '../../store/tabsStore';
import { useFileStore } from '../../store/fileStore';
import { useNotificationStore } from '../Notification/Notification';
import './QuickOpenPanel.css';

interface QuickOpenPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResult {
  type: 'tab' | 'file';
  path: string;
  name: string;
  content?: string;
}

export function QuickOpenPanel({ isOpen, onClose }: QuickOpenPanelProps) {
  const { t } = useTranslation();
  const { tabs, switchTab } = useTabsStore();
  const { setCurrentPath, setSavedContent } = useFileStore();
  const notify = useNotificationStore((s) => s.notify);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [files, setFiles] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      inputRef.current?.focus();
      loadFiles();
    }
  }, [isOpen]);
  
  const loadFiles = async () => {
    try {
      const recentFilesStr = localStorage.getItem('markhere-recent-files');
      if (recentFilesStr) {
        const parsed = JSON.parse(recentFilesStr);
        // Validate: must be an array of strings
        if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
          setFiles(parsed);
        } else {
          // Invalid format, clear and use empty array
          setFiles([]);
        }
      }
    } catch (err) {
      console.error('Load files failed:', err);
      notify('error', `Failed to load recent files: ${(err as Error).message || String(err)}`);
    }
  };

  const results = useMemo(() => {
    const searchResults: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();
    
    tabs.forEach((tab: TabInfo) => {
      if (tab.name.toLowerCase().includes(lowerQuery) || 
          tab.path.toLowerCase().includes(lowerQuery)) {
        searchResults.push({
          type: 'tab',
          path: tab.path,
          name: tab.name,
          content: tab.content,
        });
      }
    });
    
    files.forEach((file: string) => {
      const name = file.split('/').pop() || file;
      if (name.toLowerCase().includes(lowerQuery) || 
          file.toLowerCase().includes(lowerQuery)) {
        const isAlreadyOpen = tabs.some((t: TabInfo) => t.path === file);
        if (!isAlreadyOpen) {
          searchResults.push({
            type: 'file',
            path: file,
            name: name,
          });
        }
      }
    });
    
    return searchResults;
  }, [query, tabs, files]);
  
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results.length > 0) {
      e.preventDefault();
      selectResult(results[selectedIndex]);
    }
  };
  
  const selectResult = async (result: SearchResult) => {
    if (result.type === 'tab') {
      const tab = tabs.find((t: TabInfo) => t.path === result.path);
      if (tab) {
        switchTab(tab.id);
        setCurrentPath(tab.path);
        setSavedContent(tab.content);
      }
    } else {
      try {
        const content = await invoke<string>('read_file', { path: result.path });
        setCurrentPath(result.path);
        setSavedContent(content);
      } catch (err) {
        console.error('Open file failed:', err);
        notify('error', `Failed to open file: ${(err as Error).message || String(err)}`);
      }
    }
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="quick-open-overlay" onClick={onClose}>
      <div className="quick-open-panel" onClick={(e) => e.stopPropagation()}>
        <div className="quick-open-input-wrapper">
          <input
            ref={inputRef}
            type="text"
            className="quick-open-input"
            placeholder={t('quickOpen.placeholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        
        <div className="quick-open-results">
          {results.length === 0 && query && (
            <div className="quick-open-empty">
              {t('quickOpen.noResults')}
            </div>
          )}
          
          {results.map((result, index) => (
            <div
              key={`${result.type}-${result.path}`}
              className={`quick-open-item ${index === selectedIndex ? 'selected' : ''}`}
              onClick={() => selectResult(result)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <span className="quick-open-icon">
                {result.type === 'tab' ? '📑' : '📄'}
              </span>
              <span className="quick-open-name">{result.name}</span>
              <span className="quick-open-path">{result.path}</span>
            </div>
          ))}
        </div>
        
        <div className="quick-open-footer">
          <span className="quick-open-hint">
            <kbd>↑↓</kbd> {t('quickOpen.navigate')}
            <kbd>Enter</kbd> {t('quickOpen.open')}
            <kbd>Esc</kbd> {t('quickOpen.close')}
          </span>
        </div>
      </div>
    </div>
  );
}