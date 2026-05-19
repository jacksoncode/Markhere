import { describe, it, expect, beforeEach } from 'vitest';
import { usePomodoroStore } from '../store/pomodoroStore';

const today = new Date().toISOString().split('T')[0];

describe('usePomodoroStore', () => {
  beforeEach(() => {
    usePomodoroStore.setState({
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
      todayDate: today,
    });
    localStorage.clear();
  });

  describe('initial state', () => {
    it('has correct default values', () => {
      const state = usePomodoroStore.getState();

      expect(state.workDuration).toBe(25);
      expect(state.shortBreakDuration).toBe(5);
      expect(state.longBreakDuration).toBe(15);
      expect(state.longBreakInterval).toBe(4);
      expect(state.phase).toBe('work');
      expect(state.timeRemaining).toBe(25 * 60);
      expect(state.isRunning).toBe(false);
      expect(state.sessionsCompleted).toBe(0);
      expect(state.totalWorkTime).toBe(0);
      expect(state.todaySessions).toBe(0);
      expect(state.todayDate).toBe(today);
    });
  });

  describe('setWorkDuration', () => {
    it('updates workDuration', () => {
      const { setWorkDuration } = usePomodoroStore.getState();

      setWorkDuration(45);

      expect(usePomodoroStore.getState().workDuration).toBe(45);
    });

    it('updates timeRemaining when phase is work and not running', () => {
      usePomodoroStore.setState({ timeRemaining: 25 * 60, phase: 'work', isRunning: false });

      const { setWorkDuration } = usePomodoroStore.getState();
      setWorkDuration(30);

      expect(usePomodoroStore.getState().timeRemaining).toBe(30 * 60);
    });

    it('does not update timeRemaining when timer is running', () => {
      usePomodoroStore.setState({ isRunning: true, timeRemaining: 20 * 60 });

      const { setWorkDuration } = usePomodoroStore.getState();
      setWorkDuration(50);

      expect(usePomodoroStore.getState().timeRemaining).toBe(20 * 60);
    });

    it('does not update timeRemaining when phase is not work', () => {
      usePomodoroStore.setState({ phase: 'shortBreak', timeRemaining: 3 * 60 });

      const { setWorkDuration } = usePomodoroStore.getState();
      setWorkDuration(50);

      expect(usePomodoroStore.getState().timeRemaining).toBe(3 * 60);
    });

    it('handles small values', () => {
      const { setWorkDuration } = usePomodoroStore.getState();

      setWorkDuration(1);

      expect(usePomodoroStore.getState().workDuration).toBe(1);
      expect(usePomodoroStore.getState().timeRemaining).toBe(1 * 60);
    });
  });

  describe('setShortBreakDuration', () => {
    it('updates shortBreakDuration', () => {
      const { setShortBreakDuration } = usePomodoroStore.getState();

      setShortBreakDuration(10);

      expect(usePomodoroStore.getState().shortBreakDuration).toBe(10);
    });

    it('updates timeRemaining when phase is shortBreak and not running', () => {
      usePomodoroStore.setState({ phase: 'shortBreak', isRunning: false, timeRemaining: 5 * 60 });

      const { setShortBreakDuration } = usePomodoroStore.getState();
      setShortBreakDuration(7);

      expect(usePomodoroStore.getState().timeRemaining).toBe(7 * 60);
    });

    it('does not update timeRemaining when phase is not shortBreak', () => {
      usePomodoroStore.setState({ phase: 'work', timeRemaining: 25 * 60 });

      const { setShortBreakDuration } = usePomodoroStore.getState();
      setShortBreakDuration(10);

      expect(usePomodoroStore.getState().timeRemaining).toBe(25 * 60);
    });
  });

  describe('setLongBreakDuration', () => {
    it('updates longBreakDuration', () => {
      const { setLongBreakDuration } = usePomodoroStore.getState();

      setLongBreakDuration(30);

      expect(usePomodoroStore.getState().longBreakDuration).toBe(30);
    });

    it('updates timeRemaining when phase is longBreak and not running', () => {
      usePomodoroStore.setState({ phase: 'longBreak', isRunning: false, timeRemaining: 15 * 60 });

      const { setLongBreakDuration } = usePomodoroStore.getState();
      setLongBreakDuration(20);

      expect(usePomodoroStore.getState().timeRemaining).toBe(20 * 60);
    });

    it('does not update timeRemaining when phase is not longBreak', () => {
      usePomodoroStore.setState({ phase: 'shortBreak', timeRemaining: 5 * 60 });

      const { setLongBreakDuration } = usePomodoroStore.getState();
      setLongBreakDuration(20);

      expect(usePomodoroStore.getState().timeRemaining).toBe(5 * 60);
    });
  });

  describe('setLongBreakInterval', () => {
    it('updates the interval', () => {
      const { setLongBreakInterval } = usePomodoroStore.getState();

      setLongBreakInterval(6);

      expect(usePomodoroStore.getState().longBreakInterval).toBe(6);
    });

    it('accepts any positive number', () => {
      const { setLongBreakInterval } = usePomodoroStore.getState();

      setLongBreakInterval(1);

      expect(usePomodoroStore.getState().longBreakInterval).toBe(1);
    });
  });

  describe('startTimer / pauseTimer', () => {
    it('startTimer sets isRunning to true', () => {
      const { startTimer } = usePomodoroStore.getState();

      startTimer();

      expect(usePomodoroStore.getState().isRunning).toBe(true);
    });

    it('pauseTimer sets isRunning to false', () => {
      usePomodoroStore.setState({ isRunning: true });

      const { pauseTimer } = usePomodoroStore.getState();
      pauseTimer();

      expect(usePomodoroStore.getState().isRunning).toBe(false);
    });

    it('startTimer does not change other state', () => {
      const before = usePomodoroStore.getState();
      const { startTimer } = before;

      startTimer();

      const after = usePomodoroStore.getState();
      expect(after.phase).toBe(before.phase);
      expect(after.timeRemaining).toBe(before.timeRemaining);
      expect(after.sessionsCompleted).toBe(before.sessionsCompleted);
    });
  });

  describe('resetTimer', () => {
    it('resets timeRemaining to workDuration when in work phase', () => {
      usePomodoroStore.setState({ timeRemaining: 60, isRunning: true, phase: 'work' });

      const { resetTimer } = usePomodoroStore.getState();
      resetTimer();

      const state = usePomodoroStore.getState();
      expect(state.timeRemaining).toBe(25 * 60);
      expect(state.isRunning).toBe(false);
    });

    it('resets timeRemaining to shortBreakDuration when in shortBreak phase', () => {
      usePomodoroStore.setState({ phase: 'shortBreak', timeRemaining: 10, isRunning: true });

      const { resetTimer } = usePomodoroStore.getState();
      resetTimer();

      expect(usePomodoroStore.getState().timeRemaining).toBe(5 * 60);
      expect(usePomodoroStore.getState().isRunning).toBe(false);
    });

    it('resets timeRemaining to longBreakDuration when in longBreak phase', () => {
      usePomodoroStore.setState({ phase: 'longBreak', timeRemaining: 10, isRunning: true });

      const { resetTimer } = usePomodoroStore.getState();
      resetTimer();

      expect(usePomodoroStore.getState().timeRemaining).toBe(15 * 60);
      expect(usePomodoroStore.getState().isRunning).toBe(false);
    });

    it('respects custom durations', () => {
      usePomodoroStore.setState({ workDuration: 50, timeRemaining: 120 });

      const { resetTimer } = usePomodoroStore.getState();
      resetTimer();

      expect(usePomodoroStore.getState().timeRemaining).toBe(50 * 60);
    });
  });

  describe('skipPhase', () => {
    it('transitions from work to shortBreak by default', () => {
      const { skipPhase } = usePomodoroStore.getState();

      skipPhase();

      const state = usePomodoroStore.getState();
      expect(state.phase).toBe('shortBreak');
      expect(state.timeRemaining).toBe(5 * 60);
      expect(state.isRunning).toBe(false);
    });

    it('transitions from work to longBreak when sessionsCompleted+1 hits interval', () => {
      usePomodoroStore.setState({ sessionsCompleted: 3, longBreakInterval: 4 });

      const { skipPhase } = usePomodoroStore.getState();
      skipPhase();

      const state = usePomodoroStore.getState();
      expect(state.phase).toBe('longBreak');
      expect(state.timeRemaining).toBe(15 * 60);
    });

    it('transitions from shortBreak to work', () => {
      usePomodoroStore.setState({ phase: 'shortBreak' });

      const { skipPhase } = usePomodoroStore.getState();
      skipPhase();

      const state = usePomodoroStore.getState();
      expect(state.phase).toBe('work');
      expect(state.timeRemaining).toBe(25 * 60);
    });

    it('transitions from longBreak to work', () => {
      usePomodoroStore.setState({ phase: 'longBreak' });

      const { skipPhase } = usePomodoroStore.getState();
      skipPhase();

      expect(usePomodoroStore.getState().phase).toBe('work');
      expect(usePomodoroStore.getState().timeRemaining).toBe(25 * 60);
    });
  });

  describe('tick', () => {
    it('decrements timeRemaining by 1', () => {
      usePomodoroStore.setState({ isRunning: true, timeRemaining: 100 });

      const { tick } = usePomodoroStore.getState();
      tick();

      expect(usePomodoroStore.getState().timeRemaining).toBe(99);
    });

    it('does nothing when not running', () => {
      usePomodoroStore.setState({ isRunning: false, timeRemaining: 100 });

      const { tick } = usePomodoroStore.getState();
      tick();

      expect(usePomodoroStore.getState().timeRemaining).toBe(100);
    });

    it('does nothing when timeRemaining is already 0', () => {
      usePomodoroStore.setState({ isRunning: true, timeRemaining: 0 });

      const { tick } = usePomodoroStore.getState();
      tick();

      expect(usePomodoroStore.getState().timeRemaining).toBe(0);
    });

    it('auto-transitions from work to shortBreak when timer reaches 0', () => {
      usePomodoroStore.setState({
        isRunning: true,
        timeRemaining: 1,
        phase: 'work',
        sessionsCompleted: 0,
        todaySessions: 0,
        todayDate: today,
      });

      const { tick } = usePomodoroStore.getState();
      tick();

      const state = usePomodoroStore.getState();
      expect(state.phase).toBe('shortBreak');
      expect(state.timeRemaining).toBe(5 * 60);
      expect(state.isRunning).toBe(false);
      expect(state.sessionsCompleted).toBe(1);
      expect(state.todaySessions).toBe(1);
      expect(state.totalWorkTime).toBe(25);
    });

    it('auto-transitions from work to longBreak when interval is met', () => {
      usePomodoroStore.setState({
        isRunning: true,
        timeRemaining: 1,
        phase: 'work',
        sessionsCompleted: 3,
        longBreakInterval: 4,
        todayDate: today,
      });

      const { tick } = usePomodoroStore.getState();
      tick();

      const state = usePomodoroStore.getState();
      expect(state.phase).toBe('longBreak');
      expect(state.timeRemaining).toBe(15 * 60);
      expect(state.sessionsCompleted).toBe(4);
      expect(state.totalWorkTime).toBe(25);
    });

    it('auto-transitions from shortBreak to work when timer reaches 0', () => {
      usePomodoroStore.setState({
        isRunning: true,
        timeRemaining: 1,
        phase: 'shortBreak',
        sessionsCompleted: 1,
        totalWorkTime: 25,
      });

      const { tick } = usePomodoroStore.getState();
      tick();

      const state = usePomodoroStore.getState();
      expect(state.phase).toBe('work');
      expect(state.timeRemaining).toBe(25 * 60);
      expect(state.isRunning).toBe(false);
      // sessionsCompleted, todaySessions, totalWorkTime should not change on break completion
      expect(state.sessionsCompleted).toBe(1);
      expect(state.totalWorkTime).toBe(25);
    });

    it('auto-transitions from longBreak to work when timer reaches 0', () => {
      usePomodoroStore.setState({
        isRunning: true,
        timeRemaining: 1,
        phase: 'longBreak',
      });

      const { tick } = usePomodoroStore.getState();
      tick();

      const state = usePomodoroStore.getState();
      expect(state.phase).toBe('work');
      expect(state.timeRemaining).toBe(25 * 60);
      expect(state.isRunning).toBe(false);
    });

    it('handles consecutive ticks until completion', () => {
      usePomodoroStore.setState({
        isRunning: true,
        timeRemaining: 3,
        phase: 'work',
        sessionsCompleted: 0,
        todaySessions: 0,
        todayDate: today,
      });

      const { tick } = usePomodoroStore.getState();

      // First tick: 3 -> 2
      tick();
      expect(usePomodoroStore.getState().timeRemaining).toBe(2);

      // Second tick: 2 -> 1
      tick();
      expect(usePomodoroStore.getState().timeRemaining).toBe(1);

      // Third tick: 1 -> 0, triggers transition
      tick();
      const state = usePomodoroStore.getState();
      expect(state.phase).toBe('shortBreak');
      expect(state.timeRemaining).toBe(5 * 60);
      expect(state.sessionsCompleted).toBe(1);
    });
  });

  describe('completeSession', () => {
    it('completes work session and transitions to shortBreak', () => {
      const { completeSession } = usePomodoroStore.getState();

      completeSession();

      const state = usePomodoroStore.getState();
      expect(state.phase).toBe('shortBreak');
      expect(state.timeRemaining).toBe(5 * 60);
      expect(state.isRunning).toBe(false);
      expect(state.sessionsCompleted).toBe(1);
      expect(state.todaySessions).toBe(1);
      expect(state.totalWorkTime).toBe(25);
    });

    it('transitions to longBreak when interval is met', () => {
      usePomodoroStore.setState({ sessionsCompleted: 3, longBreakInterval: 4, todayDate: today });

      const { completeSession } = usePomodoroStore.getState();
      completeSession();

      const state = usePomodoroStore.getState();
      expect(state.phase).toBe('longBreak');
      expect(state.timeRemaining).toBe(15 * 60);
      expect(state.sessionsCompleted).toBe(4);
      expect(state.todaySessions).toBe(1);
    });

    it('completes shortBreak and transitions to work', () => {
      usePomodoroStore.setState({ phase: 'shortBreak', timeRemaining: 120, sessionsCompleted: 1 });

      const { completeSession } = usePomodoroStore.getState();
      completeSession();

      const state = usePomodoroStore.getState();
      expect(state.phase).toBe('work');
      expect(state.timeRemaining).toBe(25 * 60);
      expect(state.isRunning).toBe(false);
      // sessionsCompleted does not increment on break completion
      expect(state.sessionsCompleted).toBe(1);
    });

    it('completes longBreak and transitions to work', () => {
      usePomodoroStore.setState({ phase: 'longBreak', timeRemaining: 300 });

      const { completeSession } = usePomodoroStore.getState();
      completeSession();

      const state = usePomodoroStore.getState();
      expect(state.phase).toBe('work');
      expect(state.timeRemaining).toBe(25 * 60);
      expect(state.isRunning).toBe(false);
    });

    it('accumulates totalWorkTime across multiple sessions', () => {
      usePomodoroStore.setState({
        totalWorkTime: 50,
        sessionsCompleted: 2,
        todayDate: today,
      });

      const { completeSession } = usePomodoroStore.getState();
      completeSession();

      expect(usePomodoroStore.getState().totalWorkTime).toBe(75); // 50 + 25
    });
  });

  describe('todayDate tracking', () => {
    it('increments todaySessions when todayDate matches', () => {
      usePomodoroStore.setState({
        phase: 'work',
        isRunning: true,
        timeRemaining: 1,
        todaySessions: 3,
        todayDate: today,
        sessionsCompleted: 0,
      });

      const { tick } = usePomodoroStore.getState();
      tick();

      expect(usePomodoroStore.getState().todaySessions).toBe(4);
    });

    it('resets todaySessions when todayDate differs', () => {
      usePomodoroStore.setState({
        phase: 'work',
        isRunning: true,
        timeRemaining: 1,
        todaySessions: 5,
        todayDate: '2000-01-01', // old date
        sessionsCompleted: 0,
      });

      const { tick } = usePomodoroStore.getState();
      tick();

      expect(usePomodoroStore.getState().todaySessions).toBe(1);
      expect(usePomodoroStore.getState().todayDate).toBe(today);
    });
  });

  describe('timer completion interaction', () => {
    it('stops isRunning after work tick completion', () => {
      usePomodoroStore.setState({
        isRunning: true,
        timeRemaining: 1,
        phase: 'work',
        todayDate: today,
      });

      const { tick } = usePomodoroStore.getState();
      tick();

      expect(usePomodoroStore.getState().isRunning).toBe(false);
    });

    it('stops isRunning after break tick completion', () => {
      usePomodoroStore.setState({
        isRunning: true,
        timeRemaining: 1,
        phase: 'shortBreak',
      });

      const { tick } = usePomodoroStore.getState();
      tick();

      expect(usePomodoroStore.getState().isRunning).toBe(false);
    });
  });
});
