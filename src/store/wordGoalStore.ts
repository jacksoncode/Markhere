import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WordGoalState {
  targetWords: number;
  enabled: boolean;
  showProgress: boolean;
  
  setTargetWords: (target: number) => void;
  setEnabled: (enabled: boolean) => void;
  setShowProgress: (show: boolean) => void;
  calculateProgress: (currentWords: number) => number;
}

export const useWordGoalStore = create<WordGoalState>()(
  persist(
    (set, get) => ({
      targetWords: 1000,
      enabled: false,
      showProgress: true,
      
      setTargetWords: (target) => set({ targetWords: Math.max(0, target) }),
      setEnabled: (enabled) => set({ enabled }),
      setShowProgress: (show) => set({ showProgress: show }),
      
      calculateProgress: (currentWords) => {
        const { targetWords } = get();
        if (targetWords === 0) return 0;
        return Math.min(100, Math.round((currentWords / targetWords) * 100));
      },
    }),
    {
      name: 'word-goal-storage',
    }
  )
);