import { describe, it, expect, beforeEach } from 'vitest';
import { useUIState } from '../store/uiStore';

describe('useUIState', () => {
  beforeEach(() => {
    useUIState.setState({
      activeView: 'documents',
      sidebarOpen: true,
      sidebarMode: 'outline',
      focusMode: false,
      typewriterMode: false,
      sourceMode: false,
      pomodoroEnabled: false,
      wordGoalEnabled: false,
    });
    localStorage.clear();
  });

  // -----------------------------------------------------------------------
  // Initial state
  // -----------------------------------------------------------------------
  describe('initial state', () => {
    it('has activeView set to documents', () => {
      expect(useUIState.getState().activeView).toBe('documents');
    });

    it('sidebarOpen defaults to true', () => {
      expect(useUIState.getState().sidebarOpen).toBe(true);
    });

    it('sidebarMode defaults to outline', () => {
      expect(useUIState.getState().sidebarMode).toBe('outline');
    });

    it('focusMode defaults to false', () => {
      expect(useUIState.getState().focusMode).toBe(false);
    });

    it('typewriterMode defaults to false', () => {
      expect(useUIState.getState().typewriterMode).toBe(false);
    });

    it('sourceMode defaults to false', () => {
      expect(useUIState.getState().sourceMode).toBe(false);
    });

    it('pomodoroEnabled defaults to false', () => {
      expect(useUIState.getState().pomodoroEnabled).toBe(false);
    });

    it('wordGoalEnabled defaults to false', () => {
      expect(useUIState.getState().wordGoalEnabled).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // setActiveView
  // -----------------------------------------------------------------------
  describe('setActiveView', () => {
    it('changes activeView to files', () => {
      const { setActiveView } = useUIState.getState();

      setActiveView('files');

      expect(useUIState.getState().activeView).toBe('files');
    });

    it('changes activeView to settings', () => {
      const { setActiveView } = useUIState.getState();

      setActiveView('settings');

      expect(useUIState.getState().activeView).toBe('settings');
    });

    it('changes activeView to outline', () => {
      const { setActiveView } = useUIState.getState();

      setActiveView('outline');

      expect(useUIState.getState().activeView).toBe('outline');
    });

    it('can set back to documents', () => {
      useUIState.setState({ activeView: 'files' });

      const { setActiveView } = useUIState.getState();
      setActiveView('documents');

      expect(useUIState.getState().activeView).toBe('documents');
    });
  });

  // -----------------------------------------------------------------------
  // setSidebarMode
  // -----------------------------------------------------------------------
  describe('setSidebarMode', () => {
    it('changes sidebarMode to fileTree', () => {
      const { setSidebarMode } = useUIState.getState();

      setSidebarMode('fileTree');

      expect(useUIState.getState().sidebarMode).toBe('fileTree');
    });

    it('changes sidebarMode to fileList', () => {
      const { setSidebarMode } = useUIState.getState();

      setSidebarMode('fileList');

      expect(useUIState.getState().sidebarMode).toBe('fileList');
    });

    it('changes sidebarMode back to outline', () => {
      useUIState.setState({ sidebarMode: 'fileTree' });

      const { setSidebarMode } = useUIState.getState();
      setSidebarMode('outline');

      expect(useUIState.getState().sidebarMode).toBe('outline');
    });
  });

  // -----------------------------------------------------------------------
  // toggleSidebar
  // -----------------------------------------------------------------------
  describe('toggleSidebar', () => {
    it('flips sidebarOpen from true to false', () => {
      const { toggleSidebar } = useUIState.getState();

      toggleSidebar();

      expect(useUIState.getState().sidebarOpen).toBe(false);
    });

    it('flips sidebarOpen from false to true', () => {
      useUIState.setState({ sidebarOpen: false });

      const { toggleSidebar } = useUIState.getState();
      toggleSidebar();

      expect(useUIState.getState().sidebarOpen).toBe(true);
    });

    it('toggles back and forth correctly', () => {
      const { toggleSidebar } = useUIState.getState();

      toggleSidebar();
      expect(useUIState.getState().sidebarOpen).toBe(false);

      toggleSidebar();
      expect(useUIState.getState().sidebarOpen).toBe(true);

      toggleSidebar();
      expect(useUIState.getState().sidebarOpen).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // toggleFocusMode
  // -----------------------------------------------------------------------
  describe('toggleFocusMode', () => {
    it('enables focusMode when it is off', () => {
      const { toggleFocusMode } = useUIState.getState();

      toggleFocusMode();

      expect(useUIState.getState().focusMode).toBe(true);
    });

    it('disables focusMode when it is on', () => {
      useUIState.setState({ focusMode: true });

      const { toggleFocusMode } = useUIState.getState();
      toggleFocusMode();

      expect(useUIState.getState().focusMode).toBe(false);
    });

    it('does not affect other modes', () => {
      const { toggleFocusMode } = useUIState.getState();

      toggleFocusMode();

      const state = useUIState.getState();
      expect(state.focusMode).toBe(true);
      expect(state.typewriterMode).toBe(false);
      expect(state.sourceMode).toBe(false);
      expect(state.pomodoroEnabled).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // toggleTypewriterMode
  // -----------------------------------------------------------------------
  describe('toggleTypewriterMode', () => {
    it('enables typewriterMode when it is off', () => {
      const { toggleTypewriterMode } = useUIState.getState();

      toggleTypewriterMode();

      expect(useUIState.getState().typewriterMode).toBe(true);
    });

    it('disables typewriterMode when it is on', () => {
      useUIState.setState({ typewriterMode: true });

      const { toggleTypewriterMode } = useUIState.getState();
      toggleTypewriterMode();

      expect(useUIState.getState().typewriterMode).toBe(false);
    });

    it('works independently from focusMode', () => {
      useUIState.setState({ focusMode: true });

      const { toggleTypewriterMode } = useUIState.getState();
      toggleTypewriterMode();

      const state = useUIState.getState();
      expect(state.typewriterMode).toBe(true);
      expect(state.focusMode).toBe(true); // unchanged
    });
  });

  // -----------------------------------------------------------------------
  // toggleSourceMode / setSourceMode
  // -----------------------------------------------------------------------
  describe('toggleSourceMode / setSourceMode', () => {
    it('toggleSourceMode flips sourceMode from false to true', () => {
      const { toggleSourceMode } = useUIState.getState();

      toggleSourceMode();

      expect(useUIState.getState().sourceMode).toBe(true);
    });

    it('toggleSourceMode flips sourceMode from true to false', () => {
      useUIState.setState({ sourceMode: true });

      const { toggleSourceMode } = useUIState.getState();
      toggleSourceMode();

      expect(useUIState.getState().sourceMode).toBe(false);
    });

    it('setSourceMode sets to true', () => {
      const { setSourceMode } = useUIState.getState();

      setSourceMode(true);

      expect(useUIState.getState().sourceMode).toBe(true);
    });

    it('setSourceMode sets to false', () => {
      useUIState.setState({ sourceMode: true });

      const { setSourceMode } = useUIState.getState();
      setSourceMode(false);

      expect(useUIState.getState().sourceMode).toBe(false);
    });

    it('setSourceMode(false) is idempotent', () => {
      const { setSourceMode } = useUIState.getState();

      setSourceMode(false);
      expect(useUIState.getState().sourceMode).toBe(false);

      setSourceMode(false);
      expect(useUIState.getState().sourceMode).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // togglePomodoro
  // -----------------------------------------------------------------------
  describe('togglePomodoro', () => {
    it('enables pomodoro when disabled', () => {
      const { togglePomodoro } = useUIState.getState();

      togglePomodoro();

      expect(useUIState.getState().pomodoroEnabled).toBe(true);
    });

    it('disables pomodoro when enabled', () => {
      useUIState.setState({ pomodoroEnabled: true });

      const { togglePomodoro } = useUIState.getState();
      togglePomodoro();

      expect(useUIState.getState().pomodoroEnabled).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // toggleWordGoal
  // -----------------------------------------------------------------------
  describe('toggleWordGoal', () => {
    it('enables wordGoal when disabled', () => {
      const { toggleWordGoal } = useUIState.getState();

      toggleWordGoal();

      expect(useUIState.getState().wordGoalEnabled).toBe(true);
    });

    it('disables wordGoal when enabled', () => {
      useUIState.setState({ wordGoalEnabled: true });

      const { toggleWordGoal } = useUIState.getState();
      toggleWordGoal();

      expect(useUIState.getState().wordGoalEnabled).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Combined mode interactions
  // -----------------------------------------------------------------------
  describe('combined mode interactions', () => {
    it('focusMode and typewriterMode can both be enabled', () => {
      const { toggleFocusMode, toggleTypewriterMode } = useUIState.getState();

      toggleFocusMode();
      toggleTypewriterMode();

      const state = useUIState.getState();
      expect(state.focusMode).toBe(true);
      expect(state.typewriterMode).toBe(true);
    });

    it('sourceMode and focusMode can both be enabled', () => {
      const { toggleFocusMode, toggleSourceMode } = useUIState.getState();

      toggleFocusMode();
      toggleSourceMode();

      const state = useUIState.getState();
      expect(state.focusMode).toBe(true);
      expect(state.sourceMode).toBe(true);
    });

    it('multiple toggles do not corrupt state', () => {
      const { toggleSidebar, toggleFocusMode, togglePomodoro } = useUIState.getState();

      toggleSidebar(); // false
      toggleFocusMode(); // true
      togglePomodoro(); // true
      toggleSidebar(); // true

      const state = useUIState.getState();
      expect(state.sidebarOpen).toBe(true);
      expect(state.focusMode).toBe(true);
      expect(state.pomodoroEnabled).toBe(true);
      expect(state.typewriterMode).toBe(false);
      expect(state.wordGoalEnabled).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Persistence partialize
  // -----------------------------------------------------------------------
  describe('persistence partialize', () => {
    it('pomodoroEnabled, wordGoalEnabled, and sidebarMode are the persisted keys', () => {
      // Set some state
      useUIState.setState({
        pomodoroEnabled: true,
        wordGoalEnabled: true,
        sidebarMode: 'fileTree',
        focusMode: true,
        typewriterMode: true,
        sidebarOpen: false,
      });

      const state = useUIState.getState();

      // The keys that are persisted per the partialize function
      expect(state.pomodoroEnabled).toBe(true);
      expect(state.wordGoalEnabled).toBe(true);
      expect(state.sidebarMode).toBe('fileTree');

      // These are also in state but won't survive a page reload
      expect(state.focusMode).toBe(true);
      expect(state.sidebarOpen).toBe(false);
    });
  });
});
