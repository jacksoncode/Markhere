/**
 * Unit tests for DatabaseFormula engine (P1-4)
 */
import { describe, it, expect } from 'vitest';
import { evaluateFormulaText, isFormulaExpression } from './DatabaseFormula';
import type { Database } from '../store/databaseStore';

function makeDb(records: any[]): Database {
  return {
    id: 'test',
    title: 'Test',
    properties: [
      { id: 'score', name: 'Score', type: 'number' },
      { id: 'name', name: 'Name', type: 'text' },
      { id: 'status', name: 'Status', type: 'select', options: ['done', 'pending'] },
    ],
    views: [],
    records: records.map(r => ({
      id: `rec_${Math.random()}`,
      values: r,
    })),
    activeViewId: null,
  };
}

describe('DatabaseFormula', () => {
  it('returns raw text for non-formula strings', () => {
    expect(evaluateFormulaText('hello', makeDb([]))).toBe('hello');
    expect(evaluateFormulaText('42', makeDb([]))).toBe('42');
    expect(evaluateFormulaText('', makeDb([]))).toBe('');
  });

  it('COUNT returns record count', () => {
    const db = makeDb([{ score: 1 }, { score: 2 }, { score: 3 }]);
    expect(evaluateFormulaText('=COUNT()', db)).toBe(3);
  });

  it('SUM sums numeric property values', () => {
    const db = makeDb([{ score: 10 }, { score: 20 }, { score: 30 }]);
    expect(evaluateFormulaText('=SUM(Score)', db)).toBe(60);
  });

  it('AVG averages property values', () => {
    const db = makeDb([{ score: 10 }, { score: 20 }, { score: 30 }]);
    expect(evaluateFormulaText('=AVG(Score)', db)).toBe(20);
  });

  it('MAX returns maximum', () => {
    const db = makeDb([{ score: 10 }, { score: 50 }, { score: 30 }]);
    expect(evaluateFormulaText('=MAX(Score)', db)).toBe(50);
  });

  it('MIN returns minimum', () => {
    const db = makeDb([{ score: 10 }, { score: 50 }, { score: 30 }]);
    expect(evaluateFormulaText('=MIN(Score)', db)).toBe(10);
  });

  it('COUNTIF counts matching records', () => {
    const db = makeDb([
      { status: 'done' },
      { status: 'pending' },
      { status: 'done' },
    ]);
    expect(evaluateFormulaText('=COUNTIF(Status, done)', db)).toBe(2);
  });

  it('SUM on empty records returns 0', () => {
    expect(evaluateFormulaText('=SUM(Score)', makeDb([]))).toBe(0);
  });

  it('isFormulaExpression detects formulas', () => {
    expect(isFormulaExpression('=SUM(X)')).toBe(true);
    expect(isFormulaExpression('hello')).toBe(false);
    expect(isFormulaExpression('')).toBe(false);
  });
});
