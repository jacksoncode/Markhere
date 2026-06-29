/**
 * Database Formula Engine (P1-4)
 * 
 * Provides spreadsheet-like formulas for database properties:
 *   =SUM(PropertyName)   — sum of numeric values
 *   =AVG(PropertyName)   — average of numeric values
 *   =MAX(PropertyName)   — maximum numeric value
 *   =MIN(PropertyName)   — minimum numeric value
 *   =COUNT()             — count of records
 *   =COUNTIF(Property, value) — count matching records
 * 
 * Formulas recalculate on every record change.
 */

import type { Database } from '../store/databaseStore';

/** AST node types for parsed formulas */
type FormulaNode =
  | { type: 'function'; name: string; args: string[] }
  | { type: 'property'; name: string }
  | { type: 'number'; value: number }
  | { type: 'string'; value: string };

/** Parse a formula string like '=SUM(Score)' into an AST */
function parseFormula(raw: string): FormulaNode | null {
  const str = raw.trim();
  if (!str.startsWith('=')) return null;

  const expr = str.slice(1).trim();

  // Match function calls: FUNC(arg1, arg2, ...)
  const funcMatch = expr.match(/^(\w+)\(([^)]*)\)$/);
  if (funcMatch) {
    const name = funcMatch[1].toUpperCase();
    const argsStr = funcMatch[2].trim();
    const args = argsStr
      ? argsStr.split(',').map(a => a.trim().replace(/^['"]|['"]$/g, ''))
      : [];
    return { type: 'function', name, args };
  }

  return null;
}

/** Evaluate a parsed formula against a database */
function evaluateFormula(
  node: FormulaNode,
  db: Database
): string | number {
  if (node.type === 'number') return node.value;
  if (node.type === 'string') return node.value;

  if (node.type === 'function') {
    switch (node.name) {
      case 'COUNT': return db.records.length;

      case 'SUM': {
        const propName = node.args[0];
        if (!propName) return 0;
        const prop = db.properties.find(p => p.name === propName);
        if (!prop) return 0;
        return db.records.reduce((sum, r) => {
          const v = r.values[prop.id];
          const n = typeof v === 'number' ? v : parseFloat(String(v));
          return sum + (isNaN(n) ? 0 : n);
        }, 0);
      }

      case 'AVG': {
        const propName = node.args[0];
        if (!propName) return 0;
        const prop = db.properties.find(p => p.name === propName);
        if (!prop) return 0;
        const values = db.records
          .map(r => {
            const v = r.values[prop.id];
            return typeof v === 'number' ? v : parseFloat(String(v));
          })
          .filter(n => !isNaN(n));
        return values.length > 0
          ? values.reduce((a, b) => a + b, 0) / values.length
          : 0;
      }

      case 'MAX': {
        const propName = node.args[0];
        if (!propName) return 0;
        const prop = db.properties.find(p => p.name === propName);
        if (!prop) return 0;
        const values = db.records
          .map(r => {
            const v = r.values[prop.id];
            return typeof v === 'number' ? v : parseFloat(String(v));
          })
          .filter(n => !isNaN(n));
        return values.length > 0 ? Math.max(...values) : 0;
      }

      case 'MIN': {
        const propName = node.args[0];
        if (!propName) return 0;
        const prop = db.properties.find(p => p.name === propName);
        if (!prop) return 0;
        const values = db.records
          .map(r => {
            const v = r.values[prop.id];
            return typeof v === 'number' ? v : parseFloat(String(v));
          })
          .filter(n => !isNaN(n));
        return values.length > 0 ? Math.min(...values) : 0;
      }

      case 'COUNTIF': {
        if (node.args.length < 2) return 0;
        const propName = node.args[0];
        const matchValue = node.args[1];
        const prop = db.properties.find(p => p.name === propName);
        if (!prop) return 0;
        return db.records.filter(r => String(r.values[prop.id]) === matchValue).length;
      }

      default:
        return `#ERROR: Unknown function '${node.name}'`;
    }
  }

  return '#ERROR';
}

/**
 * Main entry point: evaluate a formula string against a database.
 * Returns the computed value or an error string.
 */
export function evaluateFormulaText(
  raw: string,
  db: Database
): string | number {
  const ast = parseFormula(raw);
  if (!ast) return raw; // Not a formula — return as-is
  try {
    return evaluateFormula(ast, db);
  } catch (e) {
    return `#ERROR: ${e}`;
  }
}

/**
 * Get the computed value for a formula property applied to the whole database.
 * Formula properties are aggregate — they compute across all records.
 */
export function getFormulaValue(
  _propertyId: string,
  formula: string,
  db: Database
): string | number {
  return evaluateFormulaText(formula, db);
}

/**
 * Check if a string is a formula expression (starts with =).
 */
export function isFormulaExpression(value: string): boolean {
  return value.startsWith('=');
}
