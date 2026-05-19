import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock Tauri dependencies required by the modules under test
// ---------------------------------------------------------------------------
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  save: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  readDir: vi.fn(),
  readTextFile: vi.fn(),
}));

import { ExportService } from '../../services/ExportService';
import { SearchService } from '../../services/SearchService';
import { useAutoSaveStore } from '../../store/autoSaveStore';
import { useSettingsStore } from '../../store/settingsStore';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate markdown with `lines` lines of Lorem-style content. */
function generateLargeMarkdown(lines: number): string {
  const parts: string[] = [];
  for (let i = 0; i < lines; i++) {
    parts.push(
      `## Section ${i + 1}\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. ` +
      `Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ` +
      `Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.\n`
    );
  }
  return parts.join('\n');
}

/** Generate a long string of the given length (chars). */
function generateLongText(length: number): string {
  let text = '';
  while (text.length < length) {
    text += 'The quick brown fox jumps over the lazy dog. 敏捷的棕色狐狸跳过了懒狗。\n';
  }
  return text.slice(0, length);
}

/** A large emoji map mirroring the shape of EMOJI_MAP for search benchmarks. */
const BENCHMARK_EMOJI_MAP: Record<string, string> = {
  smile: '\u{1F60A}', laugh: '\u{1F602}', wink: '\u{1F609}', heart: '❤️', star: '⭐',
  fire: '\u{1F525}', rocket: '\u{1F680}', check: '✅', x: '❌', plus: '➕',
  arrow: '➡️', book: '\u{1F4D6}', pen: '🖊️', bulb: '\u{1F4A1}', gear: '⚙️',
  warning: '⚠️', question: '❓', info: 'ℹ️', idea: '\u{1F4AD}', code: '\u{1F4BB}',
  bug: '\u{1F41B}', music: '\u{1F3B5}', camera: '\u{1F4F7}', phone: '\u{1F4F1}', mail: '\u{1F4E7}',
  link: '\u{1F517}', lock: '\u{1F512}', key: '\u{1F511}', clock: '\u{1F550}', calendar: '\u{1F4C5}',
  chart: '\u{1F4CA}', thumbsup: '\u{1F44D}', thumbsdown: '\u{1F44E}', clap: '\u{1F44F}',
  raised_hands: '\u{1F64C}', pray: '\u{1F64F}', eyes: '\u{1F440}', brain: '\u{1F9E0}',
  trophy: '\u{1F3C6}', party: '\u{1F389}', gift: '\u{1F381}', crown: '\u{1F451}',
  diamond: '\u{1F48E}', money: '\u{1F4B0}', lightning: '⚡', cloud: '☁️', sun: '☀️',
  moon: '\u{1F319}', rainbow: '\u{1F308}', snowflake: '❄️', flower: '\u{1F338}',
  tree: '\u{1F333}', earth: '\u{1F30D}', home: '\u{1F3E0}', car: '\u{1F697}',
  airplane: '✈️', coffee: '☕', pizza: '\u{1F355}', cake: '\u{1F382}',
  cookie: '\u{1F36A}', beer: '\u{1F37A}', dog: '\u{1F415}', cat: '\u{1F408}',
  bird: '\u{1F426}', fish: '\u{1F41F}', hourglass: '⏳', battery: '\u{1F50B}',
  speaker: '\u{1F50A}', bell: '\u{1F514}', memo: '\u{1F4DD}', paperclip: '\u{1F4CE}',
  scissors: '✂️', pushpin: '\u{1F4CC}',
};

/**
 * Filter emoji entries by keyword (replicates the EMOJI_MAP search logic).
 */
function filterEmojiMap(keyword: string): [string, string][] {
  const lowerQuery = keyword.toLowerCase();
  return Object.entries(BENCHMARK_EMOJI_MAP)
    .filter(([key]) => key.includes(lowerQuery))
    .slice(0, 20);
}

/**
 * Preprocess markdown to replace mermaid blocks with placeholders.
 * (Replicates the internal preprocessMarkdownMermaidForExport logic.)
 */
function preprocessMermaid(markdown: string): string {
  return markdown.replace(
    /```mermaid\s*\n([\s\S]*?)```/gi,
    (_fullMatch: string, content: string) => {
      const trimmed = content.trim();
      const firstLine = trimmed.split('\n')[0]?.trim() || 'diagram';
      return `[Diagram: ${firstLine}]`;
    }
  );
}

// ---------------------------------------------------------------------------
// Performance Tests
// ---------------------------------------------------------------------------

describe('ExportService performance', () => {
  it('generateHTML with 500-line markdown completes under 100ms', () => {
    const content = generateLargeMarkdown(500);
    const expectedHtml = ExportService.addHeadingIds(content);

    const start = performance.now();
    const result = ExportService.generateHTML(content, 'Perf Test');
    const end = performance.now();

    expect(result).toContain('<!DOCTYPE html>');
    expect(result).toContain(expectedHtml.replace(/<h([1-6]) /gi, '<h$1 id='));
    expect(end - start).toBeLessThan(100);
  });

  it('generateHTML with 1000-line markdown completes under 200ms', () => {
    const content = generateLargeMarkdown(1000);

    const start = performance.now();
    const result = ExportService.generateHTML(content, 'Large Doc');
    const end = performance.now();

    expect(result).toContain('<!DOCTYPE html>');
    expect(end - start).toBeLessThan(200);
  });
});

describe('SearchService performance', () => {
  it('findInDocument with 50K text and complex regex completes under 500ms', () => {
    const text = generateLongText(50000);
    // Complex regex: find words with alternating letters
    const regex = '\\b\\w{4,8}\\b';

    const start = performance.now();
    const results = SearchService.findInDocument(text, regex, { useRegex: true });
    const end = performance.now();

    expect(results.length).toBeGreaterThan(0);
    expect(end - start).toBeLessThan(500);
  });

  it('highlightMatches with 1000 matches completes under 200ms', () => {
    // Create text with many occurrences of "match"
    const parts: string[] = [];
    for (let i = 0; i < 1000; i++) {
      parts.push('match word filler text here ');
    }
    const text = parts.join('');

    const start = performance.now();
    const result = SearchService.highlightMatches(text, 'match');
    const end = performance.now();

    const matchCount = (result.match(/<mark class="search-highlight">/g) || []).length;
    expect(matchCount).toBe(1000);
    expect(end - start).toBeLessThan(200);
  });

  it('countMatches with large document is efficient', () => {
    const text = generateLongText(100000);
    const query = 'the';

    const start = performance.now();
    const count = SearchService.countMatches(text, query);
    const end = performance.now();

    expect(count).toBeGreaterThan(0);
    expect(end - start).toBeLessThan(100);
  });
});

describe('EMOJI_MAP search performance', () => {
  it('filtering 70+ emojis by keyword completes under 10ms', () => {
    // Run multiple iterations to get stable measurement
    const iterations = 100;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      filterEmojiMap('ar');
      filterEmojiMap('oo');
      filterEmojiMap('li');
      filterEmojiMap('e');
      filterEmojiMap('');
    }

    const end = performance.now();
    const avgTime = (end - start) / (iterations * 5);

    // Single filter operation should be well under 10ms
    expect(avgTime).toBeLessThan(1);
  });

  it('filtering all 70+ emojis with empty keyword is fast', () => {
    const start = performance.now();
    const results = filterEmojiMap('');
    const end = performance.now();

    // Should return all emojis (up to 20 due to slice(0,20))
    expect(results.length).toBeLessThanOrEqual(20);
    expect(Object.keys(BENCHMARK_EMOJI_MAP).length).toBeGreaterThanOrEqual(70);
    expect(end - start).toBeLessThan(10);
  });
});

describe('autoSaveStore performance', () => {
  beforeEach(() => {
    useAutoSaveStore.setState({
      content: '',
      lastSaved: null,
      currentPath: null,
      hasUnsavedChanges: false,
      drafts: [],
      autoSaveEnabled: true,
      autoSaveInterval: 30000,
    });
  });

  it('saveDraft with large content (50K chars) completes under 50ms', () => {
    const longContent = generateLongText(50000);

    const start = performance.now();
    const id = useAutoSaveStore.getState().saveDraft(longContent, '/test/large.md', 'Large File');
    const end = performance.now();

    expect(id).toBeTruthy();
    expect(id.startsWith('draft_')).toBe(true);

    const draft = useAutoSaveStore.getState().drafts[0];
    expect(draft.content.length).toBe(50000);
    expect(end - start).toBeLessThan(50);
  });

  it('getRecentDrafts with 20 drafts is fast', () => {
    const { saveDraft } = useAutoSaveStore.getState();
    for (let i = 0; i < 20; i++) {
      saveDraft(`# Draft ${i}`, `/test/file${i}.md`);
    }

    const start = performance.now();
    const recent = useAutoSaveStore.getState().getRecentDrafts();
    const end = performance.now();

    expect(recent.length).toBeGreaterThan(0);
    expect(end - start).toBeLessThan(20);
  });

  it('saveBackup with 50K content completes under 20ms', () => {
    const longContent = generateLongText(50000);

    const start = performance.now();
    useAutoSaveStore.getState().saveBackup(longContent, '/test/backup.md');
    const end = performance.now();

    expect(useAutoSaveStore.getState().content.length).toBe(50000);
    expect(end - start).toBeLessThan(20);
  });
});

describe('Settings store performance', () => {
  beforeEach(() => {
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
      fontFamily: 'sans-serif',
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
  });

  it('updating 10 settings sequentially completes under 100ms', () => {
    const store = useSettingsStore.getState();
    const updates = [
      () => store.setTheme('dark'),
      () => store.setFontSize(16),
      () => store.setIndentSize(4),
      () => store.setAutoSave(false),
      () => store.setSpellCheck(true),
      () => store.setFocusMode(true),
      () => store.setShowLineNumber(false),
      () => store.setShowWordCount(false),
      () => store.setFontFamily('monospace'),
      () => store.setSmartPaste(false),
    ];

    const start = performance.now();
    for (const update of updates) {
      update();
    }
    const end = performance.now();

    const finalState = useSettingsStore.getState();
    expect(finalState.theme).toBe('dark');
    expect(finalState.fontSize).toBe(16);
    expect(finalState.indentSize).toBe(4);
    expect(end - start).toBeLessThan(100);
  });

  it('getting state 1000 times is fast', () => {
    const start = performance.now();

    for (let i = 0; i < 1000; i++) {
      const state = useSettingsStore.getState();
      // Access a property to prevent dead-code elimination
      void state.fontSize;
    }

    const end = performance.now();
    expect(end - start).toBeLessThan(50);
  });
});

describe('Markdown preprocessing performance', () => {
  it('large mermaid preprocessing under 50ms', () => {
    // Generate markdown with many mermaid blocks
    const parts: string[] = [];
    for (let i = 0; i < 50; i++) {
      parts.push(`\`\`\`mermaid
graph TD
    A${i}-->B${i}
    B${i}-->C${i}
    C${i}-->D${i}
\`\`\``);
      parts.push(`\n## Section ${i}\n\nSome text for section ${i}.\n`);
    }
    const markdown = parts.join('\n');

    const start = performance.now();
    const result = preprocessMermaid(markdown);
    const end = performance.now();

    // Verify all mermaid blocks were replaced
    const mermaidCount = (result.match(/\[Diagram:/g) || []).length;
    expect(mermaidCount).toBe(50);
    expect(result).not.toContain('```mermaid');
    expect(end - start).toBeLessThan(50);
  });

  it('markdown without mermaid blocks passes through quickly', () => {
    const markdown = generateLargeMarkdown(200);

    const start = performance.now();
    const result = preprocessMermaid(markdown);
    const end = performance.now();

    expect(result).toBe(markdown);
    expect(end - start).toBeLessThan(20);
  });

  it('generateHTML with mermaid placeholders is performant', () => {
    const content = '<div data-type="mermaid" data-content="graph TD\\nA--&gt;B\\nB--&gt;C"></div>\n' +
      '<h1>Test</h1>\n<p>Content here.</p>\n'.repeat(50);

    const start = performance.now();
    const html = ExportService.generateHTML(content, 'Perf');
    const end = performance.now();

    expect(html).toContain('mermaid-placeholder');
    expect(html).toContain('<!DOCTYPE html>');
    expect(end - start).toBeLessThan(100);
  });
});
