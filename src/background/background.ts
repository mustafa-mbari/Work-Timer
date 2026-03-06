/**
 * Service worker orchestrator — thin routing layer that wires all background modules together.
 * All business logic lives in dedicated modules; this file handles message routing,
 * alarm dispatch, lifecycle events, and cross-cutting listener registration.
 */
import { initSentry } from '../utils/sentry'
initSentry()

import type { TimerMessage, TimerResponse } from '../types'
import { WEBSITE_URL, GUEST_SESSION_MAX_MS } from '@shared/constants'
import { generateId } from '../utils/id'
import { getLocalUserId, setLocalUserId, hasAnyLocalData, clearAllLocalData, getGuestStartedAt, clearGuestMode } from '../storage'
import { applyExternalSession, signOut as authSignOut, refreshSubscription, getSession, stampLoginTime, checkFreeSessionExpiry } from '../auth/authState'
import { syncAll, getSyncState, uploadAllLocalData, diagnoseSyncState } from '../sync/syncEngine'
import { setupRealtime, teardownRealtime } from '../sync/realtimeSubscription'
import { pushUserStats } from '../sync/statsSync'

// Background modules
import {
  getTimerState, getIdleInfo, getPomodoroState, getSettings,
  TIMER_ALARM, POMODORO_ALARM, SUBSCRIPTION_ALARM, SYNC_ALARM,
  STATS_SYNC_ALARM, SYNC_DEBOUNCE_ALARM, REMINDER_ALARM, REMINDER_RETRY_ALARM,
  GUEST_EXPIRY_ALARM,
} from './storage'
import { broadcastTimerSync, updateBadge, activeContentTabs, registerContentTab, unregisterContentTab } from './ui'
import { startTimer, pauseTimer, resumeTimer, stopTimer } from './timerEngine'
import { startPomodoro, stopPomodoro, skipPomodoroPhase, advancePomodoroPhase } from './pomodoroEngine'
import { idleKeep, idleDiscard } from './idleDetection'
import { scheduleReminder } from './reminders'
import { setupContextMenus, refreshContextMenus } from './contextMenus'

// Side-effect imports — register chrome listeners at module level
import './idleDetection'
import './reminders'

// ── Dashboard dedup guard ──

let lastDashboardOpenMs = 0
function maybeOpenDashboard() {
  const now = Date.now()
  if (now - lastDashboardOpenMs > 5000) {
    lastDashboardOpenMs = now
    void chrome.tabs.create({ url: `${WEBSITE_URL}/dashboard` })
  }
}

// ============================================================
// Message Router
// ============================================================

chrome.runtime.onMessage.addListener(
  (message: TimerMessage, sender, sendResponse: (response: TimerResponse) => void) => {
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
          case 'POPUP_OPENED': {
            const session = await getSession()
            if (session) void syncAll()
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
          case 'DIAGNOSE_SYNC': {
            const syncDiagnostics = await diagnoseSyncState()
            return { success: true, syncDiagnostics }
          }
          case 'CLEAR_AND_RESYNC': {
            const session = await getSession()
            if (!session) return { success: false, error: 'Not logged in' }
            await clearAllLocalData()
            await setLocalUserId(session.userId)
            await refreshSubscription().catch(() => null)
            setupRealtime(session.userId)
            void syncAll().catch(() => null)
            return { success: true }
          }
          case 'ACCOUNT_SWITCH_CHOICE': {
            const choice = message.payload?.description as 'clear' | 'merge' | 'keep' | undefined
            const session = await getSession()
            if (!session || !choice) return { success: false, error: 'Missing session or choice' }

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
            await chrome.alarms.create(SYNC_ALARM, { periodInMinutes: 15 })
            await chrome.alarms.create(STATS_SYNC_ALARM, { periodInMinutes: 60 })
            return { success: true }
          }
          case 'AUTH_LOGIN': {
            if (!message.accessToken || !message.refreshToken) {
              return { success: false, error: 'Missing tokens' }
            }
            const session = await applyExternalSession(message.accessToken, message.refreshToken)
            if (!session) {
              return { success: false, error: 'Failed to apply session' }
            }
            await stampLoginTime()
            // Clear guest mode flag if transitioning from guest to authenticated
            await clearGuestMode()
            const localUserId = await getLocalUserId()
            const hasData = await hasAnyLocalData()
            if (localUserId && localUserId !== session.userId && hasData) {
              await chrome.storage.local.set({ accountSwitchPending: true })
              return { success: true }
            }
            await setLocalUserId(session.userId)
            const senderUrl = sender.tab?.url ?? ''
            const isLoginPage = !senderUrl.includes(WEBSITE_URL) ||
              senderUrl.includes('/login') ||
              senderUrl.includes('/register') ||
              senderUrl.includes('/auth/')
            // Respond immediately, then do heavy work in background
            void (async () => {
              await refreshSubscription().catch(() => null)
              await chrome.alarms.create(SUBSCRIPTION_ALARM, { periodInMinutes: 60 })
              await chrome.alarms.create(SYNC_ALARM, { periodInMinutes: 15 })
              await chrome.alarms.create(STATS_SYNC_ALARM, { periodInMinutes: 60 })
              if (!localUserId && hasData) {
                await uploadAllLocalData().catch(() => null)
              }
              void syncAll().catch(() => null)
              void pushUserStats().catch(() => null)
              setupRealtime(session.userId)
              if (isLoginPage) maybeOpenDashboard()
            })()
            return { success: true }
          }
          case 'CONTENT_SCRIPT_READY': {
            const tabId = sender.tab?.id
            if (tabId != null) registerContentTab(tabId)
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
    void refreshContextMenus()
  }

  if (alarm.name === POMODORO_ALARM) {
    const pomState = await getPomodoroState()
    if (!pomState.active) {
      await chrome.alarms.clear(POMODORO_ALARM)
      return
    }
    await advancePomodoroPhase(pomState)
    const newTimerState = await getTimerState()
    const newPomState = await getPomodoroState()
    void broadcastTimerSync(newTimerState, newPomState)
    void refreshContextMenus()
  }

  if (alarm.name === SUBSCRIPTION_ALARM) {
    // Proactive token refresh — keeps session alive even when service worker is suspended for hours
    const session = await getSession() // triggers refresh if token expiring within 120s
    if (session) {
      // Check if free user session has expired (7 days)
      const loggedOut = await checkFreeSessionExpiry()
      if (loggedOut) {
        teardownRealtime()
        await chrome.alarms.clear(SYNC_ALARM)
        await chrome.alarms.clear(STATS_SYNC_ALARM)
        return
      }
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

  if (alarm.name === SYNC_DEBOUNCE_ALARM) {
    void syncAll().catch(err => {
      console.warn('[work-timer] Debounced sync failed:', err)
    })
    void pushUserStats().catch(err => {
      console.warn('[work-timer] Debounced stats push failed:', err)
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
          { title: '\u2713 Done' },
          { title: 'Remind me later' },
        ],
        requireInteraction: true,
      })
      await chrome.storage.local.set({ reminderPending: true })
    }
  }

  if (alarm.name === REMINDER_RETRY_ALARM) {
    const { reminderPending } = await chrome.storage.local.get('reminderPending')
    if (reminderPending) {
      chrome.notifications.create('weekly-reminder', {
        type: 'basic',
        iconUrl: 'icons/icon-128.png',
        title: 'Work Timer — Reminder (again)',
        message: 'You haven\'t confirmed yet. Have you exported or recorded your work this week?',
        priority: 2,
        buttons: [
          { title: '\u2713 Done' },
          { title: 'Remind me later' },
        ],
        requireInteraction: true,
      })
    }
  }

  if (alarm.name === GUEST_EXPIRY_ALARM) {
    const startedAt = await getGuestStartedAt()
    if (startedAt === null) {
      await chrome.alarms.clear(GUEST_EXPIRY_ALARM)
      return
    }
    if (Date.now() - startedAt > GUEST_SESSION_MAX_MS) {
      console.log('[work-timer] Guest session expired (5 days). Clearing data.')
      await clearAllLocalData()
      await clearGuestMode()
      await chrome.alarms.clear(GUEST_EXPIRY_ALARM)
    }
  }
})

// ============================================================
// Startup & Install
// ============================================================

chrome.runtime.onStartup.addListener(async () => {
  const state = await getTimerState()
  if (state.status === 'running') {
    await updateBadge(state)
    const settings = await getSettings()
    chrome.idle.setDetectionInterval(settings.idleTimeout * 60)
  }

  const pomState = await getPomodoroState()
  if (pomState.active && pomState.phaseStartedAt) {
    const elapsed = Date.now() - pomState.phaseStartedAt
    const remaining = pomState.phaseDuration - elapsed
    if (remaining > 0) {
      await chrome.alarms.create(POMODORO_ALARM, { when: Date.now() + remaining })
    } else {
      await advancePomodoroPhase(pomState)
    }
  }

  setupContextMenus()
  void refreshContextMenus()

  await chrome.alarms.create(SUBSCRIPTION_ALARM, { periodInMinutes: 60 })
  await chrome.alarms.create(SYNC_ALARM, { periodInMinutes: 15 })
  await chrome.alarms.create(STATS_SYNC_ALARM, { periodInMinutes: 60 })
  void scheduleReminder()

  // Re-create guest expiry alarm if in guest mode
  const guestStartedAt = await getGuestStartedAt()
  if (guestStartedAt !== null) {
    if (Date.now() - guestStartedAt > GUEST_SESSION_MAX_MS) {
      console.log('[work-timer] Guest session expired on startup. Clearing data.')
      await clearAllLocalData()
      await clearGuestMode()
    } else {
      await chrome.alarms.create(GUEST_EXPIRY_ALARM, { periodInMinutes: 60 })
    }
  }

  const session = await getSession()
  if (session) {
    // Auto-logout free users after 7 days
    const loggedOut = await checkFreeSessionExpiry()
    if (loggedOut) {
      teardownRealtime()
      return
    }
    void refreshSubscription().catch(err => {
      console.warn('[work-timer] Startup subscription refresh failed:', err)
    })
    void syncAll().catch(err => {
      console.warn('[work-timer] Startup sync failed:', err)
    })
    setupRealtime(session.userId)
  }
})

// Sync when coming back online
self.addEventListener('online', () => {
  void syncAll().catch(err => {
    console.warn('[work-timer] Online sync failed:', err)
  })
})

// React to settings changes (reminder, entrySaveTime)
chrome.storage.onChanged.addListener((changes) => {
  if (changes['settings']) {
    void scheduleReminder()
  }
})

// React to guest mode activation/deactivation
chrome.storage.onChanged.addListener(async (changes) => {
  if ('guestStartedAt' in changes) {
    if (changes['guestStartedAt'].newValue) {
      await chrome.alarms.create(GUEST_EXPIRY_ALARM, { periodInMinutes: 60 })
    } else {
      await chrome.alarms.clear(GUEST_EXPIRY_ALARM)
    }
  }
})

// Push timer state to a tab the moment it becomes active
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  if (!activeContentTabs.has(tabId)) return
  const state = await getTimerState()
  const result = await chrome.storage.local.get('projects')
  const projects = (result['projects'] as Array<{ id: string; name: string; color: string }> | undefined) ?? []
  chrome.tabs.sendMessage(tabId, { action: 'TIMER_SYNC', state, projects }).catch(() => {
    unregisterContentTab(tabId)
  })
})

// Clean up tracking set when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  unregisterContentTab(tabId)
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
// Context Menu Click Handler
// ============================================================

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
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id) {
      const result = await chrome.storage.local.get('projects')
      const projects = (result['projects'] as Array<{ id: string; name: string; color: string }> | undefined) ?? []
      chrome.tabs.sendMessage(tab.id, {
        action: 'SHOW_FLOATING_TIMER',
        state,
        projects,
      }).catch(() => {/* tab may not have content script */})
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
    if (state.status === 'idle') {
      await startTimer(state.projectId, state.description || 'Quick timer')
      chrome.notifications.create('timer-started', {
        type: 'basic',
        iconUrl: 'icons/icon-128.png',
        title: 'Timer Started',
        message: 'Timer started via keyboard shortcut',
        priority: 1,
      })
    } else {
      const result = await stopTimer()
      if (result.discarded) {
        const kbSettings = await getSettings()
        const secs = Math.round(Math.max(5, Math.min(240, kbSettings.entrySaveTime ?? 10)))
        chrome.notifications.create('entry-discarded', {
          type: 'basic',
          iconUrl: 'icons/icon-128.png',
          title: 'Entry Discarded',
          message: `Timer ran for less than ${secs}s. Change minimum duration in Settings \u2192 Timer.`,
          priority: 1,
        })
      } else if (result.entry) {
        chrome.notifications.create('timer-stopped', {
          type: 'basic',
          iconUrl: 'icons/icon-128.png',
          title: 'Timer Stopped',
          message: 'Timer stopped and entry saved',
          priority: 1,
        })
      }
    }
  } else if (command === 'toggle-pause') {
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
  }
})

// ============================================================
// External Messaging — Website <-> Extension Auth Bridge
// ============================================================

chrome.runtime.onMessageExternal.addListener(
  (message: { action: string; accessToken?: string; refreshToken?: string }, sender, sendResponse) => {
    const handle = async () => {
      if (message.action === 'AUTH_LOGIN' && message.accessToken && message.refreshToken) {
        const session = await applyExternalSession(message.accessToken, message.refreshToken)
        if (session) {
          await stampLoginTime()
          // Clear guest mode flag if transitioning from guest to authenticated
          await clearGuestMode()
          const localUserId = await getLocalUserId()
          const hasData = await hasAnyLocalData()

          if (localUserId && localUserId !== session.userId && hasData) {
            await chrome.storage.local.set({ accountSwitchPending: true })
            sendResponse({ success: true })
            return
          }

          await setLocalUserId(session.userId)
          sendResponse({ success: true })

          const senderUrl = sender.url ?? ''
          const isLoginPage = senderUrl.includes('/login') ||
            senderUrl.includes('/register') ||
            senderUrl.includes('/auth/')

          await refreshSubscription().catch(() => null)
          await chrome.alarms.create(SUBSCRIPTION_ALARM, { periodInMinutes: 60 })
          await chrome.alarms.create(SYNC_ALARM, { periodInMinutes: 15 })
          await chrome.alarms.create(STATS_SYNC_ALARM, { periodInMinutes: 60 })

          if (!localUserId && hasData) {
            await uploadAllLocalData().catch(() => null)
          }

          void syncAll().catch(() => null)
          void pushUserStats().catch(() => null)
          setupRealtime(session.userId)
          if (isLoginPage) maybeOpenDashboard()
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
