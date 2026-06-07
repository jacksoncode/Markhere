import { describe, it, expect, beforeEach } from 'vitest';
import { PluginRegistry } from './PluginRegistry';

describe('PluginRegistry', () => {
  beforeEach(() => {
    PluginRegistry.registry.clear();
    PluginRegistry.installed.clear();
    localStorage.clear();
    PluginRegistry.loadBuiltin();
  });

  it('loads builtin plugins', () => {
    expect(PluginRegistry.getAll().length).toBeGreaterThanOrEqual(5);
  });

  it('searches plugins by name', () => {
    const results = PluginRegistry.search('PPTX');
    expect(results.some(p => p.id === 'markhere-export-pptx')).toBe(true);
  });

  it('filters by category', () => {
    const exportPlugins = PluginRegistry.byCategory('export');
    expect(exportPlugins.length).toBeGreaterThanOrEqual(2);
    exportPlugins.forEach(p => expect(p.category).toBe('export'));
  });

  it('installs and uninstalls plugins', () => {
    const id = 'markhere-export-pptx';
    expect(PluginRegistry.isInstalled(id)).toBe(false);
    PluginRegistry.install(id);
    expect(PluginRegistry.isInstalled(id)).toBe(true);
    expect(PluginRegistry.getInstalled()).toHaveLength(1);
    PluginRegistry.uninstall(id);
    expect(PluginRegistry.isInstalled(id)).toBe(false);
  });

  it('returns plugin detail by id', () => {
    const p = PluginRegistry.get('markhere-mindmap');
    expect(p).toBeTruthy();
    expect(p?.category).toBe('editor');
    expect(p?.rating).toBeGreaterThan(0);
  });
});
