import { describe, it, expect, beforeEach, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { writeTextFile, readDir } from '@tauri-apps/plugin-fs';
import { FileService } from '../../services/FileService';
import { ExportService } from '../../services/ExportService';
import { useFileStore } from '../../store/fileStore';
import { useGitStore } from '../../store/gitStore';
import { useCloudStore } from '../../store/cloudStore';
import { useImageStorageStore } from '../../store/imageStorageStore';
import type { ImageHostingProvider } from '../../services/imageStorageConfig';

// ---- Mocks ----

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
  save: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  writeTextFile: vi.fn(),
  readDir: vi.fn(),
  exists: vi.fn(),
  mkdir: vi.fn(),
}));

vi.mock('@tauri-apps/api/path', () => ({
  homeDir: vi.fn().mockResolvedValue('/home/testuser'),
}));

// ---- Helpers ----

const fileStoreInitialState = {
  currentPath: null as string | null,
  fileName: null as string | null,
  savedContent: '',
  isNewFile: true,
};

const gitStoreInitialState = {
  isEnabled: false,
  loading: false,
  error: null as string | null,
  commits: [] as Array<{ hash: string; short_hash: string; author: string; date: string; message: string }>,
  currentDiff: null as { old_content: string; new_content: string; additions: number; deletions: number } | null,
  selectedHash: null as string | null,
};

/** Build a minimal S3 hosting provider fixture. */
function makeS3Provider(overrides: Partial<ImageHostingProvider> = {}): ImageHostingProvider {
  return {
    id: 's3-provider-1',
    name: 'AWS S3',
    type: 's3',
    config: {
      endpoint: 'https://s3.us-east-1.amazonaws.com',
      bucket: 'my-bucket',
      region: 'us-east-1',
      accessKey: 'AKIA_TEST',
      secretKey: 'secret_TEST',
      publicUrlPrefix: 'https://my-bucket.s3.us-east-1.amazonaws.com',
    },
    ...overrides,
  } as ImageHostingProvider;
}

/** Build a minimal Imgur hosting provider fixture. */
function makeImgurProvider(overrides: Partial<ImageHostingProvider> = {}): ImageHostingProvider {
  return {
    id: 'imgur-provider-1',
    name: 'Imgur',
    type: 'imgur',
    config: {
      clientId: 'imgur_client_123',
    },
    ...overrides,
  } as ImageHostingProvider;
}

// ---- Tests ----

describe('FileService + fileStore interaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useFileStore.setState({ ...fileStoreInitialState });
  });

  it('openFile: dialog.open returns path, invoke read_file returns content, fileStore state is updated', async () => {
    const mockedOpen = vi.mocked(open);
    mockedOpen.mockResolvedValue('/home/user/notes.md');

    const mockedInvoke = vi.mocked(invoke);
    mockedInvoke.mockResolvedValue('# Hello World');

    const result = await FileService.openFile();

    expect(mockedOpen).toHaveBeenCalledOnce();
    expect(mockedInvoke).toHaveBeenCalledWith('read_file', { path: '/home/user/notes.md' });
    expect(result).toEqual({ path: '/home/user/notes.md', content: '# Hello World' });

    // Simulate the app updating the store after a successful open
    if (result) {
      useFileStore.getState().setCurrentPath(result.path);
      useFileStore.getState().setSavedContent(result.content);
    }

    const store = useFileStore.getState();
    expect(store.currentPath).toBe('/home/user/notes.md');
    expect(store.fileName).toBe('notes');
    expect(store.savedContent).toBe('# Hello World');
    expect(store.isNewFile).toBe(false);
  });

  it('openFile: returns null when dialog.open returns null (user cancels)', async () => {
    const mockedOpen = vi.mocked(open);
    mockedOpen.mockResolvedValue(null);

    const result = await FileService.openFile();

    expect(result).toBeNull();
    // Invoke should NOT be called when no path is selected
    expect(invoke).not.toHaveBeenCalled();
  });

  it('openFile: returns null when dialog.open returns a non-string value', async () => {
    const mockedOpen = vi.mocked(open);
    // open can return string | string[] | null; we treat non-string as null
    mockedOpen.mockResolvedValue(['/file1.md', '/file2.md'] as unknown as string);

    const result = await FileService.openFile();

    expect(result).toBeNull();
  });

  it('saveFile: fileStore has content, invoke save_file is called correctly', async () => {
    // Set initial store state as if a file is open
    useFileStore.setState({
      currentPath: '/home/user/doc.md',
      fileName: 'doc',
      savedContent: '# Document content',
      isNewFile: false,
    });

    const mockedInvoke = vi.mocked(invoke);
    mockedInvoke.mockResolvedValue(undefined);

    const store = useFileStore.getState();
    await FileService.saveFile(store.currentPath!, store.savedContent);

    expect(mockedInvoke).toHaveBeenCalledWith('save_file', {
      path: '/home/user/doc.md',
      content: '# Document content',
    });
  });

  it('saveFile: handles empty content', async () => {
    useFileStore.setState({
      currentPath: '/home/user/empty.md',
      savedContent: '',
    });

    const mockedInvoke = vi.mocked(invoke);
    mockedInvoke.mockResolvedValue(undefined);

    await FileService.saveFile('/home/user/empty.md', '');

    expect(mockedInvoke).toHaveBeenCalledWith('save_file', {
      path: '/home/user/empty.md',
      content: '',
    });
  });

  it('newFile: save dialog returns path, then fileStore is reset for new file workflow', async () => {
    // Set store as if an old file was open
    useFileStore.setState({
      currentPath: '/old/file.md',
      fileName: 'file',
      savedContent: 'old content',
      isNewFile: false,
    });

    const mockedSave = vi.mocked(save);
    mockedSave.mockResolvedValue('/home/user/untitled.md');

    const newPath = await FileService.newFile();

    expect(mockedSave).toHaveBeenCalledOnce();
    expect(newPath).toBe('/home/user/untitled.md');

    // Simulate the app resetting the store for the new file
    useFileStore.getState().reset();

    const store = useFileStore.getState();
    expect(store.currentPath).toBeNull();
    expect(store.savedContent).toBe('');
    expect(store.isNewFile).toBe(true);
  });

  it('newFile: returns null when save dialog is cancelled', async () => {
    const mockedSave = vi.mocked(save);
    mockedSave.mockResolvedValue(null);

    const result = await FileService.newFile();

    expect(result).toBeNull();
  });

  it('fileExists: calls invoke with correct path', async () => {
    const mockedInvoke = vi.mocked(invoke);
    mockedInvoke.mockResolvedValue(true);

    const exists = await FileService.fileExists('/tmp/test.md');

    expect(mockedInvoke).toHaveBeenCalledWith('file_exists', { path: '/tmp/test.md' });
    expect(exists).toBe(true);
  });
});

describe('ExportService + Tauri invoke interaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sampleMarkdown = '# Test\n\nSome **bold** text.';
  const sampleHTML = '<h1>Test</h1><p>Some <strong>bold</strong> text.</p>';

  it('exportToPDF: save dialog returns path, invoke export_to_pdf called with correct args', async () => {
    const mockedSave = vi.mocked(save);
    mockedSave.mockResolvedValue('/output/doc.pdf');

    const mockedInvoke = vi.mocked(invoke);
    mockedInvoke.mockResolvedValue('/output/doc.pdf');

    const result = await ExportService.exportToPDF(sampleMarkdown, 'MyDoc');

    expect(mockedSave).toHaveBeenCalledWith(
      expect.objectContaining({ defaultPath: 'MyDoc.pdf' }),
    );
    expect(mockedInvoke).toHaveBeenCalledWith('export_to_pdf', {
      markdown: sampleMarkdown,
      outputPath: '/output/doc.pdf',
    });
    expect(result).toBe('/output/doc.pdf');
  });

  it('exportToPDF: returns null when save dialog is cancelled', async () => {
    const mockedSave = vi.mocked(save);
    mockedSave.mockResolvedValue(null);

    const result = await ExportService.exportToPDF(sampleMarkdown);

    expect(result).toBeNull();
    expect(invoke).not.toHaveBeenCalled();
  });

  it('exportToWord: save dialog returns path, invoke export_to_word called with correct args', async () => {
    const mockedSave = vi.mocked(save);
    mockedSave.mockResolvedValue('/output/doc.docx');

    const mockedInvoke = vi.mocked(invoke);
    mockedInvoke.mockResolvedValue('/output/doc.docx');

    const result = await ExportService.exportToWord(sampleMarkdown, 'Report');

    expect(mockedSave).toHaveBeenCalledWith(
      expect.objectContaining({ defaultPath: 'Report.docx' }),
    );
    expect(mockedInvoke).toHaveBeenCalledWith('export_to_word', {
      markdown: sampleMarkdown,
      outputPath: '/output/doc.docx',
    });
    expect(result).toBe('/output/doc.docx');
  });

  it('exportToHTML: save dialog returns path, invoke save_file called with generated HTML', async () => {
    const mockedSave = vi.mocked(save);
    mockedSave.mockResolvedValue('/output/page.html');

    const mockedInvoke = vi.mocked(invoke);
    mockedInvoke.mockResolvedValue('/output/page.html');

    const result = await ExportService.exportToHTML(sampleHTML, 'WebPage');

    expect(mockedSave).toHaveBeenCalledWith(
      expect.objectContaining({ defaultPath: 'WebPage.html' }),
    );
    // The service generates full HTML, so the content should contain doctype and title
    expect(mockedInvoke).toHaveBeenCalledWith('save_file', {
      path: '/output/page.html',
      content: expect.stringContaining('<!DOCTYPE html>'),
    });
    expect(mockedInvoke).toHaveBeenCalledWith('save_file', {
      path: '/output/page.html',
      content: expect.stringContaining('<title>WebPage</title>'),
    });
    expect(result).toBe('/output/page.html');
  });

  it('exportToEPUB: save dialog returns path, invoke export_to_epub called with title', async () => {
    const mockedSave = vi.mocked(save);
    mockedSave.mockResolvedValue('/output/book.epub');

    const mockedInvoke = vi.mocked(invoke);
    mockedInvoke.mockResolvedValue('/output/book.epub');

    const result = await ExportService.exportToEPUB(sampleMarkdown, 'MyBook');

    expect(mockedSave).toHaveBeenCalledWith(
      expect.objectContaining({ defaultPath: 'MyBook.epub' }),
    );
    expect(mockedInvoke).toHaveBeenCalledWith('export_to_epub', {
      markdown: sampleMarkdown,
      outputPath: '/output/book.epub',
      title: 'MyBook',
    });
    expect(result).toBe('/output/book.epub');
  });

  it('exportToEPUB: uses default title "Document" when no title provided', async () => {
    const mockedSave = vi.mocked(save);
    mockedSave.mockResolvedValue('/output/doc.epub');

    const mockedInvoke = vi.mocked(invoke);
    mockedInvoke.mockResolvedValue('/output/doc.epub');

    await ExportService.exportToEPUB(sampleMarkdown);

    expect(mockedInvoke).toHaveBeenCalledWith('export_to_epub',
      expect.objectContaining({ title: 'Document' }),
    );
  });

  it('exportToPDF: replaces mermaid code blocks with placeholders', async () => {
    const markdownWithMermaid = '# Doc\n\n```mermaid\ngraph TD\n  A-->B\n```';
    const mockedSave = vi.mocked(save);
    mockedSave.mockResolvedValue('/output/doc.pdf');

    const mockedInvoke = vi.mocked(invoke);
    mockedInvoke.mockResolvedValue('/output/doc.pdf');

    await ExportService.exportToPDF(markdownWithMermaid);

    const invokeArgs = mockedInvoke.mock.calls[0][1] as { markdown: string; outputPath: string };
    // Mermaid code block should be replaced with a placeholder
    expect(invokeArgs.markdown).not.toContain('```mermaid');
    expect(invokeArgs.markdown).toContain('[Diagram:');
  });
});

describe('imageStorageStore + uploadToProvider interaction', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
    localStorage.clear();
    useImageStorageStore.setState({
      activeProvider: null,
      providers: [],
    });
  });

  it('uploadImage with active S3 provider: fetch is called with correct S3 endpoint', async () => {
    const provider = makeS3Provider();
    useImageStorageStore.getState().addProvider(provider);
    useImageStorageStore.getState().setActiveProvider(provider.id);

    const mockResponse = { ok: true, status: 200, statusText: 'OK' };
    mockFetch.mockResolvedValueOnce(mockResponse);

    const file = new File(['fake-image-data'], 'test.png', { type: 'image/png' });
    const result = await useImageStorageStore.getState().uploadImage(file);

    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Verify the fetch URL matches S3 endpoint + bucket pattern
    const fetchUrl = mockFetch.mock.calls[0][0] as string;
    expect(fetchUrl).toContain('https://s3.us-east-1.amazonaws.com/my-bucket/');

    // Verify S3 PUT method and public-read header
    const fetchOptions = mockFetch.mock.calls[0][1] as RequestInit;
    expect(fetchOptions.method).toBe('PUT');
    const headers = fetchOptions.headers as Record<string, string>;
    expect(headers['x-amz-acl']).toBe('public-read');

    // Verify the returned URL uses the public URL prefix
    expect(result).toContain('https://my-bucket.s3.us-east-1.amazonaws.com/');
  });

  it('uploadImage with active Imgur provider: fetch is called with Imgur API', async () => {
    const provider = makeImgurProvider();
    useImageStorageStore.getState().addProvider(provider);
    useImageStorageStore.getState().setActiveProvider(provider.id);

    // Mock successful Imgur response
    const mockResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        success: true,
        data: { link: 'https://i.imgur.com/abc123.png' },
      }),
    };
    mockFetch.mockResolvedValueOnce(mockResponse);

    const file = new File(['img-data'], 'photo.jpg', { type: 'image/jpeg' });
    const result = await useImageStorageStore.getState().uploadImage(file);

    expect(mockFetch).toHaveBeenCalledTimes(1);

    const fetchUrl = mockFetch.mock.calls[0][0] as string;
    expect(fetchUrl).toBe('https://api.imgur.com/3/image');

    const fetchOptions = mockFetch.mock.calls[0][1] as RequestInit;
    expect(fetchOptions.method).toBe('POST');
    const headers = fetchOptions.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Client-ID imgur_client_123');

    expect(result).toBe('https://i.imgur.com/abc123.png');
  });

  it('uploadImage with no active provider: returns null', async () => {
    const provider = makeS3Provider();
    useImageStorageStore.getState().addProvider(provider);
    // activeProvider remains null (default)

    const file = new File(['data'], 'test.png', { type: 'image/png' });
    const result = await useImageStorageStore.getState().uploadImage(file);

    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('uploadImage with activeProvider set but provider not found in list: returns null', async () => {
    // Set an activeProvider ID that does not exist in the providers list
    useImageStorageStore.setState({ activeProvider: 'non-existent-id' });

    const file = new File(['data'], 'test.png', { type: 'image/png' });
    const result = await useImageStorageStore.getState().uploadImage(file);

    expect(result).toBeNull();
  });
});

describe('cloudStore + file I/O interaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Simulate Tauri environment
    (window as unknown as { __TAURI_INTERNALS__?: boolean }).__TAURI_INTERNALS__ = true;
    // Reset cloudStore state
    useCloudStore.setState({
      cloudPath: null,
      cloudFiles: [],
      syncEnabled: false,
      lastSync: null,
      providers: [],
    });
  });

  it('saveToCloud: mock writeTextFile, file is written to cloud path with sanitized name', async () => {
    // Set up connected cloud provider with a known path
    useCloudStore.setState({ cloudPath: '/cloud/Markhere' });

    const mockedWrite = vi.mocked(writeTextFile);
    mockedWrite.mockResolvedValue(undefined);

    const savedPath = await useCloudStore.getState().saveToCloud('notes.md', '# Cloud Notes');

    expect(mockedWrite).toHaveBeenCalledWith('/cloud/Markhere/notes.md', '# Cloud Notes');
    expect(savedPath).toBe('/cloud/Markhere/notes.md');
  });

  it('saveToCloud: sanitizes filename to prevent directory traversal', async () => {
    useCloudStore.setState({ cloudPath: '/cloud/Markhere' });

    const mockedWrite = vi.mocked(writeTextFile);
    mockedWrite.mockResolvedValue(undefined);

    const savedPath = await useCloudStore.getState().saveToCloud(
      '../etc/passwd.md',
      'malicious content',
    );

    // Should replace / and \ with underscore
    expect(mockedWrite).toHaveBeenCalledWith(
      '/cloud/Markhere/.._etc_passwd.md',
      'malicious content',
    );
    expect(savedPath).toBe('/cloud/Markhere/.._etc_passwd.md');
  });

  it('saveToCloud: throws error when no cloud provider is connected', async () => {
    // cloudPath is null by default
    await expect(
      useCloudStore.getState().saveToCloud('file.md', 'content'),
    ).rejects.toThrow('No cloud provider connected');
  });

  it('getCloudFiles + sync: mock readDir, returns only .md files', async () => {
    useCloudStore.setState({ cloudPath: '/cloud/Markhere' });

    const mockedReadDir = vi.mocked(readDir);
    mockedReadDir.mockResolvedValue([
      { name: 'readme.md', isFile: true, isDirectory: false, isSymlink: false },
      { name: 'notes.md', isFile: true, isDirectory: false, isSymlink: false },
      { name: 'image.png', isFile: true, isDirectory: false, isSymlink: false },
      { name: 'subdir', isFile: false, isDirectory: true, isSymlink: false },
    ] as unknown as Array<{ name: string; isFile: boolean; isDirectory: boolean; isSymlink: boolean }>);

    // sync() calls readDir and populates cloudFiles
    await useCloudStore.getState().sync();

    const files = useCloudStore.getState().getCloudFiles();

    // Only .md files should be returned, directories and non-.md files excluded
    expect(files).toHaveLength(2);
    expect(files.map((f) => f.name)).toEqual(['readme.md', 'notes.md']);
    expect(files[0].path).toContain('/cloud/Markhere/');
  });

  it('getCloudFiles + sync: returns empty array when sync has not been called', () => {
    useCloudStore.setState({ cloudPath: '/cloud/Markhere' });

    const files = useCloudStore.getState().getCloudFiles();
    expect(files).toEqual([]);
  });
});

describe('gitStore + invoke interaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGitStore.setState({ ...gitStoreInitialState });
  });

  const sampleCommits = [
    {
      hash: 'abc123def456',
      short_hash: 'abc123d',
      author: 'Test Author',
      date: '2025-01-15T10:00:00Z',
      message: 'Initial commit',
    },
    {
      hash: 'def789ghi012',
      short_hash: 'def789g',
      author: 'Test Author',
      date: '2025-01-16T14:30:00Z',
      message: 'Add feature X',
    },
  ];

  it('loadHistory: invoke get_git_history, commits are populated in store', async () => {
    const mockedInvoke = vi.mocked(invoke);
    mockedInvoke.mockResolvedValue(sampleCommits);

    await useGitStore.getState().loadHistory('/home/user/doc.md');

    expect(mockedInvoke).toHaveBeenCalledWith('get_git_history', {
      filePath: '/home/user/doc.md',
    });

    const store = useGitStore.getState();
    expect(store.commits).toEqual(sampleCommits);
    expect(store.isEnabled).toBe(true);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
  });

  it('loadHistory: handles empty path gracefully (no-op)', async () => {
    await useGitStore.getState().loadHistory('');

    const store = useGitStore.getState();
    expect(store.commits).toEqual([]);
    expect(invoke).not.toHaveBeenCalled();
  });

  it('loadHistory: on invoke failure, sets isEnabled=false and clears commits', async () => {
    const mockedInvoke = vi.mocked(invoke);
    mockedInvoke.mockRejectedValue(new Error('Git not available'));

    await useGitStore.getState().loadHistory('/home/user/doc.md');

    const store = useGitStore.getState();
    expect(store.commits).toEqual([]);
    expect(store.isEnabled).toBe(false);
    expect(store.loading).toBe(false);
  });

  it('loadDiff: invoke get_git_diff, diff stored in store', async () => {
    const sampleDiff = {
      old_content: 'line1\nline2',
      new_content: 'line1\nline2\nline3',
      additions: 1,
      deletions: 0,
    };

    const mockedInvoke = vi.mocked(invoke);
    mockedInvoke.mockResolvedValue(sampleDiff);

    await useGitStore.getState().loadDiff(
      '/home/user/doc.md',
      'old-hash',
      'new-hash',
    );

    expect(mockedInvoke).toHaveBeenCalledWith('get_git_diff', {
      filePath: '/home/user/doc.md',
      oldHash: 'old-hash',
      newHash: 'new-hash',
    });

    const store = useGitStore.getState();
    expect(store.currentDiff).toEqual(sampleDiff);
    expect(store.loading).toBe(false);
  });

  it('loadDiff: on invoke failure, sets error message and clears diff', async () => {
    const mockedInvoke = vi.mocked(invoke);
    mockedInvoke.mockRejectedValue(new Error('Diff failed'));

    await useGitStore.getState().loadDiff('/path', 'old', 'new');

    const store = useGitStore.getState();
    expect(store.currentDiff).toBeNull();
    expect(store.error).toBe('Error: Diff failed');
    expect(store.loading).toBe(false);
  });

  it('selectCommit and clearDiff: manage selected hash and diff state', () => {
    // Start with some diff loaded
    const sampleDiff = {
      old_content: 'a',
      new_content: 'b',
      additions: 1,
      deletions: 0,
    };
    useGitStore.setState({ currentDiff: sampleDiff });

    useGitStore.getState().selectCommit('abc123');
    expect(useGitStore.getState().selectedHash).toBe('abc123');

    useGitStore.getState().clearDiff();
    expect(useGitStore.getState().currentDiff).toBeNull();
    expect(useGitStore.getState().selectedHash).toBeNull();
  });
});
