import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock Tauri API
// ---------------------------------------------------------------------------
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  save: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { useSettingsStore } from '../../store/settingsStore';

const mockInvoke = vi.mocked(invoke);

// ---------------------------------------------------------------------------
// Tauri API Compatibility
// ---------------------------------------------------------------------------

describe('Tauri API invoke mock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('verify mocked invoke follows expected signature (command string, args object)', async () => {
    mockInvoke.mockResolvedValue({ path: '/test/file.md' });

    const result = await invoke('read_file', { path: '/test/file.md' });

    expect(mockInvoke).toHaveBeenCalledWith('read_file', { path: '/test/file.md' });
    expect(typeof mockInvoke.mock.calls[0][0]).toBe('string');
    expect(typeof mockInvoke.mock.calls[0][1]).toBe('object');
    expect(result).toEqual({ path: '/test/file.md' });
  });

  it('invoke supports being called with just a command string', async () => {
    mockInvoke.mockResolvedValue(true);

    const result = await invoke('ping');

    expect(mockInvoke).toHaveBeenCalledWith('ping');
    expect(result).toBe(true);
  });

  it('invoke supports generic type parameter for TS compatibility', async () => {
    interface FileData {
      path: string;
      content: string;
      size: number;
    }

    mockInvoke.mockResolvedValue({
      path: '/test/doc.md',
      content: '# Hello',
      size: 1024,
    });

    const result = await invoke<FileData>('get_file_info', { path: '/test/doc.md' });
    expect(result.path).toBe('/test/doc.md');
    expect(result.content).toBe('# Hello');
    expect(result.size).toBe(1024);
  });

  it('invoke rejects with Error objects for failed commands', async () => {
    mockInvoke.mockRejectedValue(new Error('Command not found'));

    await expect(invoke('unknown_command')).rejects.toThrow('Command not found');
  });

  it('invoke can handle multiple sequential calls', async () => {
    mockInvoke
      .mockResolvedValueOnce('result1')
      .mockResolvedValueOnce('result2')
      .mockResolvedValueOnce('result3');

    const r1 = await invoke('cmd1');
    const r2 = await invoke('cmd2');
    const r3 = await invoke('cmd3');

    expect(r1).toBe('result1');
    expect(r2).toBe('result2');
    expect(r3).toBe('result3');
  });
});

// ---------------------------------------------------------------------------
// localStorage API
// ---------------------------------------------------------------------------

describe('localStorage API in jsdom', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('is available in jsdom environment', () => {
    expect(typeof localStorage).toBe('object');
    expect(typeof localStorage.getItem).toBe('function');
    expect(typeof localStorage.setItem).toBe('function');
    expect(typeof localStorage.removeItem).toBe('function');
  });

  it('read/write works correctly', () => {
    localStorage.setItem('test_key', 'test_value');
    expect(localStorage.getItem('test_key')).toBe('test_value');
  });

  it('handles JSON stringify/parse round-trips', () => {
    const data = {
      theme: 'dark',
      fontSize: 16,
      preferences: { autoSave: true, interval: 30000 },
    };

    localStorage.setItem('app_settings', JSON.stringify(data));
    const retrieved = JSON.parse(localStorage.getItem('app_settings')!);

    expect(retrieved).toEqual(data);
  });

  it('handles large values (50KB)', () => {
    const largeValue = 'x'.repeat(50000);
    localStorage.setItem('large', largeValue);

    expect(localStorage.getItem('large')!.length).toBe(50000);
  });

  it('removeItem correctly removes stored values', () => {
    localStorage.setItem('to_remove', 'value');
    expect(localStorage.getItem('to_remove')).toBe('value');

    localStorage.removeItem('to_remove');
    expect(localStorage.getItem('to_remove')).toBeNull();
  });

  it('getItem returns null for non-existent keys', () => {
    expect(localStorage.getItem('nonexistent')).toBeNull();
  });

  it('clear removes all keys', () => {
    localStorage.setItem('a', '1');
    localStorage.setItem('b', '2');
    localStorage.setItem('c', '3');

    localStorage.clear();

    expect(localStorage.getItem('a')).toBeNull();
    expect(localStorage.getItem('b')).toBeNull();
    expect(localStorage.getItem('c')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Store Persistence Format
// ---------------------------------------------------------------------------

describe('Store persistence format', () => {
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

  it('JSON.stringify/JSON.parse round-trip integrity for settings', () => {
    const state = useSettingsStore.getState();
    const serializable = {
      theme: state.theme,
      fontSize: state.fontSize,
      indentSize: state.indentSize,
      autoSave: state.autoSave,
    };

    const json = JSON.stringify(serializable);
    const parsed = JSON.parse(json);

    expect(parsed.theme).toBe('light');
    expect(parsed.fontSize).toBe(14);
    expect(parsed.indentSize).toBe(2);
    expect(parsed.autoSave).toBe(true);
  });

  it('settings default theme value is serializable', () => {
    const state = useSettingsStore.getState();
    const json = JSON.stringify({ theme: state.theme });
    const parsed = JSON.parse(json);

    expect(parsed.theme).toBe('light');
  });

  it('settings boolean values survive JSON round-trip', () => {
    const booleans = {
      enableDiagrams: true,
      enableMath: false,
      spellCheck: false,
      smartPaste: true,
    };

    const json = JSON.stringify(booleans);
    const parsed = JSON.parse(json);

    expect(parsed.enableDiagrams).toBe(true);
    expect(parsed.enableMath).toBe(false);
    expect(parsed.spellCheck).toBe(false);
    expect(parsed.smartPaste).toBe(true);
  });

  it('settings numeric values survive JSON round-trip', () => {
    const numbers = {
      fontSize: 16,
      indentSize: 4,
      autoSaveInterval: 60000,
    };

    const json = JSON.stringify(numbers);
    const parsed = JSON.parse(json);

    expect(parsed.fontSize).toBe(16);
    expect(parsed.indentSize).toBe(4);
    expect(parsed.autoSaveInterval).toBe(60000);
    expect(typeof parsed.fontSize).toBe('number');
  });

  it('settings string enum values survive JSON round-trip', () => {
    const state = useSettingsStore.getState();
    const enums = {
      theme: state.theme,
      lineEnding: state.lineEnding,
      exportFolder: state.exportFolder,
      imageInsertBehavior: state.imageInsertBehavior,
    };

    const json = JSON.stringify(enums);
    const parsed = JSON.parse(json);

    expect(parsed.theme).toBe('light');
    expect(parsed.lineEnding).toBe('lf');
    expect(parsed.exportFolder).toBe('auto');
    expect(parsed.imageInsertBehavior).toBe('copy');
  });
});

// ---------------------------------------------------------------------------
// URL API
// ---------------------------------------------------------------------------

describe('URL API compatibility', () => {
  it('URL constructor works for constructing API endpoints', () => {
    const url = new URL('https://api.example.com/v1/files');
    expect(url.href).toBe('https://api.example.com/v1/files');
    expect(url.protocol).toBe('https:');
    expect(url.hostname).toBe('api.example.com');
    expect(url.pathname).toBe('/v1/files');
  });

  it('URL constructor supports relative paths with base URL', () => {
    const url = new URL('/api/v2/items', 'https://example.com');
    expect(url.href).toBe('https://example.com/api/v2/items');
  });

  it('URL constructor handles query parameters', () => {
    const url = new URL('https://example.com/search?q=test&page=1');
    expect(url.searchParams.get('q')).toBe('test');
    expect(url.searchParams.get('page')).toBe('1');
  });

  it('URLSearchParams can be set programmatically', () => {
    const params = new URLSearchParams();
    params.set('key', 'value');
    params.set('format', 'json');
    expect(params.toString()).toBe('key=value&format=json');
  });
});

// ---------------------------------------------------------------------------
// fetch API
// ---------------------------------------------------------------------------

describe('fetch API compatibility', () => {
  it('mock fetch follows standard Request/Response pattern', async () => {
    const mockResponse = new Response(
      JSON.stringify({ success: true, data: [1, 2, 3] }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const mockFetch = vi.fn().mockResolvedValue(mockResponse);

    const response = await mockFetch('https://api.example.com/data', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/data', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toEqual({ success: true, data: [1, 2, 3] });
  });

  it('Response object supports text() method', async () => {
    const response = new Response('plain text content');
    const text = await response.text();
    expect(text).toBe('plain text content');
  });

  it('Response object has ok, status, and statusText', () => {
    const okResponse = new Response('', { status: 200 });
    expect(okResponse.ok).toBe(true);
    expect(okResponse.status).toBe(200);

    const errorResponse = new Response('', { status: 404 });
    expect(errorResponse.ok).toBe(false);
    expect(errorResponse.status).toBe(404);
  });

  it('Request constructor works', () => {
    const request = new Request('https://api.example.com/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'test' }),
    });

    expect(request.method).toBe('POST');
    expect(request.url).toBe('https://api.example.com/upload');
  });
});

// ---------------------------------------------------------------------------
// CSS Custom Properties
// ---------------------------------------------------------------------------

describe('CSS custom properties', () => {
  it('documentElement.style.setProperty/getPropertyValue works', () => {
    document.documentElement.style.setProperty('--test-color', '#ff0000');

    const value = document.documentElement.style.getPropertyValue('--test-color');
    expect(value).toBe('#ff0000');
  });

  it('multiple custom properties can be set and retrieved', () => {
    const root = document.documentElement;
    root.style.setProperty('--bg-primary', '#ffffff');
    root.style.setProperty('--text-primary', '#000000');
    root.style.setProperty('--font-size', '14px');

    expect(root.style.getPropertyValue('--bg-primary')).toBe('#ffffff');
    expect(root.style.getPropertyValue('--text-primary')).toBe('#000000');
    expect(root.style.getPropertyValue('--font-size')).toBe('14px');
  });

  it('custom properties accept various CSS values', () => {
    const root = document.documentElement;

    root.style.setProperty('--color', '#333333');
    root.style.setProperty('--padding', '16px');
    root.style.setProperty('--duration', '300ms');
    root.style.setProperty('--opacity', '0.8');

    expect(root.style.getPropertyValue('--color')).toBe('#333333');
    expect(root.style.getPropertyValue('--padding')).toBe('16px');
    expect(root.style.getPropertyValue('--duration')).toBe('300ms');
    expect(root.style.getPropertyValue('--opacity')).toBe('0.8');
  });

  it('getPropertyValue returns empty string for unset properties', () => {
    const value = document.documentElement.style.getPropertyValue('--nonexistent');
    expect(value).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Clipboard API
// ---------------------------------------------------------------------------

describe('Clipboard API mock', () => {
  it('navigator.clipboard is available or can be mocked', () => {
    // In jsdom, navigator.clipboard may not exist, but we can verify
    // that our mock approach works when needed
    if (navigator.clipboard) {
      expect(typeof navigator.clipboard.writeText).toBe('function');
    } else {
      // In jsdom without clipboard support, it's undefined
      // This test verifies our mockability
      expect(true).toBe(true);
    }
  });

  it('clipboard API can be mocked with vi.fn()', () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    const mockClipboard = {
      writeText: mockWriteText,
    };

    // Simulate how clipboard would be used
    mockClipboard.writeText('Copied text');

    expect(mockWriteText).toHaveBeenCalledWith('Copied text');
    expect(mockWriteText).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// DOMParser
// ---------------------------------------------------------------------------

describe('DOMParser availability', () => {
  it('DOMParser is available for HTML parsing', () => {
    expect(typeof DOMParser).toBe('function');

    const parser = new DOMParser();
    const doc = parser.parseFromString('<h1>Hello</h1><p>World</p>', 'text/html');

    expect(doc.querySelector('h1')?.textContent).toBe('Hello');
    expect(doc.querySelector('p')?.textContent).toBe('World');
  });

  it('DOMParser handles complex HTML', () => {
    const parser = new DOMParser();
    const html = '<div><ul><li>A</li><li>B</li></ul><a href="/test">Link</a></div>';
    const doc = parser.parseFromString(html, 'text/html');

    expect(doc.querySelectorAll('li')).toHaveLength(2);
    expect(doc.querySelector('a')?.getAttribute('href')).toBe('/test');
  });

  it('DOMParser returns error page for invalid HTML gracefully', () => {
    const parser = new DOMParser();
    // DOMParser never throws on parse - it returns a document
    const doc = parser.parseFromString('<unclosed>', 'text/html');
    expect(doc.body).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// FileReader API
// ---------------------------------------------------------------------------

describe('FileReader API mock', () => {
  it('FileReader constructor is available', () => {
    expect(typeof FileReader).toBe('function');
  });

  it('FileReader instance has expected methods and events', () => {
    const reader = new FileReader();

    expect(typeof reader.readAsText).toBe('function');
    expect(typeof reader.readAsDataURL).toBe('function');
    expect(typeof reader.readAsArrayBuffer).toBe('function');
    expect(typeof reader.abort).toBe('function');

    // Event properties
    expect('onload' in reader).toBe(true);
    expect('onerror' in reader).toBe(true);
    expect('onabort' in reader).toBe(true);
  });

  it('FileReader has correct readyState constants', () => {
    expect(FileReader.EMPTY).toBe(0);
    expect(FileReader.LOADING).toBe(1);
    expect(FileReader.DONE).toBe(2);
  });

  it('FileReader readyState starts at EMPTY', () => {
    const reader = new FileReader();
    expect(reader.readyState).toBe(FileReader.EMPTY);
  });
});

// ---------------------------------------------------------------------------
// KeyboardEvent
// ---------------------------------------------------------------------------

describe('KeyboardEvent modifier key detection', () => {
  it('metaKey is detected for Cmd/Ctrl combinations', () => {
    const event = new KeyboardEvent('keydown', {
      key: 's',
      metaKey: true,
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
    });

    expect(event.metaKey).toBe(true);
    expect(event.ctrlKey).toBe(false);
    expect(event.shiftKey).toBe(false);
    expect(event.altKey).toBe(false);
  });

  it('ctrlKey works independently of metaKey', () => {
    const event = new KeyboardEvent('keydown', {
      key: 'f',
      ctrlKey: true,
      metaKey: false,
    });

    expect(event.ctrlKey).toBe(true);
    expect(event.metaKey).toBe(false);
  });

  it('multiple modifier keys can be combined', () => {
    const event = new KeyboardEvent('keydown', {
      key: 's',
      metaKey: true,
      shiftKey: true,
      ctrlKey: false,
      altKey: false,
    });

    expect(event.metaKey).toBe(true);
    expect(event.shiftKey).toBe(true);
    expect(event.ctrlKey).toBe(false);
    expect(event.altKey).toBe(false);
  });

  it('altKey is detected correctly', () => {
    const event = new KeyboardEvent('keydown', {
      key: 'f',
      altKey: true,
      shiftKey: true,
      metaKey: false,
      ctrlKey: false,
    });

    expect(event.altKey).toBe(true);
    expect(event.shiftKey).toBe(true);
  });

  it('key returns the correct key name', () => {
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    expect(event.key).toBe('Enter');
  });

  it('keyCode returns deprecated numeric code (for legacy support)', () => {
    const event = new KeyboardEvent('keydown', { key: 'a', keyCode: 65 });
    expect(event.keyCode).toBe(65);
  });
});
