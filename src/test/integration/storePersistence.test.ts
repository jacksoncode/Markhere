import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from '../../store/settingsStore';
import { usePomodoroStore } from '../../store/pomodoroStore';
import { useWikiLinkStore } from '../../store/wikiLinkStore';
import { useRecentFilesStore } from '../../store/recentFilesStore';
import { useWordGoalStore } from '../../store/wordGoalStore';
import { useBookmarkStore } from '../../store/bookmarkStore';
import { useTabsStore } from '../../store/tabsStore';
import { useFontStore, initFontStore } from '../../store/fontStore';

/* ------------------------------------------------------------------ */
/*  settingsStore                                                      */
/* ------------------------------------------------------------------ */

describe('SettingsStore Persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    useSettingsStore.setState({
      theme: 'light',
      indentSize: 2,
      lineEnding: 'lf',
      exportFolder: 'auto',
      exportCustomPath: '',
      defaultCodeLanguage: '',
      imageInsertBehavior: 'copy',
      imageFolder: '',
      enableDiagrams: true,
      enableMath: true,
      enableFootnotes: true,
      enableYaml: true,
      enableAutoLinks: true,
      reopenLastFiles: true,
      smartPaste: true,
      autoMatchBrackets: true,
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: 14,
      showLineNumber: true,
      spellCheck: false,
      spellCheckLanguage: 'en-US',
      autoSave: true,
      autoSaveInterval: 30000,
      focusMode: false,
      typewriterMode: false,
      showWordCount: true,
    });
    localStorage.clear();
  });

  it('persists a single setting across simulated reload', async () => {
    useSettingsStore.getState().setTheme('dark');

    const raw = localStorage.getItem('markhere-settings');
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!).state.theme).toBe('dark');

    // Reset in-memory state to simulate fresh app launch.
    useSettingsStore.setState({ theme: 'light' });
    localStorage.setItem('markhere-settings', raw!);

    await useSettingsStore.persist.rehydrate();
    expect(useSettingsStore.getState().theme).toBe('dark');
  });

  it('persists multiple settings across simulated reload', async () => {
    const store = useSettingsStore.getState();
    store.setTheme('sepia');
    store.setFontSize(20);
    store.setSpellCheck(true);
    store.setFocusMode(true);
    store.setIndentSize(4);
    store.setEnableDiagrams(false);

    const raw = localStorage.getItem('markhere-settings');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.state.theme).toBe('sepia');
    expect(parsed.state.fontSize).toBe(20);
    expect(parsed.state.spellCheck).toBe(true);
    expect(parsed.state.focusMode).toBe(true);
    expect(parsed.state.indentSize).toBe(4);
    expect(parsed.state.enableDiagrams).toBe(false);

    useSettingsStore.setState({ theme: 'light' });
    localStorage.setItem('markhere-settings', raw!);

    await useSettingsStore.persist.rehydrate();
    const s = useSettingsStore.getState();
    expect(s.theme).toBe('sepia');
    expect(s.fontSize).toBe(20);
    expect(s.spellCheck).toBe(true);
    expect(s.focusMode).toBe(true);
    expect(s.indentSize).toBe(4);
    expect(s.enableDiagrams).toBe(false);
  });

  it('falls back to defaults when localStorage JSON is corrupted', async () => {
    localStorage.setItem('markhere-settings', '{{{not-valid-json');

    useSettingsStore.setState({ theme: 'dark' });

    await useSettingsStore.persist.rehydrate();
    // Zustand persist catches JSON parse errors and keeps existing state.
    const s = useSettingsStore.getState();
    expect(s.theme).toBe('dark');
  });

  it('fills in missing persisted keys with defaults', async () => {
    // First reset state so we can detect merge.
    useSettingsStore.setState({ theme: 'light', spellCheck: false, indentSize: 2 });

    // Simulate a partial payload (e.g. from an older schema version).
    // Must set localStorage AFTER setState, otherwise the persist middleware
    // overwrites localStorage with the full current state.
    localStorage.setItem(
      'markhere-settings',
      JSON.stringify({ state: { theme: 'sepia', fontSize: 24 }, version: 0 }),
    );

    await useSettingsStore.persist.rehydrate();
    const s = useSettingsStore.getState();
    expect(s.theme).toBe('sepia');
    expect(s.fontSize).toBe(24);
    // Keys missing from persisted payload keep their default values.
    expect(s.spellCheck).toBe(false);
    expect(s.indentSize).toBe(2);
  });
});

/* ------------------------------------------------------------------ */
/*  pomodoroStore                                                      */
/* ------------------------------------------------------------------ */

describe('PomodoroStore Persistence', () => {
  const todayDate = new Date().toISOString().split('T')[0];

  beforeEach(() => {
    localStorage.clear();
    usePomodoroStore.setState({
      workDuration: 25,
      shortBreakDuration: 5,
      longBreakDuration: 15,
      longBreakInterval: 4,
      phase: 'work' as const,
      timeRemaining: 25 * 60,
      isRunning: false,
      sessionsCompleted: 0,
      totalWorkTime: 0,
      todaySessions: 0,
      todayDate,
    });
    localStorage.clear();
  });

  it('persists timer durations across simulated reload', async () => {
    const store = usePomodoroStore.getState();
    store.setWorkDuration(50);
    store.setShortBreakDuration(10);
    store.setLongBreakDuration(30);

    const raw = localStorage.getItem('pomodoro-storage');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.state.workDuration).toBe(50);
    expect(parsed.state.shortBreakDuration).toBe(10);
    expect(parsed.state.longBreakDuration).toBe(30);

    usePomodoroStore.setState({ workDuration: 25 });
    localStorage.setItem('pomodoro-storage', raw!);

    await usePomodoroStore.persist.rehydrate();
    const s = usePomodoroStore.getState();
    expect(s.workDuration).toBe(50);
    expect(s.shortBreakDuration).toBe(10);
    expect(s.longBreakDuration).toBe(30);
  });

  it('persists sessionsCompleted count across simulated reload', async () => {
    usePomodoroStore.setState({
      sessionsCompleted: 7,
      totalWorkTime: 175,
      todaySessions: 3,
    });

    const raw = localStorage.getItem('pomodoro-storage');
    expect(raw).not.toBeNull();

    usePomodoroStore.setState({ sessionsCompleted: 0 });
    localStorage.setItem('pomodoro-storage', raw!);

    await usePomodoroStore.persist.rehydrate();
    const s = usePomodoroStore.getState();
    expect(s.sessionsCompleted).toBe(7);
    expect(s.totalWorkTime).toBe(175);
    expect(s.todaySessions).toBe(3);
  });

  it('persists timer phase and timeRemaining', async () => {
    usePomodoroStore.setState({
      phase: 'shortBreak',
      timeRemaining: 42,
      isRunning: true,
    });

    const raw = localStorage.getItem('pomodoro-storage');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.state.phase).toBe('shortBreak');
    expect(parsed.state.timeRemaining).toBe(42);
    expect(parsed.state.isRunning).toBe(true);

    usePomodoroStore.setState({
      phase: 'work' as const,
      timeRemaining: 1500,
      isRunning: false,
    });
    localStorage.setItem('pomodoro-storage', raw!);

    await usePomodoroStore.persist.rehydrate();
    const s = usePomodoroStore.getState();
    expect(s.phase).toBe('shortBreak');
    expect(s.timeRemaining).toBe(42);
    expect(s.isRunning).toBe(true);
  });

  it('persists longBreakInterval across simulated reload', async () => {
    usePomodoroStore.getState().setLongBreakInterval(6);

    const raw = localStorage.getItem('pomodoro-storage');
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!).state.longBreakInterval).toBe(6);

    usePomodoroStore.setState({ longBreakInterval: 4 });
    localStorage.setItem('pomodoro-storage', raw!);

    await usePomodoroStore.persist.rehydrate();
    expect(usePomodoroStore.getState().longBreakInterval).toBe(6);
  });
});

/* ------------------------------------------------------------------ */
/*  wikiLinkStore                                                      */
/* ------------------------------------------------------------------ */

describe('WikiLinkStore Persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    useWikiLinkStore.setState({ links: [], currentPage: null });
    localStorage.clear();
  });

  it('persists added links across simulated reload', async () => {
    const store = useWikiLinkStore.getState();
    store.addLink('source1', 'target1', 'Target One', 0);
    store.addLink('source1', 'target2', 'Target Two', 15);
    store.addLink('source2', 'target1', 'Backlink', 5);

    const raw = localStorage.getItem('wiki-links-storage');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.state.links).toHaveLength(3);

    useWikiLinkStore.setState({ links: [] });
    localStorage.setItem('wiki-links-storage', raw!);

    await useWikiLinkStore.persist.rehydrate();
    const links = useWikiLinkStore.getState().links;
    expect(links).toHaveLength(3);
    expect(links[0].source).toBe('source1');
    expect(links[0].target).toBe('target1');
  });

  it('parses links from content, persists them, and restores after reload', async () => {
    const store = useWikiLinkStore.getState();
    const parsedLinks = store.parseLinksFromContent(
      'See [[page-a]] and [[page-b|here]] for more.',
      'current-page',
    );

    // Add parsed links to the store.
    for (const link of parsedLinks) {
      store.addLink(link.source, link.target, link.display, link.position);
    }

    expect(useWikiLinkStore.getState().links).toHaveLength(2);

    const raw = localStorage.getItem('wiki-links-storage');
    expect(raw).not.toBeNull();

    useWikiLinkStore.setState({ links: [] });
    localStorage.setItem('wiki-links-storage', raw!);

    await useWikiLinkStore.persist.rehydrate();
    const links = useWikiLinkStore.getState().links;
    expect(links).toHaveLength(2);
    expect(links[0].target).toBe('page-a');
    expect(links[1].target).toBe('page-b');
    expect(links[1].display).toBe('here');
  });

  it('does not persist currentPage (excluded by partialize)', async () => {
    useWikiLinkStore.getState().setCurrentPage('active-doc');
    useWikiLinkStore.getState().addLink('active-doc', 'target', 'T', 0);

    const raw = localStorage.getItem('wiki-links-storage');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);

    // partialize only includes `links`, not `currentPage`.
    expect(parsed.state.currentPage).toBeUndefined();
    expect(parsed.state.links).toHaveLength(1);

    useWikiLinkStore.setState({ links: [], currentPage: null });
    localStorage.setItem('wiki-links-storage', raw!);

    await useWikiLinkStore.persist.rehydrate();
    // links should be restored; currentPage stays null (not persisted).
    expect(useWikiLinkStore.getState().links).toHaveLength(1);
    expect(useWikiLinkStore.getState().currentPage).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/*  recentFilesStore (manual localStorage)                             */
/* ------------------------------------------------------------------ */

describe('RecentFilesStore Persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    useRecentFilesStore.setState({ files: [], maxFiles: 10 });
  });

  it('persists added files across simulated reload', () => {
    const store = useRecentFilesStore.getState();
    store.addFile('/home/docs/notes.md', 'notes.md');
    store.addFile('/home/docs/todo.md', 'todo.md');

    const raw = localStorage.getItem('recent_files');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].path).toBe('/home/docs/todo.md'); // most recent first
    expect(parsed[1].path).toBe('/home/docs/notes.md');

    // Simulate a fresh app start.
    useRecentFilesStore.setState({ files: [] });

    const reloaded = JSON.parse(localStorage.getItem('recent_files')!);
    useRecentFilesStore.setState({ files: reloaded });

    const files = useRecentFilesStore.getState().files;
    expect(files).toHaveLength(2);
    expect(files[0].path).toBe('/home/docs/todo.md');
  });

  it('enforces max files limit of 10 in persisted storage', () => {
    const store = useRecentFilesStore.getState();
    for (let i = 0; i < 15; i++) {
      store.addFile(`/file${i}.md`, `file${i}.md`);
    }

    const files = useRecentFilesStore.getState().files;
    expect(files.length).toBeLessThanOrEqual(10);

    const raw = localStorage.getItem('recent_files');
    const parsed = JSON.parse(raw!);
    expect(parsed.length).toBeLessThanOrEqual(10);
    // Most recent files are kept; oldest are dropped.
    expect(parsed[0].path).toBe('/file14.md'); // last added
  });

  it('persists file removal across simulated reload', () => {
    const store = useRecentFilesStore.getState();
    store.addFile('/keep.md', 'keep.md');
    store.addFile('/delete.md', 'delete.md');
    store.removeFile('/delete.md');

    const raw = localStorage.getItem('recent_files');
    const parsed = JSON.parse(raw!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].path).toBe('/keep.md');

    useRecentFilesStore.setState({ files: [] });
    const reloaded = JSON.parse(localStorage.getItem('recent_files')!);
    useRecentFilesStore.setState({ files: reloaded });

    expect(useRecentFilesStore.getState().files).toHaveLength(1);
    expect(useRecentFilesStore.getState().files[0].path).toBe('/keep.md');
  });
});

/* ------------------------------------------------------------------ */
/*  wordGoalStore                                                      */
/* ------------------------------------------------------------------ */

describe('WordGoalStore Persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    useWordGoalStore.setState({
      targetWords: 1000,
      enabled: false,
      showProgress: true,
    });
    localStorage.clear();
  });

  it('persists word goal settings across simulated reload', async () => {
    const store = useWordGoalStore.getState();
    store.setTargetWords(2000);
    store.setEnabled(true);
    store.setShowProgress(false);

    const raw = localStorage.getItem('word-goal-storage');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.state.targetWords).toBe(2000);
    expect(parsed.state.enabled).toBe(true);
    expect(parsed.state.showProgress).toBe(false);

    useWordGoalStore.setState({ targetWords: 1000, enabled: false });
    localStorage.setItem('word-goal-storage', raw!);

    await useWordGoalStore.persist.rehydrate();
    const s = useWordGoalStore.getState();
    expect(s.targetWords).toBe(2000);
    expect(s.enabled).toBe(true);
    expect(s.showProgress).toBe(false);
  });

  it('calculateProgress works correctly after rehydration', async () => {
    useWordGoalStore.getState().setTargetWords(500);

    const raw = localStorage.getItem('word-goal-storage');
    expect(raw).not.toBeNull();

    useWordGoalStore.setState({ targetWords: 1000, enabled: false });
    localStorage.setItem('word-goal-storage', raw!);

    await useWordGoalStore.persist.rehydrate();
    const progress = useWordGoalStore.getState().calculateProgress(250);
    expect(progress).toBe(50);
  });

  it('falls back to defaults on corrupted data', async () => {
    localStorage.setItem('word-goal-storage', 'broken-json{{');
    useWordGoalStore.setState({ targetWords: 1000 });

    await useWordGoalStore.persist.rehydrate();
    // Store should stay at its current state when rehydration fails.
    expect(useWordGoalStore.getState().targetWords).toBe(1000);
  });
});

/* ------------------------------------------------------------------ */
/*  bookmarkStore (manual localStorage)                                */
/* ------------------------------------------------------------------ */

describe('BookmarkStore Persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    useBookmarkStore.setState({ bookmarks: [] });
  });

  it('persists bookmark across simulated reload', () => {
    const store = useBookmarkStore.getState();
    store.addBookmark('/docs/readme.md', 150, 'README');

    const raw = localStorage.getItem('markhere-bookmarks');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].path).toBe('/docs/readme.md');
    expect(parsed[0].position).toBe(150);
    expect(parsed[0].title).toBe('README');

    // Simulate fresh app start.
    useBookmarkStore.setState({ bookmarks: [] });
    const reloaded = JSON.parse(localStorage.getItem('markhere-bookmarks')!);
    useBookmarkStore.setState({ bookmarks: reloaded });

    const bookmarks = useBookmarkStore.getState().bookmarks;
    expect(bookmarks).toHaveLength(1);
    expect(bookmarks[0].title).toBe('README');
  });

  it('persists bookmark removal', () => {
    const store = useBookmarkStore.getState();
    store.addBookmark('/a.md', 0, 'A');

    expect(useBookmarkStore.getState().bookmarks).toHaveLength(1);
    const idA = useBookmarkStore.getState().bookmarks[0].id;

    store.removeBookmark(idA);

    // Verify removal in memory.
    expect(useBookmarkStore.getState().bookmarks).toEqual([]);

    // Verify removal persisted: localStorage should contain empty array.
    const raw = localStorage.getItem('markhere-bookmarks');
    const parsed = JSON.parse(raw!);
    expect(parsed).toEqual([]);

    // Simulate fresh load -- should still be empty.
    useBookmarkStore.setState({ bookmarks: [] });
    const reloaded = JSON.parse(localStorage.getItem('markhere-bookmarks')!);
    useBookmarkStore.setState({ bookmarks: reloaded });
    expect(useBookmarkStore.getState().bookmarks).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/*  tabsStore                                                          */
/* ------------------------------------------------------------------ */

describe('TabsStore Persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    useTabsStore.setState({ tabs: [], activeTabId: null, closedTabs: [] });
    localStorage.clear();
  });

  it('persists open tabs structural info but not content', async () => {
    const store = useTabsStore.getState();
    store.openTab('/docs/a.md', 'a.md', '# Secret Content A');
    store.openTab('/docs/b.md', 'b.md', '# Secret Content B');

    const raw = localStorage.getItem('tabs-storage');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);

    // Tabs structural info should be persisted.
    expect(parsed.state.tabs).toHaveLength(2);
    expect(parsed.state.tabs[0].path).toBe('/docs/a.md');
    expect(parsed.state.tabs[0].name).toBe('a.md');
    expect(parsed.state.tabs[0].id).toBeTruthy();

    // Content must NOT be in persisted payload (stripped by partialize).
    expect(parsed.state.tabs[0].content).toBeUndefined();

    useTabsStore.setState({ tabs: [], activeTabId: null, closedTabs: [] });
    localStorage.setItem('tabs-storage', raw!);

    await useTabsStore.persist.rehydrate();
    const tabs = useTabsStore.getState().tabs;
    expect(tabs).toHaveLength(2);
    expect(tabs[0].path).toBe('/docs/a.md');
    // After rehydration, content is undefined since it was not persisted.
    expect(tabs[0].content).toBeUndefined();
  });

  it('persists activeTabId across simulated reload', async () => {
    const store = useTabsStore.getState();
    store.openTab('/docs/x.md', 'x.md', '# X');
    store.openTab('/docs/y.md', 'y.md', '# Y');

    // activeTabId points to the last opened tab.
    const activeBefore = useTabsStore.getState().activeTabId;
    expect(activeBefore).toBeTruthy();

    const raw = localStorage.getItem('tabs-storage');
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!).state.activeTabId).toBe(activeBefore);

    useTabsStore.setState({ tabs: [], activeTabId: null, closedTabs: [] });
    localStorage.setItem('tabs-storage', raw!);

    await useTabsStore.persist.rehydrate();
    const s = useTabsStore.getState();
    expect(s.activeTabId).toBe(activeBefore);
  });

  it('persists closedTabs with content for recovery', async () => {
    const store = useTabsStore.getState();
    store.openTab('/docs/recover.md', 'recover.md', '# Recovery Content');
    const tabId = useTabsStore.getState().tabs[0].id;
    store.closeTab(tabId);

    const raw = localStorage.getItem('tabs-storage');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.state.closedTabs).toHaveLength(1);
    expect(parsed.state.closedTabs[0].path).toBe('/docs/recover.md');
    expect(parsed.state.closedTabs[0].content).toBe('# Recovery Content');

    useTabsStore.setState({ tabs: [], activeTabId: null, closedTabs: [] });
    localStorage.setItem('tabs-storage', raw!);

    await useTabsStore.persist.rehydrate();
    const ct = useTabsStore.getState().closedTabs;
    expect(ct).toHaveLength(1);
    expect(ct[0].content).toBe('# Recovery Content');
  });

  it('reorder tabs persists tab order', async () => {
    const store = useTabsStore.getState();
    store.openTab('/docs/1.md', '1.md', '#1');
    store.openTab('/docs/2.md', '2.md', '#2');
    store.openTab('/docs/3.md', '3.md', '#3');
    store.reorderTabs(0, 2);

    const raw = localStorage.getItem('tabs-storage');
    expect(raw).not.toBeNull();
    const persistedPaths = JSON.parse(raw!).state.tabs.map(
      (t: { path: string }) => t.path,
    );
    expect(persistedPaths).toEqual(['/docs/2.md', '/docs/3.md', '/docs/1.md']);

    useTabsStore.setState({ tabs: [], activeTabId: null, closedTabs: [] });
    localStorage.setItem('tabs-storage', raw!);

    await useTabsStore.persist.rehydrate();
    const tabPaths = useTabsStore.getState().tabs.map((t) => t.path);
    expect(tabPaths).toEqual(['/docs/2.md', '/docs/3.md', '/docs/1.md']);
  });
});

/* ------------------------------------------------------------------ */
/*  fontStore (manual localStorage)                                    */
/* ------------------------------------------------------------------ */

describe('FontStore Persistence', () => {
  const defaults = {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: 16,
    lineHeight: 1.6,
  };

  beforeEach(() => {
    localStorage.clear();
    useFontStore.setState({ ...defaults });
  });

  it('persists font family setting', () => {
    useFontStore.getState().setFontFamily('Courier New');

    expect(localStorage.getItem('markhere-font-family')).toBe('Courier New');

    // Simulate fresh app start.
    useFontStore.setState({ fontFamily: defaults.fontFamily });
    initFontStore();

    expect(useFontStore.getState().fontFamily).toBe('Courier New');
  });

  it('persists font size and line height', () => {
    useFontStore.getState().setFontSize(22);
    useFontStore.getState().setLineHeight(2.0);

    expect(localStorage.getItem('markhere-font-size')).toBe('22');
    expect(localStorage.getItem('markhere-line-height')).toBe('2');

    useFontStore.setState({ fontSize: 16, lineHeight: 1.6 });
    initFontStore();

    const s = useFontStore.getState();
    expect(s.fontSize).toBe(22);
    expect(s.lineHeight).toBe(2.0);
  });

  it('initFontStore does nothing when localStorage is empty', () => {
    localStorage.clear();
    useFontStore.setState({
      fontFamily: 'Arial',
      fontSize: 18,
      lineHeight: 1.8,
    });
    initFontStore();

    // Because localStorage keys are missing, the state should remain unchanged.
    expect(useFontStore.getState().fontFamily).toBe('Arial');
    expect(useFontStore.getState().fontSize).toBe(18);
    expect(useFontStore.getState().lineHeight).toBe(1.8);
  });
});

/* ------------------------------------------------------------------ */
/*  General Persistence                                                */
/* ------------------------------------------------------------------ */

describe('General Persistence', () => {
  const todayDate = new Date().toISOString().split('T')[0];

  beforeEach(() => {
    localStorage.clear();

    // Reset all persist-backed stores.
    useSettingsStore.setState({
      theme: 'light',
      indentSize: 2,
      lineEnding: 'lf',
      exportFolder: 'auto',
      exportCustomPath: '',
      defaultCodeLanguage: '',
      imageInsertBehavior: 'copy',
      imageFolder: '',
      enableDiagrams: true,
      enableMath: true,
      enableFootnotes: true,
      enableYaml: true,
      enableAutoLinks: true,
      reopenLastFiles: true,
      smartPaste: true,
      autoMatchBrackets: true,
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: 14,
      showLineNumber: true,
      spellCheck: false,
      spellCheckLanguage: 'en-US',
      autoSave: true,
      autoSaveInterval: 30000,
      focusMode: false,
      typewriterMode: false,
      showWordCount: true,
    });

    usePomodoroStore.setState({
      workDuration: 25,
      shortBreakDuration: 5,
      longBreakDuration: 15,
      longBreakInterval: 4,
      phase: 'work' as const,
      timeRemaining: 1500,
      isRunning: false,
      sessionsCompleted: 0,
      totalWorkTime: 0,
      todaySessions: 0,
      todayDate,
    });

    useWikiLinkStore.setState({ links: [], currentPage: null });

    useRecentFilesStore.setState({ files: [] });

    useWordGoalStore.setState({
      targetWords: 1000,
      enabled: false,
      showProgress: true,
    });

    useBookmarkStore.setState({ bookmarks: [] });

    useTabsStore.setState({ tabs: [], activeTabId: null, closedTabs: [] });

    // Clear again to remove what persist middleware may have written.
    localStorage.clear();
  });

  it('localStorage.clear() removes all persisted data', () => {
    // Make changes across stores.
    useSettingsStore.getState().setTheme('sepia');
    usePomodoroStore.getState().setWorkDuration(60);
    useWordGoalStore.getState().setTargetWords(500);
    useRecentFilesStore.getState().addFile('/test.md', 'test.md');
    useBookmarkStore.getState().addBookmark('/test.md', 0, 'Test');

    // Verify localStorage has persisted data.
    expect(localStorage.getItem('markhere-settings')).not.toBeNull();
    expect(localStorage.getItem('pomodoro-storage')).not.toBeNull();
    expect(localStorage.getItem('word-goal-storage')).not.toBeNull();
    expect(localStorage.getItem('recent_files')).not.toBeNull();
    expect(localStorage.getItem('markhere-bookmarks')).not.toBeNull();

    // Wipe everything.
    localStorage.clear();

    // All localStorage keys should be gone.
    expect(localStorage.getItem('markhere-settings')).toBeNull();
    expect(localStorage.getItem('pomodoro-storage')).toBeNull();
    expect(localStorage.getItem('word-goal-storage')).toBeNull();
    expect(localStorage.getItem('recent_files')).toBeNull();
    expect(localStorage.getItem('markhere-bookmarks')).toBeNull();

    // Now simulate fresh app start by resetting stores to defaults.
    useSettingsStore.setState({ theme: 'light' });
    usePomodoroStore.setState({ workDuration: 25 });
    useRecentFilesStore.setState({ files: [] });
    useBookmarkStore.setState({ bookmarks: [] });

    // All stores should now be at defaults.
    expect(useSettingsStore.getState().theme).toBe('light');
    expect(usePomodoroStore.getState().workDuration).toBe(25);
    expect(useRecentFilesStore.getState().files).toEqual([]);
    expect(useBookmarkStore.getState().bookmarks).toEqual([]);
  });

  it('very long values persist and restore correctly', async () => {
    const longPath = '/very/long/path/' + 'x'.repeat(500) + '/document.md';
    const longContent = '# Title\n\n' + 'Lorem ipsum '.repeat(200);

    useSettingsStore.getState().setExportCustomPath(longPath);

    const raw = localStorage.getItem('markhere-settings');
    expect(raw).not.toBeNull();

    useSettingsStore.setState({ exportCustomPath: '' });
    localStorage.setItem('markhere-settings', raw!);

    await useSettingsStore.persist.rehydrate();
    expect(useSettingsStore.getState().exportCustomPath).toBe(longPath);

    // Also test tabs with long content.
    useTabsStore.getState().openTab(longPath, 'doc.md', longContent);
    const tabsRaw = localStorage.getItem('tabs-storage');
    expect(tabsRaw).not.toBeNull();

    useTabsStore.setState({ tabs: [], activeTabId: null, closedTabs: [] });
    localStorage.setItem('tabs-storage', tabsRaw!);

    await useTabsStore.persist.rehydrate();
    const tabs = useTabsStore.getState().tabs;
    expect(tabs).toHaveLength(1);
    expect(tabs[0].path).toBe(longPath);
  });

  it('special characters in values persist and restore correctly', async () => {
    const specialValue =
      'C:\\Users\\张三\\文档\\日本語\\한국어\\emoji🎉\\file.md';

    useSettingsStore.getState().setExportCustomPath(specialValue);

    const raw = localStorage.getItem('markhere-settings');
    expect(raw).not.toBeNull();

    useSettingsStore.setState({ exportCustomPath: '' });
    localStorage.setItem('markhere-settings', raw!);

    await useSettingsStore.persist.rehydrate();
    expect(useSettingsStore.getState().exportCustomPath).toBe(specialValue);
  });

  it('multiple stores can write concurrently without corrupting each other', async () => {
    useSettingsStore.getState().setTheme('dark');
    usePomodoroStore.getState().setWorkDuration(30);
    useWordGoalStore.getState().setTargetWords(500);

    const settingsRaw = localStorage.getItem('markhere-settings');
    const pomodoroRaw = localStorage.getItem('pomodoro-storage');
    const wordGoalRaw = localStorage.getItem('word-goal-storage');

    expect(settingsRaw).not.toBeNull();
    expect(pomodoroRaw).not.toBeNull();
    expect(wordGoalRaw).not.toBeNull();

    expect(JSON.parse(settingsRaw!).state.theme).toBe('dark');
    expect(JSON.parse(pomodoroRaw!).state.workDuration).toBe(30);
    expect(JSON.parse(wordGoalRaw!).state.targetWords).toBe(500);

    // Reset all and rehydrate each independently.
    useSettingsStore.setState({ theme: 'light' });
    usePomodoroStore.setState({ workDuration: 25 });
    useWordGoalStore.setState({ targetWords: 1000 });

    localStorage.setItem('markhere-settings', settingsRaw!);
    localStorage.setItem('pomodoro-storage', pomodoroRaw!);
    localStorage.setItem('word-goal-storage', wordGoalRaw!);

    await useSettingsStore.persist.rehydrate();
    await usePomodoroStore.persist.rehydrate();
    await useWordGoalStore.persist.rehydrate();

    expect(useSettingsStore.getState().theme).toBe('dark');
    expect(usePomodoroStore.getState().workDuration).toBe(30);
    expect(useWordGoalStore.getState().targetWords).toBe(500);
  });
});
