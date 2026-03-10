import type { TimerState } from '../types'

/** Default idle timer state — single source of truth. */
export const DEFAULT_TIMER_STATE: TimerState = {
  status: 'idle',
  projectId: null,
  description: '',
  startTime: null,
  elapsed: 0,
  pausedAt: null,
  continuingEntryId: null,
  tags: [],
  link: '',
  dateStarted: '',
}

/**
 * Calculate current elapsed time for a timer state.
 * Shared across background, content script, and UI code.
 */
export function getElapsed(state: TimerState): number {
  if (state.status === 'running' && state.startTime) {
    return state.elapsed + (Date.now() - state.startTime)
  }
  return state.elapsed
}
