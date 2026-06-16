import React, { useEffect, useState, useCallback, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import { useEditorState } from '../../store/editorStore';
import './TableOperations.css';

/* ------------------------------------------------------------------ */
/*  Inline SVG icons (24x24 viewBox, stroke-based)                     */
/* ------------------------------------------------------------------ */

const Icons = {
  AddRowAbove: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="4" x2="12" y2="8" />
      <line x1="10" y1="6" x2="14" y2="6" />
      <rect x="4" y="10" width="16" height="3" rx="1" />
      <rect x="4" y="15" width="16" height="3" rx="1" />
    </svg>
  ),
  AddRowBelow: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="6" width="16" height="3" rx="1" />
      <rect x="4" y="11" width="16" height="3" rx="1" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <line x1="10" y1="19" x2="14" y2="19" />
    </svg>
  ),
  AddColumnLeft: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="10" y1="12" x2="6" y2="12" />
      <line x1="8" y1="10" x2="8" y2="14" />
      <rect x="10" y="4" width="10" height="16" rx="1" />
      <line x1="15" y1="4" x2="15" y2="20" />
    </svg>
  ),
  AddColumnRight: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="10" height="16" rx="1" />
      <line x1="9" y1="4" x2="9" y2="20" />
      <line x1="17" y1="12" x2="21" y2="12" />
      <line x1="19" y1="10" x2="19" y2="14" />
    </svg>
  ),
  DeleteRow: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="8" width="16" height="3" rx="1" />
      <rect x="4" y="13" width="16" height="3" rx="1" />
      <line x1="8" y1="10" x2="16" y2="14" />
      <line x1="16" y1="10" x2="8" y2="14" />
    </svg>
  ),
  DeleteColumn: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="1" />
      <line x1="12" y1="4" x2="12" y2="20" />
      <line x1="8" y1="8" x2="16" y2="16" />
      <line x1="16" y1="8" x2="8" y2="16" />
    </svg>
  ),
  DeleteTable: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="1" />
      <line x1="8" y1="4" x2="8" y2="20" />
      <line x1="16" y1="4" x2="16" y2="20" />
      <line x1="4" y1="10" x2="20" y2="10" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  ),
  ToggleHeaderRow: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="6" rx="1" />
      <rect x="4" y="12" width="16" height="3" rx="1" />
      <rect x="4" y="17" width="16" height="3" rx="1" />
      <text x="12" y="8.5" textAnchor="middle" fontSize="5" fontWeight="bold" fill="currentColor" stroke="none">H</text>
    </svg>
  ),
  ToggleHeaderColumn: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="6" height="16" rx="1" />
      <rect x="12" y="4" width="8" height="16" rx="1" />
      <line x1="16" y1="4" x2="16" y2="20" />
      <text x="7" y="14" textAnchor="middle" fontSize="5" fontWeight="bold" fill="currentColor" stroke="none">H</text>
    </svg>
  ),
  MergeCells: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="6" width="6" height="5" rx="1" />
      <rect x="14" y="6" width="6" height="5" rx="1" />
      <line x1="10" y1="8.5" x2="14" y2="8.5" />
      <polyline points="12,6.5 10,8.5 12,10.5" fill="none" />
      <polyline points="12,6.5 14,8.5 12,10.5" fill="none" />
      <rect x="4" y="14" width="16" height="5" rx="1" />
    </svg>
  ),
  SplitCell: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="8" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
      <line x1="12" y1="14" x2="12" y2="18" />
      <line x1="10" y1="17" x2="14" y2="17" />
    </svg>
  ),
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * Given the editor selection, locate the <table> DOM element that
 * contains the cursor, or null if the cursor is not inside a table.
 */
function findTableElement(editor: Editor): HTMLElement | null {
  const { $anchor } = editor.state.selection;

  let tableDepth = -1;
  for (let d = $anchor.depth; d > 0; d--) {
    if ($anchor.node(d).type.name === 'table') {
      tableDepth = d;
      break;
    }
  }
  if (tableDepth < 0) return null;

  const tablePos = $anchor.start(tableDepth);
  let maybeNode: unknown = null;
  try { maybeNode = editor.view.nodeDOM(tablePos); } catch { return null; }

  if (maybeNode instanceof HTMLElement) return maybeNode;
  if (maybeNode && typeof maybeNode === 'object' && 'node' in maybeNode) {
    const candidate = (maybeNode as { node: unknown }).node;
    if (candidate instanceof HTMLElement) return candidate;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Button definitions                                                  */
/* ------------------------------------------------------------------ */

interface ButtonDef {
  icon: React.JSX.Element;
  label: string;
  cmd: string;
}

const BUTTON_GROUPS: ButtonDef[][] = [
  [
    { icon: Icons.AddRowAbove, label: 'Add row above', cmd: 'addRowBefore' },
    { icon: Icons.AddRowBelow, label: 'Add row below', cmd: 'addRowAfter' },
    { icon: Icons.AddColumnLeft, label: 'Add column left', cmd: 'addColumnBefore' },
    { icon: Icons.AddColumnRight, label: 'Add column right', cmd: 'addColumnAfter' },
  ],
  [
    { icon: Icons.DeleteRow, label: 'Delete row', cmd: 'deleteRow' },
    { icon: Icons.DeleteColumn, label: 'Delete column', cmd: 'deleteColumn' },
    { icon: Icons.DeleteTable, label: 'Delete table', cmd: 'deleteTable' },
  ],
  [
    { icon: Icons.ToggleHeaderRow, label: 'Toggle header row', cmd: 'toggleHeaderRow' },
    { icon: Icons.ToggleHeaderColumn, label: 'Toggle header column', cmd: 'toggleHeaderColumn' },
  ],
  [
    { icon: Icons.MergeCells, label: 'Merge cells', cmd: 'mergeCells' },
    { icon: Icons.SplitCell, label: 'Split cell', cmd: 'splitCell' },
  ],
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function TableOperations() {
  const { editorInstance: editor } = useEditorState();
  const [visible, setVisible] = useState(false);
  const [toolbarStyle, setToolbarStyle] = useState<React.CSSProperties>({});
  const toolbarRef = useRef<HTMLDivElement>(null);

  /* ---- Recalculate visibility and position ---- */
  const updatePosition = useCallback(() => {
    if (!editor || editor.isDestroyed) {
      setVisible(false);
      return;
    }

    if (!editor.isActive('table')) {
      setVisible(false);
      return;
    }

    const tableEl = findTableElement(editor);
    let editorWrapper: HTMLElement | null = null;
    try { editorWrapper = editor.view.dom.parentElement; } catch { setVisible(false); return; }
    if (!tableEl || !editorWrapper) {
      setVisible(false);
      return;
    }

    const wrapperRect = editorWrapper.getBoundingClientRect();
    const tableRect = tableEl.getBoundingClientRect();

    // Hide if table is completely scrolled out of the visible editor area
    if (
      tableRect.bottom < wrapperRect.top ||
      tableRect.top > wrapperRect.bottom
    ) {
      setVisible(false);
      return;
    }

    const gap = 6;
    const toolbarH = toolbarRef.current?.offsetHeight ?? 36;

    // Prefer above, fall back below when there's not enough room
    let top = tableRect.top - toolbarH - gap;
    if (top < wrapperRect.top) {
      top = tableRect.bottom + gap;
    }

    const left = tableRect.left + tableRect.width / 2;

    setToolbarStyle({
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      transform: 'translateX(-50%)',
      zIndex: 100,
    });
    setVisible(true);
  }, [editor]);

  /* ---- Editor events ---- */
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    editor.on('selectionUpdate', updatePosition);
    editor.on('transaction', updatePosition);

    return () => {
      editor.off('selectionUpdate', updatePosition);
      editor.off('transaction', updatePosition);
    };
  }, [editor, updatePosition]);

  /* ---- Scroll sync ---- */
  useEffect(() => {
    let wrapper: HTMLElement | null = null;
    try { wrapper = editor?.view.dom.parentElement ?? null; } catch { return; }
    if (!wrapper) return;

    wrapper.addEventListener('scroll', updatePosition, { passive: true });
    return () => wrapper.removeEventListener('scroll', updatePosition);
  }, [editor, updatePosition]);

  /* ---- Measure real toolbar height after paint ---- */
  useEffect(() => {
    if (!visible) return;

    const raf = requestAnimationFrame(() => updatePosition());
    return () => cancelAnimationFrame(raf);
  }, [visible, updatePosition]);

  /* ---- Bail early ---- */
  if (!editor || !visible) return null;

  /* ---- Execute a table command (types loosely so all commands work) ---- */
  const exec = (cmd: string) => {
    (editor.chain().focus() as any)[cmd]?.()?.run();
    // Re-check position after structural mutation
    setTimeout(updatePosition, 50);
  };

  return (
    <div
      className="table-operations-toolbar"
      ref={toolbarRef}
      style={toolbarStyle}
    >
      {BUTTON_GROUPS.flatMap((group, gi) => {
        const items: React.JSX.Element[] = [];

        if (gi > 0) {
          items.push(
            <span key={`sep-${gi}`} className="table-op-divider" />
          );
        }

        group.forEach((def) => {
          items.push(
            <button
              key={def.label}
              className="table-op-btn"
              title={def.label}
              aria-label={def.label}
              onClick={() => exec(def.cmd)}
            >
              {def.icon}
            </button>
          );
        });

        return items;
      })}
    </div>
  );
}
