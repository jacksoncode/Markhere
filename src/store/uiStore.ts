import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ActiveView = 'documents' | 'files' | 'settings' | 'outline';
type SidebarMode = 'outline' | 'fileTree' | 'fileList';

interface UIState {
  activeView: ActiveView;
  sidebarOpen: boolean;
  sidebarMode: SidebarMode;
  focusMode: boolean;
  typewriterMode: boolean;
  sourceMode: boolean;
  pomodoroEnabled: boolean;
  wordGoalEnabled: boolean;
  loadingMessage: string;
  loadingProgress: number;
  errorMessage: string;
  setActiveView: (view: ActiveView) => void;
  setSidebarMode: (mode: SidebarMode) => void;
  toggleSidebar: () => void;
  toggleFocusMode: () => void;
  toggleTypewriterMode: () => void;
  toggleSourceMode: () => void;
  setSourceMode: (mode: boolean) => void;
  togglePomodoro: () => void;
  toggleWordGoal: () => void;
  setLoadingMessage: (message: string) => void;
  setLoadingProgress: (progress: number) => void;
  showError: (message: string) => void;
  clearError: () => void;
}

export const useUIState = create<UIState>()(
  persist(
    (set) => ({
      activeView: 'documents',
      sidebarOpen: true,
      sidebarMode: 'outline',
      focusMode: false,
      typewriterMode: false,
      sourceMode: false,
      pomodoroEnabled: false,
      wordGoalEnabled: false,
      loadingMessage: '',
      loadingProgress: 0,
      errorMessage: '',
      setActiveView: (view) => set({ activeView: view }),
      setSidebarMode: (mode) => set({ sidebarMode: mode }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      toggleFocusMode: () => set((state) => ({ focusMode: !state.focusMode })),
      toggleTypewriterMode: () => set((state) => ({ typewriterMode: !state.typewriterMode })),
      toggleSourceMode: () => set((state) => ({ sourceMode: !state.sourceMode })),
      setSourceMode: (mode) => set({ sourceMode: mode }),
      togglePomodoro: () => set((state) => ({ pomodoroEnabled: !state.pomodoroEnabled })),
      toggleWordGoal: () => set((state) => ({ wordGoalEnabled: !state.wordGoalEnabled })),
      setLoadingMessage: (message) => set({ loadingMessage: message }),
      setLoadingProgress: (progress) => set({ loadingProgress: progress }),
      showError: (message) => set({ errorMessage: message }),
      clearError: () => set({ errorMessage: '' }),
    }),
    {
      name: 'ui-state-storage',
      partialize: (state) => ({
        pomodoroEnabled: state.pomodoroEnabled,
        wordGoalEnabled: state.wordGoalEnabled,
        sidebarMode: state.sidebarMode,
      }),
    }
  )
);