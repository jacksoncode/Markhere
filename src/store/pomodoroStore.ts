import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type TimerPhase = 'work' | 'shortBreak' | 'longBreak';

interface PomodoroState {
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  longBreakInterval: number;
  
  phase: TimerPhase;
  timeRemaining: number;
  isRunning: boolean;
  
  sessionsCompleted: number;
  totalWorkTime: number;
  todaySessions: number;
  todayDate: string;
  
  setWorkDuration: (minutes: number) => void;
  setShortBreakDuration: (minutes: number) => void;
  setLongBreakDuration: (minutes: number) => void;
  setLongBreakInterval: (sessions: number) => void;
  
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  skipPhase: () => void;
  
  tick: () => void;
  completeSession: () => void;
}

const getTodayDate = () => new Date().toISOString().split('T')[0];

export const usePomodoroStore = create<PomodoroState>()(
  persist(
    (set, get) => ({
      workDuration: 25,
      shortBreakDuration: 5,
      longBreakDuration: 15,
      longBreakInterval: 4,
      
      phase: 'work',
      timeRemaining: 25 * 60,
      isRunning: false,
      
      sessionsCompleted: 0,
      totalWorkTime: 0,
      todaySessions: 0,
      todayDate: getTodayDate(),
      
      setWorkDuration: (minutes) => set({
        workDuration: minutes,
        timeRemaining: get().phase === 'work' && !get().isRunning ? minutes * 60 : get().timeRemaining,
      }),
      
      setShortBreakDuration: (minutes) => set({
        shortBreakDuration: minutes,
        timeRemaining: get().phase === 'shortBreak' && !get().isRunning ? minutes * 60 : get().timeRemaining,
      }),
      
      setLongBreakDuration: (minutes) => set({
        longBreakDuration: minutes,
        timeRemaining: get().phase === 'longBreak' && !get().isRunning ? minutes * 60 : get().timeRemaining,
      }),
      
      setLongBreakInterval: (sessions) => set({ longBreakInterval: sessions }),
      
      startTimer: () => set({ isRunning: true }),
      pauseTimer: () => set({ isRunning: false }),
      
      resetTimer: () => {
        const { phase, workDuration, shortBreakDuration, longBreakDuration } = get();
        const duration = phase === 'work' ? workDuration : phase === 'shortBreak' ? shortBreakDuration : longBreakDuration;
        set({ timeRemaining: duration * 60, isRunning: false });
      },
      
      skipPhase: () => {
        const { phase, sessionsCompleted, longBreakInterval, workDuration, shortBreakDuration, longBreakDuration } = get();
        let nextPhase: TimerPhase;
        let duration: number;
        
        if (phase === 'work') {
          if ((sessionsCompleted + 1) % longBreakInterval === 0) {
            nextPhase = 'longBreak';
            duration = longBreakDuration;
          } else {
            nextPhase = 'shortBreak';
            duration = shortBreakDuration;
          }
        } else {
          nextPhase = 'work';
          duration = workDuration;
        }
        
        set({ phase: nextPhase, timeRemaining: duration * 60, isRunning: false });
      },
      
      tick: () => {
        const { timeRemaining, isRunning, phase, workDuration, shortBreakDuration, longBreakDuration, sessionsCompleted, longBreakInterval, totalWorkTime } = get();
        
        if (!isRunning || timeRemaining <= 0) return;
        
        const newTime = timeRemaining - 1;
        
        if (newTime <= 0) {
          if (phase === 'work') {
            const newSessions = sessionsCompleted + 1;
            const today = getTodayDate();
            const todaySessions = get().todayDate === today ? get().todaySessions + 1 : 1;
            
            let nextPhase: TimerPhase;
            let duration: number;
            
            if (newSessions % longBreakInterval === 0) {
              nextPhase = 'longBreak';
              duration = longBreakDuration;
            } else {
              nextPhase = 'shortBreak';
              duration = shortBreakDuration;
            }
            
            set({
              phase: nextPhase,
              timeRemaining: duration * 60,
              isRunning: false,
              sessionsCompleted: newSessions,
              totalWorkTime: totalWorkTime + workDuration,
              todaySessions,
              todayDate: today,
            });
          } else {
            set({
              phase: 'work',
              timeRemaining: workDuration * 60,
              isRunning: false,
            });
          }
        } else {
          set({ timeRemaining: newTime });
        }
      },
      
      completeSession: () => {
        const { phase, workDuration, shortBreakDuration, longBreakDuration, sessionsCompleted, longBreakInterval, totalWorkTime } = get();
        
        if (phase === 'work') {
          const newSessions = sessionsCompleted + 1;
          const today = getTodayDate();
          const todaySessions = get().todayDate === today ? get().todaySessions + 1 : 1;
          
          let nextPhase: TimerPhase;
          let duration: number;
          
          if (newSessions % longBreakInterval === 0) {
            nextPhase = 'longBreak';
            duration = longBreakDuration;
          } else {
            nextPhase = 'shortBreak';
            duration = shortBreakDuration;
          }
          
          set({
            phase: nextPhase,
            timeRemaining: duration * 60,
            isRunning: false,
            sessionsCompleted: newSessions,
            totalWorkTime: totalWorkTime + workDuration,
            todaySessions,
            todayDate: today,
          });
        } else {
          set({
            phase: 'work',
            timeRemaining: workDuration * 60,
            isRunning: false,
          });
        }
      },
    }),
    {
      name: 'pomodoro-storage',
    }
  )
);