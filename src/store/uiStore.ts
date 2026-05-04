import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ActiveView = 'documents' | 'files' | 'settings' | 'outline';

interface UIState {
  activeView: ActiveView;
  sidebarOpen: boolean;
  focusMode: boolean;
  typewriterMode: boolean;
  sourceMode: boolean;
  pomodoroEnabled: boolean;
  wordGoalEnabled: boolean;
  setActiveView: (view: ActiveView) => void;
  toggleSidebar: () => void;
  toggleFocusMode: () => void;
  toggleTypewriterMode: () => void;
  toggleSourceMode: () => void;
  setSourceMode: (mode: boolean) => void;
  togglePomodoro: () => void;
  toggleWordGoal: () => void;
}

export const useUIState = create<UIState>()(
  persist(
    (set) => ({
      activeView: 'documents',
      sidebarOpen: true,
      focusMode: false,
      typewriterMode: false,
      sourceMode: false,
      pomodoroEnabled: false,
      wordGoalEnabled: false,
      setActiveView: (view) => set({ activeView: view }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      toggleFocusMode: () => set((state) => ({ focusMode: !state.focusMode })),
      toggleTypewriterMode: () => set((state) => ({ typewriterMode: !state.typewriterMode })),
      toggleSourceMode: () => set((state) => ({ sourceMode: !state.sourceMode })),
      setSourceMode: (mode) => set({ sourceMode: mode }),
      togglePomodoro: () => set((state) => ({ pomodoroEnabled: !state.pomodoroEnabled })),
      toggleWordGoal: () => set((state) => ({ wordGoalEnabled: !state.wordGoalEnabled })),
    }),
    {
      name: 'ui-state-storage',
      partialize: (state) => ({
        pomodoroEnabled: state.pomodoroEnabled,
        wordGoalEnabled: state.wordGoalEnabled,
      }),
    }
  )
);