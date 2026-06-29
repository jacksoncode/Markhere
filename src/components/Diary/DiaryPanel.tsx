import { useState, useEffect, useMemo } from 'react';
import { useFileStore } from '../../store/fileStore';
import { useTranslation } from '../../i18n';
import { invoke } from '@tauri-apps/api/core';
import { readDir } from '@tauri-apps/plugin-fs';
import type { DirEntry } from '@tauri-apps/plugin-fs';
import './DiaryPanel.css';

interface DiaryEntry {
  filename: string;
  path: string;
  date: Date;
  title: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parseDiaryDate(filename: string): Date | null {
  const patterns = [
    /^(\d{4})-(\d{2})-(\d{2})/,
    /^(\d{4})\.(\d{2})\.(\d{2})/,
    /^日记[^\d]*(\d{4})[年\-\.\/](\d{1,2})[月\-\.\/](\d{1,2})/,
  ];
  
  for (const pattern of patterns) {
    const match = filename.match(pattern);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10);
      const day = parseInt(match[3], 10);
      return new Date(year, month - 1, day);
    }
  }
  return null;
}

function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function DiaryPanel() {
  const { t } = useTranslation();
  const { currentPath, setCurrentPath } = useFileStore();
  const workspacePath = currentPath ? currentPath.substring(0, currentPath.lastIndexOf('/')) : null;
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    loadDiaryEntries();
  }, [workspacePath]);
  
  const loadDiaryEntries = async () => {
    if (!workspacePath) return;
    setLoading(true);
    
    try {
      const diaryPath = `${workspacePath}/diary`;
      let diaryDir: DirEntry[] = [];
      
      try {
        diaryDir = await readDir(diaryPath);
      } catch {
        diaryDir = await readDir(workspacePath);
      }
      
      const diaryFiles: DiaryEntry[] = [];
      
      for (const entry of diaryDir) {
        if (!entry.isFile || !entry.name.endsWith('.md')) continue;
        
        const date = parseDiaryDate(entry.name);
        if (date) {
          diaryFiles.push({
            filename: entry.name,
            path: `${diaryPath}/${entry.name}`,
            date,
            title: entry.name.replace('.md', ''),
          });
        }
      }
      
      diaryFiles.sort((a, b) => b.date.getTime() - a.date.getTime());
      setEntries(diaryFiles);
    } catch (err) {
      console.error('[DiaryPanel] Failed to load entries:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const entriesByDate = useMemo(() => {
    const map = new Map<string, DiaryEntry>();
    for (const entry of entries) {
      map.set(formatDateKey(entry.date), entry);
    }
    return map;
  }, [entries]);
  
  const calendarDays = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const days: (Date | null)[] = [];
    
    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }
    
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    
    return days;
  }, [selectedMonth]);
  
  const goToPrevMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1));
  };
  
  const goToNextMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1));
  };
  
  const goToToday = () => {
    setSelectedMonth(new Date());
  };
  
  const handleDayClick = (date: Date) => {
    const key = formatDateKey(date);
    const entry = entriesByDate.get(key);
    
    if (entry) {
      setCurrentPath(entry.path);
    } else {
      createNewDiary(date);
    }
  };
  
  const createNewDiary = async (date: Date) => {
    const filename = `${formatDateKey(date)}.md`;
    const diaryPath = workspacePath ? `${workspacePath}/diary` : '';
    const fullPath = diaryPath ? `${diaryPath}/${filename}` : filename;
    
    const content = `# 日记 - ${date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}

---

## 今日心情

> 记录今天的心情状态...

---

## 今日事件

### 上午
- 

### 下午
- 

### 晚上
- 

---

## 今日感悟

记录今天的思考、学习或感悟...

---

## 明日计划

- [ ] 
- [ ] 

---

*记录时间：${new Date().toLocaleTimeString('zh-CN')}*
`;
    
    try {
      if (diaryPath) {
        await invoke('create_dir', { path: diaryPath });
      }
      await invoke('write_file', { path: fullPath, content });
      setCurrentPath(fullPath);
      loadDiaryEntries();
    } catch (err) {
      console.error('[DiaryPanel] Failed to create diary:', err);
    }
  };
  
  const today = new Date();
  const todayKey = formatDateKey(today);
  
  return (
    <div className="diary-panel">
      <div className="diary-header">
        <div className="diary-nav">
          <button onClick={goToPrevMonth} className="diary-nav-btn" title="Previous month">
            ‹
          </button>
          <span className="diary-month-label">
            {MONTHS[selectedMonth.getMonth()]} {selectedMonth.getFullYear()}
          </span>
          <button onClick={goToNextMonth} className="diary-nav-btn" title="Next month">
            ›
          </button>
        </div>
        <button onClick={goToToday} className="diary-today-btn">
          {t('diary.today') || 'Today'}
        </button>
      </div>
      
      <div className="diary-calendar">
        <div className="diary-weekdays">
          {WEEKDAYS.map(day => (
            <div key={day} className="diary-weekday">{day}</div>
          ))}
        </div>
        
        <div className="diary-days">
          {calendarDays.map((date, idx) => {
            if (!date) {
              return <div key={idx} className="diary-day diary-day-empty" />;
            }
            
            const key = formatDateKey(date);
            const hasEntry = entriesByDate.has(key);
            const isToday = key === todayKey;
            
            return (
              <button
                key={idx}
                className={`diary-day ${isToday ? 'diary-day-today' : ''} ${hasEntry ? 'diary-day-has-entry' : ''}`}
                onClick={() => handleDayClick(date)}
                title={hasEntry ? `Open: ${entriesByDate.get(key)?.title}` : 'Create new entry'}
              >
                {date.getDate()}
                {hasEntry && <span className="diary-day-indicator">●</span>}
              </button>
            );
          })}
        </div>
      </div>
      
      {entries.length > 0 && (
        <div className="diary-entries-list">
          <h3 className="diary-entries-title">
            {t('diary.recentEntries') || 'Recent Entries'}
          </h3>
          {entries.slice(0, 10).map(entry => (
            <button
              key={entry.path}
              className={`diary-entry-item ${currentPath === entry.path ? 'diary-entry-active' : ''}`}
              onClick={() => setCurrentPath(entry.path)}
            >
              <span className="diary-entry-date">
                {entry.date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
              </span>
              <span className="diary-entry-title">{entry.title}</span>
            </button>
          ))}
        </div>
      )}
      
      {loading && <div className="diary-loading">{t('diary.loading') || 'Loading...'}</div>}
    </div>
  );
}

export default DiaryPanel;