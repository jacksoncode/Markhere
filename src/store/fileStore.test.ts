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
});