import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, NodeSelection } from '@tiptap/pm/state';
import { EditorView } from '@tiptap/pm/view';

/**
 * Notion-style block drag handle. A six-dot grip appears to the left of the
 * top-level block under the pointer; dragging it reorders that block within
 * the document.
 *
 * Implementation notes:
 *  - The handle is a single DOM element managed by the plugin view, positioned
 *    over the hovered block (cheaper than a decoration per block).
 *  - Reordering uses a NodeSelection + a single move transaction so it is one
 *    undo step.
 */

export const dragHandlePluginKey = new PluginKey('blockDragHandle');

const HANDLE_WIDTH = 24;

/** Resolve the top-level block position for a coordinate inside the editor. */
function topLevelBlockAt(view: EditorView, clientX: number, clientY: number): number | null {
  const posInfo = view.posAtCoords({ left: clientX, top: clientY });
  if (!posInfo) return null;
  // Walk up to the depth-1 (top-level) node.
  const $pos = view.state.doc.resolve(posInfo.inside >= 0 ? posInfo.inside : posInfo.pos);
  if ($pos.depth === 0) {
    // Already at top — use the position before the node at this point.
    const node = view.state.doc.nodeAt($pos.pos);
    return node ? $pos.pos : null;
  }
  return $pos.before(1);
}

class DragHandleView {
  private handle: HTMLElement;
  private view: EditorView;
  private hoveredPos: number | null = null;
  private dragging = false;

  constructor(view: EditorView) {
    this.view = view;

    const handle = document.createElement('div');
    handle.className = 'block-drag-handle';
    handle.setAttribute('draggable', 'true');
    handle.setAttribute('aria-label', 'Drag to reorder block');
    handle.contentEditable = 'false';
    handle.innerHTML = '⠿';
    handle.style.display = 'none';
    this.handle = handle;

    // Mount inside the editor's parent so absolute positioning is relative
    // to the scrolling content.
    const parent = view.dom.parentElement || document.body;
    if (getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative';
    }
    parent.appendChild(handle);

    this.view.dom.addEventListener('mousemove', this.onMouseMove);
    this.view.dom.addEventListener('mouseleave', this.onMouseLeave);
    handle.addEventListener('dragstart', this.onDragStart);
    handle.addEventListener('dragend', this.onDragEnd);
    this.view.dom.addEventListener('dragover', this.onDragOver);
    this.view.dom.addEventListener('drop', this.onDrop);
  }

  private onMouseMove = (e: MouseEvent) => {
    if (this.dragging) return;
    const pos = topLevelBlockAt(this.view, e.clientX, e.clientY);
    if (pos === null) {
      this.hide();
      return;
    }
    this.hoveredPos = pos;
    this.positionHandle(pos);
  };

  private onMouseLeave = () => {
    if (!this.dragging) this.hide();
  };

  private positionHandle(pos: number) {
    const node = this.view.state.doc.nodeAt(pos);
    if (!node) {
      this.hide();
      return;
    }
    let dom: Node | null;
    try {
      dom = this.view.nodeDOM(pos);
    } catch {
      this.hide();
      return;
    }
    if (!(dom instanceof HTMLElement)) {
      this.hide();
      return;
    }
    const parent = this.handle.parentElement!;
    const parentRect = parent.getBoundingClientRect();
    const rect = dom.getBoundingClientRect();
    this.handle.style.display = 'flex';
    this.handle.style.top = `${rect.top - parentRect.top + parent.scrollTop}px`;
    this.handle.style.left = `${rect.left - parentRect.left - HANDLE_WIDTH}px`;
    this.handle.style.height = `${Math.min(rect.height, 28)}px`;
  }

  private hide() {
    this.handle.style.display = 'none';
    this.hoveredPos = null;
  }

  private onDragStart = (e: DragEvent) => {
    if (this.hoveredPos === null) return;
    this.dragging = true;
    const { state } = this.view;
    const node = state.doc.nodeAt(this.hoveredPos);
    if (!node) return;
    // Select the whole node so ProseMirror tracks the dragged slice.
    const tr = state.tr.setSelection(NodeSelection.create(state.doc, this.hoveredPos));
    this.view.dispatch(tr);
    e.dataTransfer?.setData('text/plain', '');
    e.dataTransfer!.effectAllowed = 'move';
    // Store the source position on the dataTransfer via a closure flag.
    this.dragSourcePos = this.hoveredPos;
  };

  private dragSourcePos: number | null = null;

  private onDragOver = (e: DragEvent) => {
    if (!this.dragging) return;
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'move';
  };

  private onDrop = (e: DragEvent) => {
    if (!this.dragging || this.dragSourcePos === null) return;
    e.preventDefault();
    const { state } = this.view;
    const sourcePos = this.dragSourcePos;
    const sourceNode = state.doc.nodeAt(sourcePos);
    if (!sourceNode) {
      this.resetDrag();
      return;
    }

    const targetPos = topLevelBlockAt(this.view, e.clientX, e.clientY);
    if (targetPos === null || targetPos === sourcePos) {
      this.resetDrag();
      return;
    }

    const sourceEnd = sourcePos + sourceNode.nodeSize;
    // Build a transaction: delete source, then insert before/after target.
    const tr = state.tr;
    const slice = sourceNode;
    tr.delete(sourcePos, sourceEnd);

    // Map the target position across the deletion.
    let insertPos = tr.mapping.map(targetPos);
    // If dropping below the source, the mapped target already accounts for it.
    tr.insert(insertPos, slice);
    this.view.dispatch(tr.scrollIntoView());
    this.resetDrag();
  };

  private onDragEnd = () => {
    this.resetDrag();
  };

  private resetDrag() {
    this.dragging = false;
    this.dragSourcePos = null;
    this.hide();
  }

  update(view: EditorView) {
    this.view = view;
  }

  destroy() {
    this.view.dom.removeEventListener('mousemove', this.onMouseMove);
    this.view.dom.removeEventListener('mouseleave', this.onMouseLeave);
    this.view.dom.removeEventListener('dragover', this.onDragOver);
    this.view.dom.removeEventListener('drop', this.onDrop);
    this.handle.remove();
  }
}

export const BlockDragHandleExtension = Extension.create({
  name: 'blockDragHandle',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: dragHandlePluginKey,
        view: (editorView) => new DragHandleView(editorView),
      }),
    ];
  },
});
