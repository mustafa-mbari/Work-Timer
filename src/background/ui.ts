/**
 * UI update functions for badge, tab titles, and content script broadcasts
 */
import type { TimerState } from '../types'
import { getPomodoroState } from './storage'

// Store original tab titles to restore them later
const originalTabTitles = new Map<number, string>()

/**
 * Calculate current elapsed time for a timer state
 */
export function getElapsed(state: TimerState): number {
  if (state.status === 'running' && state.startTime) {
    return state.elapsed + (Date.now() - state.startTime)
  }
  return state.elapsed
}

/**
 * Format milliseconds as HH:MM:SS for display
 */
export function formatTimerForDisplay(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

/**
 * Broadcast timer state to all content scripts (for floating widget)
 */
export async function broadcastTimerSync(state: TimerState, refreshContextMenus: () => Promise<void>): Promise<void> {
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

/**
 * Update active tab title with timer display
 */
export async function updateActiveTabTitle(state: TimerState): Promise<void> {
  if (state.status === 'idle') {
    // Restore original titles when timer stops
    const tabs = await chrome.tabs.query({})
    for (const tab of tabs) {
      if (tab.id && originalTabTitles.has(tab.id)) {
        const originalTitle = originalTabTitles.get(tab.id)
        if (originalTitle) {
          try {
            await chrome.tabs.sendMessage(tab.id, {
              action: 'RESTORE_TITLE',
              originalTitle
            }).catch(() => {
              // Tab might not have content script, ignore error
            })
          } catch {
            // Ignore errors
          }
        }
      }
    }
    originalTabTitles.clear()
    return
  }

  // Update active tab title with timer
  const elapsed = getElapsed(state)
  const timeStr = formatTimerForDisplay(elapsed)

  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tabs.length > 0 && tabs[0].id !== undefined) {
      const tab = tabs[0]
      const tabId = tab.id as number

      // Store original title if we haven't already
      if (!originalTabTitles.has(tabId) && tab.title) {
        originalTabTitles.set(tabId, tab.title)
      }

      // Update tab title by executing a script
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (timer: string) => {
          if (!document.title.startsWith('[')) {
            document.title = `[${timer}] ${document.title}`
          } else {
            document.title = document.title.replace(/^\[.*?\]/, `[${timer}]`)
          }
        },
        args: [timeStr]
      }).catch(() => {
        // Some tabs (chrome://, chrome-extension://) can't be scripted, ignore
      })
    }
  } catch {
    // Ignore errors for tabs that can't be accessed
  }
}

/**
 * Update extension badge with timer/pomodoro countdown
 */
export async function updateBadge(state: TimerState): Promise<void> {
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
