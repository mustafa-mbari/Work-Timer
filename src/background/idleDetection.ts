/**
 * Idle detection: tracks when the user goes idle/locked and offers to keep or discard idle time.
 */
import type { TimerState, TimerResponse } from '../types'
import { getTimerState, setTimerState, getIdleInfo, setIdleInfo, DEFAULT_IDLE_INFO } from './storage'
import { getElapsed } from '../utils/timer'
import { IDLE_THRESHOLD_MS } from '../constants/timers'

// Register idle state listener at module level (required for MV3 service worker)
chrome.idle.onStateChanged.addListener(async (newState) => {
  const timerState = await getTimerState()
  if (timerState.status !== 'running') return

  if (newState === 'idle' || newState === 'locked') {
    // BUG 4 FIX: Only set idleStartedAt if not already tracking idle.
    // Prevents 'locked' from overwriting an earlier 'idle' timestamp.
    const existingIdle = await getIdleInfo()
    if (existingIdle.idleStartedAt === null) {
      await setIdleInfo({
        idleStartedAt: Date.now(),
        idleDuration: 0,
        pending: false,
      })
    }
  } else if (newState === 'active') {
    // User came back — check if we were tracking idle
    const idleInfo = await getIdleInfo()
    if (idleInfo.idleStartedAt) {
      const idleDuration = Date.now() - idleInfo.idleStartedAt
      // Only show notification if idle was significant (> 1 minute)
      if (idleDuration > IDLE_THRESHOLD_MS) {
        await setIdleInfo({
          idleStartedAt: idleInfo.idleStartedAt,
          idleDuration,
          pending: true,
        })

        const minutes = Math.round(idleDuration / IDLE_THRESHOLD_MS)
        chrome.notifications.create('idle-return', {
          type: 'basic',
          iconUrl: 'icons/icon-128.png',
          title: 'Work Timer — You were idle',
          message: `You were idle for ${minutes} minute${minutes !== 1 ? 's' : ''}. Open the popup to keep or discard idle time.`,
          priority: 2,
        })
      } else {
        await setIdleInfo(DEFAULT_IDLE_INFO)
      }
    }
  }
})

export async function idleKeep(): Promise<TimerResponse> {
  // Keep idle time — just dismiss the notification
  await setIdleInfo(DEFAULT_IDLE_INFO)
  const state = await getTimerState()
  return { success: true, state, idleInfo: DEFAULT_IDLE_INFO }
}

export async function idleDiscard(): Promise<TimerResponse> {
  // Discard idle time — subtract it from elapsed
  const idleInfo = await getIdleInfo()
  const state = await getTimerState()

  if (idleInfo.idleDuration > 0 && state.status === 'running') {
    const updated: TimerState = {
      ...state,
      elapsed: Math.max(0, getElapsed(state) - idleInfo.idleDuration),
      startTime: Date.now(),
    }
    await setTimerState(updated)
    await setIdleInfo(DEFAULT_IDLE_INFO)
    return { success: true, state: { ...updated, elapsed: updated.elapsed }, idleInfo: DEFAULT_IDLE_INFO }
  }

  await setIdleInfo(DEFAULT_IDLE_INFO)
  return { success: true, state, idleInfo: DEFAULT_IDLE_INFO }
}
