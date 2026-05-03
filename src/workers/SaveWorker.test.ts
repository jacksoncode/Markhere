import { describe, it, expect, vi } from 'vitest';
import { SaveWorker } from '../workers/SaveWorker';

describe('SaveWorker', () => {
  it('should debounce save operations', async () => {
    const mockSave = vi.fn();
    const worker = new SaveWorker(500);
    
    worker.triggerSave(mockSave);
    worker.triggerSave(mockSave);
    worker.triggerSave(mockSave);
    
    expect(mockSave).not.toHaveBeenCalled();
    
    await new Promise(resolve => setTimeout(resolve, 600));
    
    expect(mockSave).toHaveBeenCalledTimes(1);
  });

  it('should immediate save bypass debounce', async () => {
    const mockSave = vi.fn();
    const worker = new SaveWorker(500);
    
    await worker.immediateSave(mockSave);
    
    expect(mockSave).toHaveBeenCalledTimes(1);
  });

  it('should cancel pending saves', async () => {
    const mockSave = vi.fn();
    const worker = new SaveWorker(500);
    
    worker.triggerSave(mockSave);
    worker.cancel();
    
    await new Promise(resolve => setTimeout(resolve, 600));
    
    expect(mockSave).not.toHaveBeenCalled();
  });
});