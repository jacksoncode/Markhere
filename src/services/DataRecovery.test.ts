import { describe, it, expect, beforeEach } from 'vitest';
import { DataRecovery } from './DataRecovery';

describe('DataRecovery', () => {
  beforeEach(() => DataRecovery.clear());

  it('saves and retrieves snapshot', () => {
    DataRecovery.saveSnapshot('# Hello World', '/test.md');
    const snap = DataRecovery.getSnapshot();
    expect(snap).toBeTruthy();
    expect(snap?.content).toBe('# Hello World');
    expect(snap?.path).toBe('/test.md');
    expect(snap?.checksum).toBeTruthy();
  });

  it('recovery checks checksum integrity', () => {
    DataRecovery.saveSnapshot('# Valid', '/test.md');
    const result = DataRecovery.recover(() => false);
    expect(result).toBeTruthy();
    expect(result?.content).toBe('# Valid');
  });

  it('skips recovery when current content matches', () => {
    DataRecovery.saveSnapshot('# Same', '/test.md');
    const result = DataRecovery.recover(() => true); // already has content
    expect(result).toBeNull();
  });

  it('clears snapshot after successful recovery', () => {
    DataRecovery.saveSnapshot('# Data', '/test.md');
    DataRecovery.recover(() => false);
    expect(DataRecovery.getSnapshot()).toBeNull();
  });

  it('stores backups with max limit', () => {
    for (let i = 0; i < 7; i++) DataRecovery.saveSnapshot(`# Note ${i}`, `/test${i}.md`);
    const backups = DataRecovery.getBackups();
    expect(backups.length).toBeLessThanOrEqual(5);
  });
});
