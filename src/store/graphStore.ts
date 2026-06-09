import { create } from 'zustand';

interface GraphNodeProps { x: number; y: number; vx: number; vy: number; fx?: number | null; fy?: number | null }

interface GraphState {
  positions: Record<string, GraphNodeProps>;
  focusedNode: string | null;
  colorBy: 'folder' | 'tag' | 'none';
  setPositions: (pos: Record<string, GraphNodeProps>) => void;
  focusNode: (id: string | null) => void;
  setColorBy: (mode: 'folder' | 'tag' | 'none') => void;
}

export const useGraphStore = create<GraphState>((set) => ({
  positions: {},
  focusedNode: null,
  colorBy: 'none',
  setPositions: (positions) => set({ positions }),
  focusNode: (id) => set({ focusedNode: id }),
  setColorBy: (colorBy) => set({ colorBy }),
}));
