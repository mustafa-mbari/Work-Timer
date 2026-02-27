/**
 * Background storage operations for timer state, idle info, and pomodoro state
 */
import type { TimerState, IdleInfo, PomodoroState, Settings, TimeEntry } from '../types'
import { DEFAULT_SETTINGS } from '../storage'
import { POMODORO_WORK_MS } from '../constants/timers'
import { DEFAULT_TIMER_STATE } from '../utils/timer'

const STORAGE_KEYS = {
  timerState: 'timerState',
  idleInfo: 'idleInfo',
  pomodoroState: 'pomodoroState',
  settings: 'settings',
  entries: (date: string) => `entries_${date}`,
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
  remainingWork: 0,
  accumWork: 0,
}

// --- Timer State ---

export async function getTimerState(): Promise<TimerState> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.timerState)
  return (result[STORAGE_KEYS.timerState] as TimerState | undefined) ?? DEFAULT_TIMER_STATE
}

export async function setTimerState(state: TimerState): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.timerState]: state })
}

// --- Idle Info ---

export async function getIdleInfo(): Promise<IdleInfo> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.idleInfo)
  return (result[STORAGE_KEYS.idleInfo] as IdleInfo | undefined) ?? DEFAULT_IDLE_INFO
}

export async function setIdleInfo(info: IdleInfo): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.idleInfo]: info })
}

// --- Pomodoro State ---

export async function getPomodoroState(): Promise<PomodoroState> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.pomodoroState)
  return (result[STORAGE_KEYS.pomodoroState] as PomodoroState | undefined) ?? DEFAULT_POMODORO_STATE
}

export async function setPomodoroState(state: PomodoroState): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.pomodoroState]: state })
}

// --- Settings ---

export async function getSettings(): Promise<Settings> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.settings)
  const stored = result[STORAGE_KEYS.settings] as Partial<Settings> | undefined
  return { ...DEFAULT_SETTINGS, ...stored }
}

// --- Time Entries ---

export async function saveTimeEntry(entry: TimeEntry): Promise<void> {
  const key = STORAGE_KEYS.entries(entry.date)
  const result = await chrome.storage.local.get(key)
  const entries: TimeEntry[] = (result[key] as TimeEntry[] | undefined) ?? []
  entries.push(entry)
  await chrome.storage.local.set({ [key]: entries })
}

export async function updateTimeEntry(entryId: string, date: string, updates: Partial<TimeEntry>): Promise<void> {
  const key = STORAGE_KEYS.entries(date)
  const result = await chrome.storage.local.get(key)
  const entries: TimeEntry[] = (result[key] as TimeEntry[] | undefined) ?? []
  const index = entries.findIndex(e => e.id === entryId)
  if (index !== -1) {
    entries[index] = { ...entries[index], ...updates }
    await chrome.storage.local.set({ [key]: entries })
  }
}

export async function getTimeEntry(entryId: string, date: string): Promise<TimeEntry | null> {
  const key = STORAGE_KEYS.entries(date)
  const result = await chrome.storage.local.get(key)
  const entries: TimeEntry[] = (result[key] as TimeEntry[] | undefined) ?? []
  return entries.find(e => e.id === entryId) ?? null
}
