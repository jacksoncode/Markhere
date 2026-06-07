import { describe, it, expect, beforeEach } from 'vitest';
import { useDatabaseStore } from './databaseStore';

describe('DatabaseStore', () => {
  beforeEach(() => { useDatabaseStore.setState({ databases: [], activeDbId: null }); });

  it('creates database with default properties and table view', () => {
    const db = useDatabaseStore.getState().createDatabase('Projects');
    expect(db.title).toBe('Projects');
    expect(db.properties).toHaveLength(3); // Name, Tags, Created
    expect(db.views).toHaveLength(1);
    expect(db.views[0].type).toBe('table');
    expect(db.activeViewId).toBe(db.views[0].id);
    expect(useDatabaseStore.getState().databases).toHaveLength(1);
  });

  it('adds and queries records', () => {
    const db = useDatabaseStore.getState().createDatabase('Test');
    useDatabaseStore.getState().addRecord(db.id, { [db.properties[0].id]: 'Task 1' });
    useDatabaseStore.getState().addRecord(db.id, { [db.properties[0].id]: 'Task 2' });

    const fresh = useDatabaseStore.getState().getDatabase(db.id);
    expect(fresh?.records).toHaveLength(2);
  });

  it('deletes database', () => {
    const db = useDatabaseStore.getState().createDatabase('Temp');
    useDatabaseStore.getState().deleteDatabase(db.id);
    expect(useDatabaseStore.getState().databases).toHaveLength(0);
    expect(useDatabaseStore.getState().activeDbId).toBeNull();
  });

  it('adds and removes properties', () => {
    const db = useDatabaseStore.getState().createDatabase('Test');
    const prop = { id: 'p1', name: 'Priority', type: 'select' as const, options: ['High', 'Low'] };
    useDatabaseStore.getState().addProperty(db.id, prop);
    expect(useDatabaseStore.getState().getDatabase(db.id)?.properties).toHaveLength(4);

    useDatabaseStore.getState().removeProperty(db.id, 'p1');
    expect(useDatabaseStore.getState().getDatabase(db.id)?.properties).toHaveLength(3);
  });

  it('exports and imports', () => {
    const db = useDatabaseStore.getState().createDatabase('Export Test');
    useDatabaseStore.getState().addRecord(db.id, { [db.properties[0].id]: 'Rec 1' });

    const json = useDatabaseStore.getState().exportToFile(db.id);
    expect(json).toContain('Export Test');

    const imported = useDatabaseStore.getState().importFromFile(json);
    expect(imported.title).toBe('Export Test');
    expect(imported.records).toHaveLength(1);
  });

  it('switches active view', () => {
    const db = useDatabaseStore.getState().createDatabase('Views');
    const newView = { id: 'v2', name: 'Board', type: 'board' as const, config: {} };
    useDatabaseStore.getState().addView(db.id, newView);
    useDatabaseStore.getState().setActiveView(db.id, 'v2');
    expect(useDatabaseStore.getState().getDatabase(db.id)?.activeViewId).toBe('v2');
  });
});
