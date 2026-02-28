/**
 * Timer engine: start, pause, resume, stop for the stopwatch timer.
 */
import type { TimerState, TimeEntry, TimerResponse } from '../types'
import { getTimerState, setTimerState, setIdleInfo, getSettings, getTimeEntry, saveTimeEntry, updateTimeEntry, DEFAULT_IDLE_INFO, TIMER_ALARM, debouncedSync, getPomodoroState, setPomodoroState, DEFAULT_POMODORO_STATE, POMODORO_ALARM } from './storage'
import { broadcastTimerSync, updateBadge } from './ui'
import { getElapsed, DEFAULT_TIMER_STATE } from '../utils/timer'
import { generateId } from '../utils/id'
import { getToday } from '../utils/date'

export async function startTimer(projectId: string | null, description: string, continuingEntryId: string | null = null): Promise<TimerResponse> {
  // If continuing an existing entry, load its duration as the starting elapsed time
  let initialElapsed = 0
  if (continuingEntryId) {
    const existingEntry = await getTimeEntry(continuingEntryId, getToday())
    if (existingEntry) {
      initialElapsed = existingEntry.duration
    }
  }

  const state: TimerState = {
    status: 'running',
    projectId,
    description,
    startTime: Date.now(),
    elapsed: initialElapsed,
    pausedAt: null,
    continuingEntryId,
  }
  await setTimerState(state)
  await setIdleInfo(DEFAULT_IDLE_INFO)
  await updateBadge(state) // also schedules next TIMER_ALARM at next minute boundary
  // Clear any previous "user dismissed" flag so the widget auto-shows for the new session
  await chrome.storage.local.remove('floatingTimerHidden')
  void broadcastTimerSync(state)

  // Set idle detection threshold
  const settings = await getSettings()
  chrome.idle.setDetectionInterval(settings.idleTimeout * 60)

  return { success: true, state }
}

export async function pauseTimer(): Promise<TimerResponse> {
  const state = await getTimerState()
  if (state.status !== 'running') return { success: false, error: 'Timer is not running' }

  const now = Date.now()
  const updated: TimerState = {
    ...state,
    status: 'paused',
    elapsed: state.elapsed + (now - (state.startTime ?? now)),
    startTime: null,
    pausedAt: now,
  }
  await setTimerState(updated)
  await chrome.alarms.clear(TIMER_ALARM)
  await updateBadge(updated)
  void broadcastTimerSync(updated)
  return { success: true, state: updated }
}

export async function resumeTimer(): Promise<TimerResponse> {
  const state = await getTimerState()
  if (state.status !== 'paused') return { success: false, error: 'Timer is not paused' }

  const updated: TimerState = {
    ...state,
    status: 'running',
    startTime: Date.now(),
    pausedAt: null,
  }
  await setTimerState(updated)
  await setIdleInfo(DEFAULT_IDLE_INFO)
  await updateBadge(updated) // also schedules next TIMER_ALARM
  void broadcastTimerSync(updated)
  return { success: true, state: updated }
}

export async function stopTimer(): Promise<TimerResponse> {
  const state = await getTimerState()
  if (state.status === 'idle') return { success: false, error: 'Timer is not active' }

  const elapsed = getElapsed(state)
  const now = Date.now()

  // Check if a pomodoro session is active (e.g. stopped via floating widget STOP_TIMER)
  const pomState = await getPomodoroState()
  const hadActivePomodoro = pomState.active

  // Read threshold fresh from storage — module-level cache may be stale after SW restart
  const settings = await getSettings()
  const saveThresholdMs = Math.max(5, Math.min(240, settings.entrySaveTime ?? 10)) * 1000

  // Duration gate: discard entry if too short (skip for continuing entries — they already exist)
  if (!state.continuingEntryId && elapsed < saveThresholdMs) {
    await setTimerState(DEFAULT_TIMER_STATE)
    await setIdleInfo(DEFAULT_IDLE_INFO)
    await chrome.alarms.clear(TIMER_ALARM)
    if (hadActivePomodoro) {
      await setPomodoroState(DEFAULT_POMODORO_STATE)
      await chrome.alarms.clear(POMODORO_ALARM)
    }
    await updateBadge(DEFAULT_TIMER_STATE)
    void broadcastTimerSync(DEFAULT_TIMER_STATE, hadActivePomodoro ? DEFAULT_POMODORO_STATE : undefined)
    return { success: true, state: DEFAULT_TIMER_STATE, discarded: true }
  }

  let entry: TimeEntry

  // Check if continuing an existing entry
  if (state.continuingEntryId) {
    const existingEntry = await getTimeEntry(state.continuingEntryId, getToday())
    if (existingEntry) {
      const newEndTime = now
      await updateTimeEntry(state.continuingEntryId, getToday(), {
        endTime: newEndTime,
        duration: elapsed,
      })
      debouncedSync()

      entry = {
        ...existingEntry,
        endTime: newEndTime,
        duration: elapsed,
      }
    } else {
      // Entry not found, create new one
      const startTimestamp = now - elapsed
      entry = {
        id: generateId(),
        date: getToday(),
        startTime: startTimestamp,
        endTime: now,
        duration: elapsed,
        projectId: state.projectId,
        taskId: null,
        description: state.description,
        type: 'stopwatch',
        tags: [],
      }
      await saveTimeEntry(entry)
      debouncedSync()
    }
  } else {
    // Create new entry
    const startTimestamp = now - elapsed
    entry = {
      id: generateId(),
      date: getToday(),
      startTime: startTimestamp,
      endTime: now,
      duration: elapsed,
      projectId: state.projectId,
      taskId: null,
      description: state.description,
      type: 'stopwatch',
      tags: [],
    }
    await saveTimeEntry(entry)
    debouncedSync()
  }

  await setTimerState(DEFAULT_TIMER_STATE)
  await setIdleInfo(DEFAULT_IDLE_INFO)
  await chrome.alarms.clear(TIMER_ALARM)
  if (hadActivePomodoro) {
    await setPomodoroState(DEFAULT_POMODORO_STATE)
    await chrome.alarms.clear(POMODORO_ALARM)
  }
  await updateBadge(DEFAULT_TIMER_STATE)
  void broadcastTimerSync(DEFAULT_TIMER_STATE, hadActivePomodoro ? DEFAULT_POMODORO_STATE : undefined)

  return { success: true, state: DEFAULT_TIMER_STATE, entry }
}
