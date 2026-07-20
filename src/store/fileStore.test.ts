import { describe, it, expect } from 'vitest';
import { useFileStore } from '../store/fileStore';

describe('FileStore', () => {
  it('should have correct initial state', () => {
    const state = useFileStore.getState();
    
    expect(state.currentPath).toBeNull();
    expect(state.fileName).toBeNull();
    expect(state.isNewFile).toBe(true);
    expect(state.savedContent).toBe('');
  });

  it('should update state correctly', () => {
    const { setCurrentPath, setFileName, setSavedContent } = useFileStore.getState();
    
    setCurrentPath('/test/path.md');
    setFileName('test.md');
    setSavedContent('# Test Content');
    
    const newState = useFileStore.getState();
    expect(newState.currentPath).toBe('/test/path.md');
    expect(newState.fileName).toBe('test.md');
    expect(newState.savedContent).toBe('# Test Content');
    
    useFileStore.setState({
      currentPath: null,
      fileName: '',
      isNewFile: true,
      savedContent: '',
    });
  });

  it('derives fileName from a Windows backslash path and strips .md', () => {
    const { setCurrentPath } = useFileStore.getState();
    setCurrentPath('C:\\Users\\alice\\Project\\Notes.md');
    const s = useFileStore.getState();
    expect(s.currentPath).toBe('C:\\Users\\alice\\Project\\Notes.md');
    expect(s.fileName).toBe('Notes');
    expect(s.isNewFile).toBe(false);
    useFileStore.setState({ currentPath: null, fileName: null, isNewFile: true, savedContent: '' });
  });

  it('derives fileName from a POSIX path and strips .markdown/.txt', () => {
    const { setCurrentPath } = useFileStore.getState();
    setCurrentPath('/home/user/readme.markdown');
    expect(useFileStore.getState().fileName).toBe('readme');
    setCurrentPath('/home/user/note.txt');
    expect(useFileStore.getState().fileName).toBe('note');
    useFileStore.setState({ currentPath: null, fileName: null, isNewFile: true, savedContent: '' });
  });

  it('reset() restores the initial state', () => {
    const { setCurrentPath, setSavedContent, reset } = useFileStore.getState();
    setCurrentPath('/a/b.md');
    setSavedContent('# x');
    reset();
    const s = useFileStore.getState();
    expect(s.currentPath).toBeNull();
    expect(s.fileName).toBeNull();
    expect(s.savedContent).toBe('');
    expect(s.isNewFile).toBe(true);
  });
});