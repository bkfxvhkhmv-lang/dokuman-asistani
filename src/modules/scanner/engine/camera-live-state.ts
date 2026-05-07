import type { EdgeDetectionState } from '@/modules/scanner/types';

const GRACE_PERIOD_MS = 500;
const MAX_STALE_MS = 1800;

interface StoredLiveState {
  state: EdgeDetectionState | null;
  timestamp: number;
}

let lastValidState: StoredLiveState = {
  state: null,
  timestamp: 0,
};

export function updateLiveState(
  nextState: EdgeDetectionState,
  now: number,
): EdgeDetectionState {
  if (nextState.detected && nextState.corners) {
    lastValidState = {
      state: nextState,
      timestamp: now,
    };
    return nextState;
  }

  const previous = lastValidState.state;
  if (!previous) return nextState;

  const elapsed = now - lastValidState.timestamp;
  if (elapsed < GRACE_PERIOD_MS) {
    return previous;
  }

  if (elapsed < MAX_STALE_MS) {
    return {
      ...previous,
      confidence: Math.min(previous.confidence, 0.55),
      stabilityScore: Math.min(previous.stabilityScore, 0.35),
      detected: true,
    };
  }

  lastValidState = {
    state: null,
    timestamp: 0,
  };
  return nextState;
}

export function resetLiveState(): void {
  lastValidState = {
    state: null,
    timestamp: 0,
  };
}
