/**
 * Timer and Pomodoro duration constants (in milliseconds)
 * Note: Runtime pomodoro durations are configurable via Settings.
 * These are defaults used for initial state.
 */

export const POMODORO_WORK_MS = 25 * 60 * 1000      // 25 minutes
export const POMODORO_SHORT_MS = 5 * 60 * 1000      //  5 minutes
export const POMODORO_LONG_MS = 15 * 60 * 1000      // 15 minutes

/**
 * Idle detection threshold - time of inactivity before prompting user (in milliseconds)
 */
export const IDLE_THRESHOLD_MS = 60_000             // 1 minute
