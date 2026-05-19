import { describe, it, expect, beforeEach } from 'vitest';
import { useWordGoalStore } from '../store/wordGoalStore';

describe('useWordGoalStore', () => {
  beforeEach(() => {
    useWordGoalStore.setState({
      targetWords: 1000,
      enabled: false,
      showProgress: true,
    });
  });

  describe('initial state', () => {
    it('has correct default values', () => {
      const state = useWordGoalStore.getState();

      expect(state.targetWords).toBe(1000);
      expect(state.enabled).toBe(false);
      expect(state.showProgress).toBe(true);
    });
  });

  describe('setTargetWords', () => {
    it('updates the target word count', () => {
      const { setTargetWords } = useWordGoalStore.getState();

      setTargetWords(2000);

      expect(useWordGoalStore.getState().targetWords).toBe(2000);
    });

    it('clamps negative values to 0', () => {
      const { setTargetWords } = useWordGoalStore.getState();

      setTargetWords(-500);

      expect(useWordGoalStore.getState().targetWords).toBe(0);
    });

    it('allows zero', () => {
      const { setTargetWords } = useWordGoalStore.getState();

      setTargetWords(0);

      expect(useWordGoalStore.getState().targetWords).toBe(0);
    });
  });

  describe('setEnabled', () => {
    it('toggles the enabled flag', () => {
      const { setEnabled } = useWordGoalStore.getState();

      setEnabled(true);
      expect(useWordGoalStore.getState().enabled).toBe(true);

      setEnabled(false);
      expect(useWordGoalStore.getState().enabled).toBe(false);
    });
  });

  describe('setShowProgress', () => {
    it('toggles the showProgress flag', () => {
      const { setShowProgress } = useWordGoalStore.getState();

      setShowProgress(false);
      expect(useWordGoalStore.getState().showProgress).toBe(false);

      setShowProgress(true);
      expect(useWordGoalStore.getState().showProgress).toBe(true);
    });
  });

  describe('calculateProgress', () => {
    it('returns 0 when targetWords is 0', () => {
      const { setTargetWords } = useWordGoalStore.getState();
      setTargetWords(0);

      const { calculateProgress } = useWordGoalStore.getState();
      expect(calculateProgress(500)).toBe(0);
    });

    it('returns 50 for half the target', () => {
      const { calculateProgress } = useWordGoalStore.getState();

      expect(calculateProgress(500)).toBe(50);
    });

    it('returns 100 when target is reached', () => {
      const { calculateProgress } = useWordGoalStore.getState();

      expect(calculateProgress(1000)).toBe(100);
    });

    it('caps at 100 when exceeded', () => {
      const { calculateProgress } = useWordGoalStore.getState();

      expect(calculateProgress(2000)).toBe(100);
    });

    it('returns 0 when current words is 0', () => {
      const { calculateProgress } = useWordGoalStore.getState();

      expect(calculateProgress(0)).toBe(0);
    });
  });
});
