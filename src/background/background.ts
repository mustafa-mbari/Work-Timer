import type { TimerMessage, TimerResponse, TimerState, TimeEntry, IdleInfo, PomodoroState, PomodoroPhase } from '../types'
import { generateId } from '../utils/id'
import { getToday } from '../utils/date'
import { POMODORO_WORK_MS, IDLE_THRESHOLD_MS } from '../constants/timers'
import { getSettings, getTimerState, setTimerState, saveEntry, updateEntry, getEntries, getLocalUserId, setLocalUserId, hasAnyLocalData, clearAllLocalData } from '../storage'
import { applyExternalSession, signOut as authSignOut, refreshSubscription, getSession } from '../auth/authState'
import { syncAll, getSyncState, uploadAllLocalData } from '../sync/syncEngine'
import { setupRealtime, teardownRealtime } from '../sync/realtimeSubscription'
import { pushUserStats } from '../sync/statsSync'

const TIMER_ALARM = 'timer-tick'
const POMODORO_ALARM = 'pomodoro-tick'
const SUBSCRIPTION_ALARM = 'subscription-refresh'
const SYNC_ALARM = 'sync-periodic'
const REMINDER_ALARM = 'weekly-reminder'
const REMINDER_RETRY_ALARM = 'reminder-retry'
const STATS_SYNC_ALARM = 'stats-sync'
const STORAGE_KEYS = {
  timerState: 'timerState',
  idleInfo: 'idleInfo',
  pomodoroState: 'pomodoroState',
  settings: 'settings',
  entries: (date: string) => `entries_${date}`,
}

const DEFAULT_TIMER_STATE: TimerState = {
  status: 'idle',
  projectId: null,
  description: '',
  startTime: null,
  elapsed: 0,
  pausedAt: null,
  continuingEntryId: null,
}

const DEFAULT_IDLE_INFO: IdleInfo = {
  idleStartedAt: null,
  idleDuration: 0,
  pending: false,
}

const DEFAULT_POMODORO_STATE: PomodoroState = {
  active: false,
  phase: 'work',
  phaseStartedAt: null,
  phaseDuration: POMODORO_WORK_MS,
  sessionsCompleted: 0,
  totalWorkTime: 0,
}

// --- Storage helpers ---

// Removed getTimerState, setTimerState (imported)

async function getIdleInfo(): Promise<IdleInfo> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.idleInfo)
  return (result[STORAGE_KEYS.idleInfo] as IdleInfo | undefined) ?? DEFAULT_IDLE_INFO
}

async function setIdleInfo(info: IdleInfo): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.idleInfo]: info })
}

// Removed getPomodoroState, setPomodoroState (kept local as not exported from storage?), wait these are local.
// Removed getSettings (imported)

// Removed saveTimeEntry, updateTimeEntry, getTimeEntry (using imported)

async function getPomodoroState(): Promise<PomodoroState> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.pomodoroState)
  return (result[STORAGE_KEYS.pomodoroState] as PomodoroState | undefined) ?? DEFAULT_POMODORO_STATE
}

async function setPomodoroState(state: PomodoroState): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.pomodoroState]: state })
}

// --- Reminder Helpers ---

function getNextReminderTime(dayOfWeek: number, hour: number, minute: number): number {
  const now = new Date()
  const target = new Date()
  target.setHours(hour, minute, 0, 0)

  const currentDay = now.getDay()
  let daysUntil = dayOfWeek - currentDay
  if (daysUntil < 0) daysUntil += 7
  if (daysUntil === 0 && now >= target) daysUntil = 7

  target.setDate(target.getDate() + daysUntil)
  return target.getTime()
}

async function scheduleReminder(): Promise<void> {
  const settings = await getSettings()
  const reminder = settings.reminder
  if (!reminder || !reminder.enabled) {
    await chrome.alarms.clear(REMINDER_ALARM)
    return
  }
  const when = getNextReminderTime(reminder.dayOfWeek, reminder.hour, reminder.minute)
  await chrome.alarms.create(REMINDER_ALARM, { when })
}

// --- Time Entry Helpers ---

function getElapsed(state: TimerState): number {
  if (state.status === 'running' && state.startTime) {
    return state.elapsed + (Date.now() - state.startTime)
  }
  return state.elapsed
}

async function getTimeEntry(entryId: string, date: string): Promise<TimeEntry | null> {
  const entries = await getEntries(date)
  return entries.find(e => e.id === entryId) ?? null
}

async function saveTimeEntry(entry: TimeEntry): Promise<void> {
  await saveEntry(entry)
  void syncAll()
}

async function updateTimeEntry(entryId: string, date: string, updates: Partial<TimeEntry>): Promise<void> {
  const entry = await getTimeEntry(entryId, date)
  if (entry) {
    const updated = { ...entry, ...updates }
    await updateEntry(updated)
    void syncAll()
  }
}

async function broadcastTimerSync(state: TimerState): Promise<void> {
  const result = await chrome.storage.local.get('projects')
  const projects = (result['projects'] as Array<{ id: string; name: string; color: string }> | undefined) ?? []
  const tabs = await chrome.tabs.query({})
  for (const tab of tabs) {
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, { action: 'TIMER_SYNC', state, projects }).catch(() => {
        // Tab may not have content script loaded, ignore
      })
    }
  }
  // Keep context menu states in sync with every timer state change
  void refreshContextMenus()
}

async function updateBadge(state: TimerState): Promise<void> {
  if (state.status === 'idle') {
    await chrome.action.setBadgeText({ text: '' })
    return
  }

  // Check if Pomodoro is active and show countdown
  const pomState = await getPomodoroState()
  if (pomState.active && pomState.phaseStartedAt && pomState.phase === 'work') {
    const now = Date.now()
    const remaining = Math.max(0, pomState.phaseDuration - (now - pomState.phaseStartedAt))
    const totalSeconds = Math.floor(remaining / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const text = `${minutes}m`
    await chrome.action.setBadgeText({ text })
    await chrome.action.setBadgeBackgroundColor({ color: '#9333ea' }) // Purple for Pomodoro
    return
  }

  // Regular timer: show elapsed time
  const elapsed = getElapsed(state)
  const totalSeconds = Math.floor(elapsed / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const text = hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}` : `${minutes}m`
  await chrome.action.setBadgeText({ text })
  await chrome.action.setBadgeBackgroundColor({ color: state.status === 'paused' ? '#f59e0b' : '#3b82f6' })
}

// ============================================================
// Timer Actions
// ============================================================

async function startTimer(projectId: string | null, description: string, continuingEntryId: string | null = null): Promise<TimerResponse> {
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
  await chrome.alarms.create(TIMER_ALARM, { periodInMinutes: 0.5 })
  await updateBadge(state)
  // Clear any previous "user dismissed" flag so the widget auto-shows for the new session
  await chrome.storage.local.remove('floatingTimerHidden')
  void broadcastTimerSync(state)

  // Set idle detection threshold
  const settings = await getSettings()
  chrome.idle.setDetectionInterval(settings.idleTimeout * 60)

  return { success: true, state }
}

async function pauseTimer(): Promise<TimerResponse> {
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

async function resumeTimer(): Promise<TimerResponse> {
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
  await chrome.alarms.create(TIMER_ALARM, { periodInMinutes: 0.5 })
  await updateBadge(updated)
  void broadcastTimerSync(updated)
  return { success: true, state: updated }
}

async function stopTimer(): Promise<TimerResponse> {
  const state = await getTimerState()
  if (state.status === 'idle') return { success: false, error: 'Timer is not active' }

  const elapsed = getElapsed(state)
  const now = Date.now()
  let entry: TimeEntry

  // Check if continuing an existing entry
  if (state.continuingEntryId) {
    const existingEntry = await getTimeEntry(state.continuingEntryId, getToday())
    if (existingEntry) {
      // Update existing entry: use total elapsed time and update endTime
      const newEndTime = now

      await updateTimeEntry(state.continuingEntryId, getToday(), {
        endTime: newEndTime,
        duration: elapsed,
      })

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
  }

  await setTimerState(DEFAULT_TIMER_STATE)
  await setIdleInfo(DEFAULT_IDLE_INFO)
  await chrome.alarms.clear(TIMER_ALARM)
  await updateBadge(DEFAULT_TIMER_STATE)
  void broadcastTimerSync(DEFAULT_TIMER_STATE)

  return { success: true, state: DEFAULT_TIMER_STATE, entry }
}

// ============================================================
// Idle Detection
// ============================================================

chrome.idle.onStateChanged.addListener(async (newState) => {
  const timerState = await getTimerState()
  if (timerState.status !== 'running') return

  if (newState === 'idle' || newState === 'locked') {
    // User went idle — record when it started
    const idleInfo: IdleInfo = {
      idleStartedAt: Date.now(),
      idleDuration: 0,
      pending: false,
    }
    await setIdleInfo(idleInfo)
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

async function idleKeep(): Promise<TimerResponse> {
  // Keep idle time — just dismiss the notification
  await setIdleInfo(DEFAULT_IDLE_INFO)
  const state = await getTimerState()
  return { success: true, state, idleInfo: DEFAULT_IDLE_INFO }
}

async function idleDiscard(): Promise<TimerResponse> {
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

// ============================================================
// Pomodoro Timer
// ============================================================

async function startPomodoro(projectId: string | null, description: string): Promise<TimerResponse> {
  const settings = await getSettings()
  const now = Date.now()
  const phaseDuration = settings.pomodoro.workMinutes * 60 * 1000

  const pomState: PomodoroState = {
    active: true,
    phase: 'work',
    phaseStartedAt: now,
    phaseDuration,
    sessionsCompleted: 0,
    totalWorkTime: 0,
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
  await chrome.alarms.create(TIMER_ALARM, { periodInMinutes: 0.5 })
  // Create one-shot alarm for when phase should end
  await chrome.alarms.create(POMODORO_ALARM, { when: now + phaseDuration })
  await updateBadge(timerState)

  return { success: true, state: timerState, pomodoroState: pomState }
}

async function stopPomodoro(): Promise<TimerResponse> {
  const pomState = await getPomodoroState()
  if (!pomState.active) return { success: false, error: 'Pomodoro is not active' }

  await setPomodoroState(DEFAULT_POMODORO_STATE)
  await chrome.alarms.clear(POMODORO_ALARM)

  // Stop the regular timer too
  return stopTimer()
}

async function skipPomodoroPhase(): Promise<TimerResponse> {
  const pomState = await getPomodoroState()
  if (!pomState.active) return { success: false, error: 'Pomodoro is not active' }

  await advancePomodoroPhase(pomState)
  const updated = await getPomodoroState()
  const timerState = await getTimerState()
  return { success: true, state: timerState, pomodoroState: updated }
}

async function advancePomodoroPhase(pomState: PomodoroState): Promise<void> {
  const settings = await getSettings()
  const timerState = await getTimerState()
  const now = Date.now()

  if (pomState.phase === 'work') {
    // Work phase ended — save entry and start break
    const elapsed = getElapsed(timerState)
    if (elapsed > 0) {
      const entry: TimeEntry = {
        id: generateId(),
        date: getToday(),
        startTime: now - elapsed,
        endTime: now,
        duration: elapsed,
        projectId: timerState.projectId,
        taskId: null,
        description: timerState.description,
        type: 'pomodoro',
        tags: [],
      }
      await saveTimeEntry(entry)
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
      sessionsCompleted: newSessions,
      totalWorkTime: pomState.totalWorkTime + elapsed,
    })

    // Pause timer during break
    await setTimerState({ ...timerState, status: 'paused', elapsed: 0, startTime: null, pausedAt: now })
    await chrome.alarms.clear(TIMER_ALARM)
    // Create alarm for when break ends
    await chrome.alarms.create(POMODORO_ALARM, { when: now + breakDuration })
    await chrome.action.setBadgeText({ text: 'BRK' })
    await chrome.action.setBadgeBackgroundColor({ color: '#10b981' })

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
    // Break ended — start new work session
    const workDuration = settings.pomodoro.workMinutes * 60 * 1000

    await setPomodoroState({
      ...pomState,
      phase: 'work',
      phaseStartedAt: now,
      phaseDuration: workDuration,
    })

    const updated: TimerState = {
      ...timerState,
      status: 'running',
      startTime: now,
      elapsed: 0,
      pausedAt: null,
    }
    await setTimerState(updated)
    await chrome.alarms.create(TIMER_ALARM, { periodInMinutes: 0.5 })
    // Create alarm for when work phase ends
    await chrome.alarms.create(POMODORO_ALARM, { when: now + workDuration })
    await updateBadge(updated)

    if (settings.pomodoro.soundEnabled) {
      chrome.notifications.create('pomodoro-work', {
        type: 'basic',
        iconUrl: 'icons/icon-128.png',
        title: 'Break Over!',
        message: 'Time to focus. Starting new work session.',
        priority: 2,
      })
    }
  }
}

// ============================================================
// Message Handler
// ============================================================

chrome.runtime.onMessage.addListener(
  (message: TimerMessage, _sender, sendResponse: (response: TimerResponse) => void) => {
    const handle = async (): Promise<TimerResponse> => {
      try {
        switch (message.action) {
          case 'START_TIMER':
            return startTimer(
              message.payload?.projectId ?? null,
              message.payload?.description ?? '',
              message.payload?.continuingEntryId ?? null
            )
          case 'PAUSE_TIMER':
            return pauseTimer()
          case 'RESUME_TIMER':
            return resumeTimer()
          case 'STOP_TIMER':
            return stopTimer()
          case 'GET_TIMER_STATE': {
            const state = await getTimerState()
            const idleInfo = await getIdleInfo()
            const pomodoroState = await getPomodoroState()
            return { success: true, state, idleInfo, pomodoroState }
          }
          case 'IDLE_KEEP':
            return idleKeep()
          case 'IDLE_DISCARD':
            return idleDiscard()
          case 'IDLE_DISMISS':
            return idleKeep() // Same as keep — just dismiss
          case 'START_POMODORO':
            return startPomodoro(message.payload?.projectId ?? null, message.payload?.description ?? '')
          case 'STOP_POMODORO':
            return stopPomodoro()
          case 'SKIP_POMODORO_PHASE':
            return skipPomodoroPhase()
          case 'GET_POMODORO_STATE': {
            const ps = await getPomodoroState()
            return { success: true, pomodoroState: ps }
          }
          case 'AUTH_STATE': {
            const session = await getSession()
            return { success: true, session: session ?? undefined }
          }
          case 'AUTH_LOGOUT': {
            await authSignOut()
            return { success: true }
          }
          case 'GET_SUBSCRIPTION': {
            const sub = await refreshSubscription()
            return { success: true, subscription: sub ?? undefined }
          }
          case 'SYNC_NOW': {
            void syncAll()
            return { success: true }
          }
          case 'SYNC_STATUS': {
            const syncState = await getSyncState()
            return { success: true, syncState }
          }
          case 'UPLOAD_ALL': {
            await uploadAllLocalData()
            await syncAll()
            return { success: true }
          }
          case 'ACCOUNT_SWITCH_CHOICE': {
            const choice = message.payload?.description as 'clear' | 'merge' | 'keep' | undefined
            const session = await getSession()
            if (!session || !choice) return { success: false, error: 'Missing session or choice' }

            // Clear the pending flag
            await chrome.storage.local.remove('accountSwitchPending')

            if (choice === 'clear') {
              await clearAllLocalData()
              await setLocalUserId(session.userId)
              await refreshSubscription().catch(() => null)
              setupRealtime(session.userId)
              await syncAll()
            } else if (choice === 'merge') {
              await setLocalUserId(session.userId)
              await refreshSubscription().catch(() => null)
              await uploadAllLocalData()
              setupRealtime(session.userId)
              await syncAll()
            } else if (choice === 'keep') {
              await setLocalUserId(session.userId)
              await refreshSubscription().catch(() => null)
              setupRealtime(session.userId)
              await syncAll()
            }

            await chrome.alarms.create(SUBSCRIPTION_ALARM, { periodInMinutes: 60 })
            await chrome.alarms.create(SYNC_ALARM, { periodInMinutes: 5 })
            await chrome.alarms.create(STATS_SYNC_ALARM, { periodInMinutes: 60 })
            return { success: true }
          }
          default:
            return { success: false, error: 'Unknown action' }
        }
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
    handle().then(sendResponse)
    return true
  }
)

// ============================================================
// Alarm Handlers
// ============================================================

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === TIMER_ALARM) {
    const state = await getTimerState()
    await updateBadge(state)
    void broadcastTimerSync(state)
  }

  if (alarm.name === POMODORO_ALARM) {
    const pomState = await getPomodoroState()
    if (!pomState.active) {
      await chrome.alarms.clear(POMODORO_ALARM)
      return
    }

    // Phase time is up — advance to next phase
    await advancePomodoroPhase(pomState)
  }

  if (alarm.name === SUBSCRIPTION_ALARM) {
    // Refresh subscription status from Supabase every 60 minutes
    const session = await getSession()
    if (session) {
      await refreshSubscription().catch(err => {
        console.warn('[work-timer] Subscription refresh failed:', err)
      })
    }
  }

  if (alarm.name === SYNC_ALARM) {
    void syncAll().catch(err => {
      console.warn('[work-timer] Periodic sync failed:', err)
    })
  }

  if (alarm.name === STATS_SYNC_ALARM) {
    void pushUserStats().catch(err => {
      console.warn('[work-timer] Stats sync failed:', err)
    })
  }

  if (alarm.name === REMINDER_ALARM) {
    const settings = await getSettings()
    if (settings.reminder?.enabled) {
      chrome.notifications.create('weekly-reminder', {
        type: 'basic',
        iconUrl: 'icons/icon-128.png',
        title: 'Work Timer — Weekly Reminder',
        message: 'Have you exported or recorded your work this week? Click "Done" to confirm, or we\'ll remind you again in 1 hour.',
        priority: 2,
        buttons: [
          { title: '✓ Done' },
          { title: 'Remind me later' },
        ],
        requireInteraction: true,
      })
      // Mark as pending confirmation
      await chrome.storage.local.set({ reminderPending: true })
    }
  }

  if (alarm.name === REMINDER_RETRY_ALARM) {
    // Re-fire the reminder if user hasn't confirmed yet
    const { reminderPending } = await chrome.storage.local.get('reminderPending')
    if (reminderPending) {
      chrome.notifications.create('weekly-reminder', {
        type: 'basic',
        iconUrl: 'icons/icon-128.png',
        title: 'Work Timer — Reminder (again)',
        message: 'You haven\'t confirmed yet. Have you exported or recorded your work this week?',
        priority: 2,
        buttons: [
          { title: '✓ Done' },
          { title: 'Remind me later' },
        ],
        requireInteraction: true,
      })
    }
  }
})

// ============================================================
// Reminder Notification Button Handlers
// ============================================================

chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
  if (notificationId !== 'weekly-reminder') return

  chrome.notifications.clear('weekly-reminder')
  await chrome.alarms.clear(REMINDER_RETRY_ALARM)

  if (buttonIndex === 0) {
    // "Done" — confirmed, clear pending and schedule next week
    await chrome.storage.local.remove('reminderPending')
    void scheduleReminder()
  } else {
    // "Remind me later" — retry in 1 hour
    await chrome.alarms.create(REMINDER_RETRY_ALARM, { delayInMinutes: 60 })
  }
})

// Also handle clicking the notification body (not a button) — treat as "remind later"
chrome.notifications.onClicked.addListener(async (notificationId) => {
  if (notificationId !== 'weekly-reminder') return
  chrome.notifications.clear('weekly-reminder')
  // Don't clear pending — retry alarm will re-fire if set, or schedule next week
  const { reminderPending } = await chrome.storage.local.get('reminderPending')
  if (reminderPending) {
    await chrome.alarms.create(REMINDER_RETRY_ALARM, { delayInMinutes: 60 })
  }
})

// Handle notification dismissed (closed without action) — retry in 1 hour
chrome.notifications.onClosed.addListener(async (notificationId) => {
  if (notificationId !== 'weekly-reminder') return
  const { reminderPending } = await chrome.storage.local.get('reminderPending')
  if (reminderPending) {
    await chrome.alarms.create(REMINDER_RETRY_ALARM, { delayInMinutes: 60 })
  }
})

// ============================================================
// Startup & Install
// ============================================================

chrome.runtime.onStartup.addListener(async () => {
  const state = await getTimerState()
  if (state.status === 'running') {
    await chrome.alarms.create(TIMER_ALARM, { periodInMinutes: 0.5 })
    await updateBadge(state)

    const settings = await getSettings()
    chrome.idle.setDetectionInterval(settings.idleTimeout * 60)
  }

  const pomState = await getPomodoroState()
  if (pomState.active && pomState.phaseStartedAt) {
    const elapsed = Date.now() - pomState.phaseStartedAt
    const remaining = pomState.phaseDuration - elapsed

    if (remaining > 0) {
      // Phase still ongoing — recreate alarm
      await chrome.alarms.create(POMODORO_ALARM, { when: Date.now() + remaining })
    } else {
      // Phase ended while Chrome was closed — advance now
      await advancePomodoroPhase(pomState)
    }
  }

  setupContextMenus()
  void refreshContextMenus()

  // Schedule subscription refresh every 60 minutes
  await chrome.alarms.create(SUBSCRIPTION_ALARM, { periodInMinutes: 60 })

  // Schedule periodic sync every 5 minutes
  await chrome.alarms.create(SYNC_ALARM, { periodInMinutes: 5 })

  // Schedule weekly reminder
  void scheduleReminder()

  // Schedule hourly stats sync for all authenticated users
  await chrome.alarms.create(STATS_SYNC_ALARM, { periodInMinutes: 60 })

  // Re-fetch subscription on startup if user is logged in
  const session = await getSession()
  if (session) {
    void refreshSubscription().catch(err => {
      console.warn('[work-timer] Startup subscription refresh failed:', err)
    })
    // Sync on startup to pick up changes from other devices
    void syncAll().catch(err => {
      console.warn('[work-timer] Startup sync failed:', err)
    })
    // Re-establish Realtime subscriptions (worker may have restarted)
    setupRealtime(session.userId)
  }
})

// Sync when coming back online
self.addEventListener('online', () => {
  void syncAll().catch(err => {
    console.warn('[work-timer] Online sync failed:', err)
  })
})

// Reschedule reminder when settings change
chrome.storage.onChanged.addListener((changes) => {
  if (changes['settings']) {
    void scheduleReminder()
  }
})

// Push timer state to a tab the moment it becomes active (so widget follows tab switches)
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const state = await getTimerState()
  const result = await chrome.storage.local.get('projects')
  const projects = (result['projects'] as Array<{ id: string; name: string; color: string }> | undefined) ?? []
  chrome.tabs.sendMessage(tabId, { action: 'TIMER_SYNC', state, projects }).catch(() => { })
})

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    const projects = [
      {
        id: generateId(),
        name: 'Default',
        color: '#3b82f6',
        targetHours: null,
        archived: false,
        createdAt: Date.now(),
      },
    ]
    await chrome.storage.local.set({ projects })
  }
  setupContextMenus()
  void scheduleReminder()
})

// ============================================================
// Context Menu (Toolbar Quick Actions)
// ============================================================

function setupContextMenus(): void {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'toggle-timer',
      title: 'Start Timer',
      contexts: ['action'],
    })
    chrome.contextMenus.create({
      id: 'toggle-pause',
      title: 'Pause Timer',
      contexts: ['action'],
    })
    chrome.contextMenus.create({
      id: 'show-widget',
      title: 'Show Floating Widget',
      contexts: ['action'],
      enabled: false,
    })
  })
}

async function refreshContextMenus(): Promise<void> {
  const state = await getTimerState()
  chrome.contextMenus.update('toggle-timer', {
    title: state.status === 'idle' ? 'Start Timer' : 'Stop Timer',
  })
  chrome.contextMenus.update('toggle-pause', {
    title: state.status === 'running' ? 'Pause Timer' : 'Resume Timer',
    enabled: state.status !== 'idle',
  })
  chrome.contextMenus.update('show-widget', {
    enabled: state.status !== 'idle',
  })
}

chrome.contextMenus.onClicked.addListener(async (info) => {
  const state = await getTimerState()

  if (info.menuItemId === 'toggle-timer') {
    if (state.status === 'idle') {
      await startTimer(state.projectId, state.description || 'Quick timer')
    } else {
      await stopTimer()
    }
  } else if (info.menuItemId === 'toggle-pause') {
    if (state.status === 'running') {
      await pauseTimer()
    } else if (state.status === 'paused') {
      await resumeTimer()
    }
  } else if (info.menuItemId === 'show-widget') {
    // Send to active tab — resets position to bottom-right and clears hidden flag
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id) {
      const result = await chrome.storage.local.get('projects')
      const projects = (result['projects'] as Array<{ id: string; name: string; color: string }> | undefined) ?? []
      chrome.tabs.sendMessage(tab.id, {
        action: 'SHOW_FLOATING_TIMER',
        state,
        projects,
      }).catch(() => {/* tab may not have content script */ })
    }
  }

  await refreshContextMenus()
})

// ============================================================
// Keyboard Shortcuts
// ============================================================

chrome.commands.onCommand.addListener(async (command) => {
  const state = await getTimerState()

  if (command === 'toggle-timer') {
    // Alt+Shift+S: Start/Stop timer
    if (state.status === 'idle') {
      // Start timer with last used project/description or default
      await startTimer(state.projectId, state.description || 'Quick timer')
      chrome.notifications.create('timer-started', {
        type: 'basic',
        iconUrl: 'icons/icon-128.png',
        title: 'Timer Started',
        message: 'Timer started via keyboard shortcut',
        priority: 1,
      })
    } else {
      // Stop timer (running or paused)
      await stopTimer()
      chrome.notifications.create('timer-stopped', {
        type: 'basic',
        iconUrl: 'icons/icon-128.png',
        title: 'Timer Stopped',
        message: 'Timer stopped and entry saved',
        priority: 1,
      })
    }
  } else if (command === 'toggle-pause') {
    // Alt+Shift+P: Pause/Resume timer
    if (state.status === 'running') {
      await pauseTimer()
      chrome.notifications.create('timer-paused', {
        type: 'basic',
        iconUrl: 'icons/icon-128.png',
        title: 'Timer Paused',
        message: 'Timer paused via keyboard shortcut',
        priority: 1,
      })
    } else if (state.status === 'paused') {
      await resumeTimer()
      chrome.notifications.create('timer-resumed', {
        type: 'basic',
        iconUrl: 'icons/icon-128.png',
        title: 'Timer Resumed',
        message: 'Timer resumed via keyboard shortcut',
        priority: 1,
      })
    }
    // If idle, do nothing
  }
})

// ============================================================
// External Messaging — Website ↔ Extension Auth Bridge
// ============================================================

// The companion website sends the Supabase session here after login.
// The website must be listed in manifest.json "externally_connectable.matches".
chrome.runtime.onMessageExternal.addListener(
  (message: { action: string; accessToken?: string; refreshToken?: string }, _sender, sendResponse) => {
    const handle = async () => {
      if (message.action === 'AUTH_LOGIN' && message.accessToken && message.refreshToken) {
        const session = await applyExternalSession(message.accessToken, message.refreshToken)
        if (session) {
          const localUserId = await getLocalUserId()
          const hasData = await hasAnyLocalData()

          // Detect account switch: different user with existing local data
          if (localUserId && localUserId !== session.userId && hasData) {
            // Store flag so the popup can show the account switch dialog
            await chrome.storage.local.set({ accountSwitchPending: true })
            sendResponse({ success: true })
            return
          }

          // Same account, first login, or no local data — proceed normally
          await setLocalUserId(session.userId)
          // Fetch and cache subscription immediately after login
          await refreshSubscription().catch(() => null)
          // Schedule alarms
          await chrome.alarms.create(SUBSCRIPTION_ALARM, { periodInMinutes: 60 })
          await chrome.alarms.create(SYNC_ALARM, { periodInMinutes: 5 })
          await chrome.alarms.create(STATS_SYNC_ALARM, { periodInMinutes: 60 })

          // First-time login with existing offline data — upload it
          if (!localUserId && hasData) {
            await uploadAllLocalData().catch(() => null)
          }

          // Initial sync
          void syncAll().catch(() => null)
          // Push aggregate stats on login
          void pushUserStats().catch(() => null)
          // Start Realtime subscriptions
          setupRealtime(session.userId)
          sendResponse({ success: true })
        } else {
          sendResponse({ success: false, error: 'Failed to apply session' })
        }
      } else if (message.action === 'AUTH_LOGOUT') {
        teardownRealtime()
        await chrome.alarms.clear(SYNC_ALARM)
        await authSignOut()
        await chrome.alarms.clear(SUBSCRIPTION_ALARM)
        sendResponse({ success: true })
      } else {
        sendResponse({ success: false, error: 'Unknown external action' })
      }
    }
    void handle()
    return true // Keep message channel open for async response
  }
)
