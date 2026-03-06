/**
 * Pomodoro timer engine: start, stop, skip, and phase advancement.
 */
import type { TimerState, TimeEntry, TimerResponse, PomodoroState, PomodoroPhase } from '../types'
import { getTimerState, setTimerState, setIdleInfo, getSettings, getPomodoroState, setPomodoroState, saveTimeEntry, DEFAULT_IDLE_INFO, DEFAULT_POMODORO_STATE, TIMER_ALARM, POMODORO_ALARM, debouncedSync } from './storage'
import { broadcastTimerSync, updateBadge } from './ui'
import { getElapsed, DEFAULT_TIMER_STATE } from '../utils/timer'
import { generateId } from '../utils/id'
import { getToday } from '../utils/date'

export async function startPomodoro(projectId: string | null, description: string): Promise<TimerResponse> {
  const settings = await getSettings()
  const now = Date.now()
  const phaseDuration = settings.pomodoro.workMinutes * 60 * 1000

  const pomState: PomodoroState = {
    active: true,
    phase: 'work',
    phaseStartedAt: now,
    phaseDuration,
    phaseTargetEndTime: now + phaseDuration,
    sessionsCompleted: 0,
    totalWorkTime: 0,
    remainingWork: 0,
    accumWork: 0,
  }
  await setPomodoroState(pomState)

  // Also start the regular timer for tracking
  const timerState: TimerState = {
    status: 'running',
    projectId,
    description,
    startTime: now,
    elapsed: 0,
    pausedAt: null,
    continuingEntryId: null,
  }
  await setTimerState(timerState)
  // Create one-shot alarm for when phase should end
  await chrome.alarms.create(POMODORO_ALARM, { when: now + phaseDuration })
  await updateBadge(timerState) // also schedules next TIMER_ALARM

  return { success: true, state: timerState, pomodoroState: pomState }
}

export async function stopPomodoro(): Promise<TimerResponse> {
  const pomState = await getPomodoroState()
  if (!pomState.active) return { success: false, error: 'Pomodoro is not active' }

  const timerState = await getTimerState()
  const now = Date.now()
  let entry: TimeEntry | undefined
  let discarded = false

  // Read threshold fresh from storage
  const settings = await getSettings()
  const saveThresholdMs = Math.max(5, Math.min(240, settings.entrySaveTime ?? 10)) * 1000

  if (pomState.phase === 'work') {
    // Stopped during work — save accumulated + current segment
    const currentSegment = getElapsed(timerState)
    const totalWork = (pomState.accumWork ?? 0) + currentSegment
    if (totalWork >= saveThresholdMs) {
      entry = {
        id: generateId(),
        date: getToday(),
        startTime: now - totalWork,
        endTime: now,
        duration: totalWork,
        projectId: timerState.projectId,
        taskId: null,
        description: timerState.description,
        type: 'pomodoro',
        tags: [],
      }
      await saveTimeEntry(entry)
      debouncedSync()
    } else if (totalWork >= 1000) {
      discarded = true
    }
  } else if ((pomState.accumWork ?? 0) > 0) {
    // Stopped during break but had accumulated work from earlier segments
    const totalWork = pomState.accumWork ?? 0
    if (totalWork >= saveThresholdMs) {
      entry = {
        id: generateId(),
        date: getToday(),
        startTime: now - totalWork,
        endTime: now,
        duration: totalWork,
        projectId: timerState.projectId,
        taskId: null,
        description: timerState.description,
        type: 'pomodoro',
        tags: [],
      }
      await saveTimeEntry(entry)
      debouncedSync()
    } else if (totalWork >= 1000) {
      discarded = true
    }
  }

  // Reset all state
  await setPomodoroState(DEFAULT_POMODORO_STATE)
  await chrome.alarms.clear(POMODORO_ALARM)
  await setTimerState(DEFAULT_TIMER_STATE)
  await setIdleInfo(DEFAULT_IDLE_INFO)
  await chrome.alarms.clear(TIMER_ALARM)
  await updateBadge(DEFAULT_TIMER_STATE)
  void broadcastTimerSync(DEFAULT_TIMER_STATE, DEFAULT_POMODORO_STATE)

  return { success: true, state: DEFAULT_TIMER_STATE, pomodoroState: DEFAULT_POMODORO_STATE, entry, discarded }
}

export async function skipPomodoroPhase(): Promise<TimerResponse> {
  const pomState = await getPomodoroState()
  if (!pomState.active) return { success: false, error: 'Pomodoro is not active' }

  await advancePomodoroPhase(pomState)
  const updated = await getPomodoroState()
  const timerState = await getTimerState()
  return { success: true, state: timerState, pomodoroState: updated }
}

export async function advancePomodoroPhase(pomState: PomodoroState): Promise<void> {
  const settings = await getSettings()
  const timerState = await getTimerState()
  const now = Date.now()
  const phaseThresholdMs = Math.max(5, Math.min(240, settings.entrySaveTime ?? 10)) * 1000

  // Backward compat: derive phaseTargetEndTime if missing (old state format)
  if (!pomState.phaseTargetEndTime && pomState.phaseStartedAt) {
    pomState.phaseTargetEndTime = pomState.phaseStartedAt + pomState.phaseDuration
  }

  if (pomState.phase === 'work') {
    // Work phase ended (naturally or manually skipped to break)
    const elapsed = getElapsed(timerState)
    // Use phaseTargetEndTime for accurate remaining calculation (survives SW restarts)
    const remaining = pomState.phaseTargetEndTime
      ? Math.max(0, pomState.phaseTargetEndTime - now)
      : Math.max(0, pomState.phaseDuration - elapsed)
    const totalAccum = (pomState.accumWork ?? 0) + elapsed

    if (remaining <= 1000) {
      // Natural completion — save entry with total accumulated work
      if (totalAccum >= phaseThresholdMs) {
        const entry: TimeEntry = {
          id: generateId(),
          date: getToday(),
          startTime: now - totalAccum,
          endTime: now,
          duration: totalAccum,
          projectId: timerState.projectId,
          taskId: null,
          description: timerState.description,
          type: 'pomodoro',
          tags: [],
        }
        await saveTimeEntry(entry)
        debouncedSync()
      }

      const newSessions = pomState.sessionsCompleted + 1
      const isLongBreak = newSessions % settings.pomodoro.sessionsBeforeLongBreak === 0
      const nextPhase: PomodoroPhase = isLongBreak ? 'longBreak' : 'shortBreak'
      const breakMinutes = isLongBreak ? settings.pomodoro.longBreakMinutes : settings.pomodoro.shortBreakMinutes
      const breakDuration = breakMinutes * 60 * 1000

      await setPomodoroState({
        active: true,
        phase: nextPhase,
        phaseStartedAt: now,
        phaseDuration: breakDuration,
        phaseTargetEndTime: now + breakDuration,
        sessionsCompleted: newSessions,
        totalWorkTime: pomState.totalWorkTime + elapsed,
        remainingWork: 0,
        accumWork: 0,
      })

      if (settings.pomodoro.soundEnabled) {
        chrome.notifications.create('pomodoro-break', {
          type: 'basic',
          iconUrl: 'icons/icon-128.png',
          title: `Pomodoro #${newSessions} Complete!`,
          message: `Time for a ${breakMinutes}-minute ${isLongBreak ? 'long ' : ''}break.`,
          priority: 2,
        })
      }
    } else {
      // Manual skip — don't save entry yet, accumulate work for later
      const breakDuration = settings.pomodoro.shortBreakMinutes * 60 * 1000

      await setPomodoroState({
        active: true,
        phase: 'shortBreak',
        phaseStartedAt: now,
        phaseDuration: breakDuration,
        phaseTargetEndTime: now + breakDuration,
        sessionsCompleted: pomState.sessionsCompleted,
        totalWorkTime: pomState.totalWorkTime + elapsed,
        remainingWork: remaining,
        accumWork: totalAccum,
      })
    }

    // Pause timer during break
    await setTimerState({ ...timerState, status: 'paused', elapsed: 0, startTime: null, pausedAt: now })
    await chrome.alarms.clear(TIMER_ALARM)
    const breakDuration = remaining <= 1000
      ? (pomState.sessionsCompleted + 1) % settings.pomodoro.sessionsBeforeLongBreak === 0
        ? settings.pomodoro.longBreakMinutes * 60 * 1000
        : settings.pomodoro.shortBreakMinutes * 60 * 1000
      : settings.pomodoro.shortBreakMinutes * 60 * 1000
    await chrome.alarms.create(POMODORO_ALARM, { when: now + breakDuration })
    await chrome.action.setBadgeText({ text: 'BRK' })
    await chrome.action.setBadgeBackgroundColor({ color: '#10b981' })
  } else {
    // Break ended — resume remaining work or start fresh session
    const hasRemaining = (pomState.remainingWork ?? 0) > 0
    const workDuration = hasRemaining ? pomState.remainingWork : settings.pomodoro.workMinutes * 60 * 1000

    await setPomodoroState({
      ...pomState,
      phase: 'work',
      phaseStartedAt: now,
      phaseDuration: workDuration,
      phaseTargetEndTime: now + workDuration,
      remainingWork: 0,
    })

    const updated: TimerState = {
      ...timerState,
      status: 'running',
      startTime: now,
      elapsed: 0,
      pausedAt: null,
    }
    await setTimerState(updated)
    await chrome.alarms.create(POMODORO_ALARM, { when: now + workDuration })
    await updateBadge(updated) // also schedules next TIMER_ALARM

    if (settings.pomodoro.soundEnabled) {
      chrome.notifications.create('pomodoro-work', {
        type: 'basic',
        iconUrl: 'icons/icon-128.png',
        title: 'Break Over!',
        message: hasRemaining ? 'Resuming work session.' : 'Time to focus. Starting new work session.',
        priority: 2,
      })
    }
  }
}
