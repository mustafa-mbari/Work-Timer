/**
 * UI updates: badge and content-script broadcasts.
 */
import type { TimerState, PomodoroState } from '../types'
import { getPomodoroState, TIMER_ALARM } from './storage'
import { getElapsed } from '../utils/timer'

// ── Active content-script tab tracking ──
// Content scripts register via CONTENT_SCRIPT_READY; broadcasts go only to registered tabs.

export const activeContentTabs = new Set<number>()

export function registerContentTab(tabId: number): void {
  activeContentTabs.add(tabId)
}

export function unregisterContentTab(tabId: number): void {
  activeContentTabs.delete(tabId)
}

// ── Broadcast ──

export async function broadcastTimerSync(state: TimerState, pomodoroState?: PomodoroState): Promise<void> {
  const result = await chrome.storage.local.get('projects')
  const projects = (result['projects'] as Array<{ id: string; name: string; color: string }> | undefined) ?? []
  const msg = { action: 'TIMER_SYNC', state, projects, pomodoroState }

  // Send to popup / options page via runtime messaging
  chrome.runtime.sendMessage(msg).catch(() => {
    // No popup/extension page open — safe to ignore
  })

  // Send to content script tabs
  for (const tabId of activeContentTabs) {
    chrome.tabs.sendMessage(tabId, msg).catch(() => {
      activeContentTabs.delete(tabId)
    })
  }
}

// ── Badge ──

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

  // Schedule next badge update at the next minute boundary
  if (state.status === 'running') {
    const secondsIntoMinute = totalSeconds % 60
    const secsUntilNextMinute = 60 - secondsIntoMinute
    await chrome.alarms.create(TIMER_ALARM, { when: Date.now() + secsUntilNextMinute * 1000 })
  }
}

