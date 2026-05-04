import { useState, useEffect } from 'react';
import { usePomodoroStore } from '../../store/pomodoroStore';
import './PomodoroTimer.css';

export function PomodoroTimer() {
  const {
    workDuration,
    shortBreakDuration,
    longBreakDuration,
    longBreakInterval,
    phase,
    timeRemaining,
    isRunning,
    sessionsCompleted,
    totalWorkTime,
    todaySessions,
    setWorkDuration,
    setShortBreakDuration,
    setLongBreakDuration,
    setLongBreakInterval,
    startTimer,
    pauseTimer,
    resetTimer,
    skipPhase,
    tick,
  } = usePomodoroStore();

  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isRunning, tick]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTotalTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const phaseLabels = {
    work: 'Work',
    shortBreak: 'Short Break',
    longBreak: 'Long Break',
  };

  const progress = phase === 'work'
    ? ((workDuration * 60 - timeRemaining) / (workDuration * 60)) * 100
    : phase === 'shortBreak'
      ? ((shortBreakDuration * 60 - timeRemaining) / (shortBreakDuration * 60)) * 100
      : ((longBreakDuration * 60 - timeRemaining) / (longBreakDuration * 60)) * 100;

  return (
    <div className={`pomodoro-container ${phase}`}>
      <div className="pomodoro-header">
        <span className="phase-label">{phaseLabels[phase]}</span>
        <div className="pomodoro-controls">
          <button className="settings-btn" onClick={() => setShowSettings(!showSettings)}>
            ⚙
          </button>
          <button className="stats-btn" onClick={() => setShowStats(!showStats)}>
            📊
          </button>
        </div>
      </div>

      <div className="pomodoro-timer">
        <div className="timer-circle">
          <div
            className="timer-progress"
            style={{ background: `conic-gradient(var(--color-${phase}) ${progress}%, transparent ${progress}%)` }}
          />
          <div className="timer-inner">
            <span className="time-display">{formatTime(timeRemaining)}</span>
          </div>
        </div>
      </div>

      <div className="pomodoro-actions">
        {!isRunning ? (
          <button className="start-btn" onClick={startTimer}>
            Start
          </button>
        ) : (
          <button className="pause-btn" onClick={pauseTimer}>
            Pause
          </button>
        )}
        <button className="reset-btn" onClick={resetTimer}>
          Reset
        </button>
        <button className="skip-btn" onClick={skipPhase}>
          Skip
        </button>
      </div>

      <div className="pomodoro-session-info">
        <span>Session #{sessionsCompleted + 1}</span>
        <span>Today: {todaySessions} sessions</span>
      </div>

      {showSettings && (
        <div className="pomodoro-settings">
          <div className="setting-row">
            <label>Work (min)</label>
            <input
              type="number"
              value={workDuration}
              onChange={(e) => setWorkDuration(parseInt(e.target.value) || 25)}
              min={1}
              max={60}
            />
          </div>
          <div className="setting-row">
            <label>Short Break (min)</label>
            <input
              type="number"
              value={shortBreakDuration}
              onChange={(e) => setShortBreakDuration(parseInt(e.target.value) || 5)}
              min={1}
              max={30}
            />
          </div>
          <div className="setting-row">
            <label>Long Break (min)</label>
            <input
              type="number"
              value={longBreakDuration}
              onChange={(e) => setLongBreakDuration(parseInt(e.target.value) || 15)}
              min={1}
              max={60}
            />
          </div>
          <div className="setting-row">
            <label>Long Break after</label>
            <input
              type="number"
              value={longBreakInterval}
              onChange={(e) => setLongBreakInterval(parseInt(e.target.value) || 4)}
              min={1}
              max={10}
            />
            <span>sessions</span>
          </div>
        </div>
      )}

      {showStats && (
        <div className="pomodoro-stats">
          <div className="stat-item">
            <span className="stat-label">Total Sessions</span>
            <span className="stat-value">{sessionsCompleted}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total Work Time</span>
            <span className="stat-value">{formatTotalTime(totalWorkTime)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Today's Sessions</span>
            <span className="stat-value">{todaySessions}</span>
          </div>
        </div>
      )}
    </div>
  );
}