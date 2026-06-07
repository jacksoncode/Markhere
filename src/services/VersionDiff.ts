/**
 * 增强版版本对比 — 行级 + 字符级 diff，样式高亮
 */

export interface DiffLine {
  type: 'add' | 'remove' | 'same';
  content: string;
  lineNum?: number;
  comment?: string;
}

export class VersionDiff {
  /** 行级 diff */
  static lineDiff(oldText: string, newText: string): DiffLine[] {
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');
    const result: DiffLine[] = [];
    const maxLen = Math.max(oldLines.length, newLines.length);

    for (let i = 0; i < maxLen; i++) {
      const o = oldLines[i];
      const n = newLines[i];
      if (i >= oldLines.length) {
        result.push({ type: 'add', content: n, lineNum: i + 1 });
      } else if (i >= newLines.length) {
        result.push({ type: 'remove', content: o, lineNum: i + 1 });
      } else if (o === n) {
        result.push({ type: 'same', content: o, lineNum: i + 1 });
      } else {
        result.push({ type: 'remove', content: o, lineNum: i + 1 });
        result.push({ type: 'add', content: n, lineNum: i + 1 });
      }
    }
    return result;
  }

  /** 字符级差高亮 — 高亮变化部分 */
  static charHighlight(oldLine: string, newLine: string): { old: string; new: string } {
    if (oldLine === newLine) return { old: oldLine, new: newLine };

    // Find common prefix
    let i = 0;
    while (i < oldLine.length && i < newLine.length && oldLine[i] === newLine[i]) i++;

    // Find common suffix
    let j = 0;
    while (j < oldLine.length - i && j < newLine.length - i &&
      oldLine[oldLine.length - 1 - j] === newLine[newLine.length - 1 - j]) j++;

    const prefix = oldLine.slice(0, i);
    const oldMid = oldLine.slice(i, oldLine.length - j);
    const newMid = newLine.slice(i, newLine.length - j);
    const suffix = oldLine.slice(oldLine.length - j);

    return {
      old: prefix + `<span class="diff-removed">${oldMid}</span>` + suffix,
      new: prefix + `<span class="diff-added">${newMid}</span>` + suffix,
    };
  }

  /** 添加注释到 diff 行 */
  static addComment(lines: DiffLine[], lineIdx: number, comment: string): DiffLine[] {
    return lines.map((l, i) => (i === lineIdx ? { ...l, comment } : l));
  }

  /** 生成 diff 统计 */
  static getStats(lines: DiffLine[]): { added: number; removed: number; changed: number; unchanged: number } {
    let added = 0, removed = 0, changed = 0, unchanged = 0;
    let lastWasRemove = false;
    for (const l of lines) {
      if (l.type === 'add') { added++; if (lastWasRemove) { added--; removed--; changed++; } }
      else if (l.type === 'remove') { removed++; }
      else unchanged++;
      lastWasRemove = l.type === 'remove';
    }
    return { added, removed, changed, unchanged };
  }
}
