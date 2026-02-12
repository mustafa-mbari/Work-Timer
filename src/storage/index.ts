import type { TimeEntry, Project, Settings, TimerState } from '@/types'
import { getToday } from '@/utils/date'

const KEYS = {
  entries: (date: string) => `entries_${date}`,
  projects: 'projects',
  settings: 'settings',
  timerState: 'timerState',
} as const

// --- Time Entries ---

export async function getEntries(date: string = getToday()): Promise<TimeEntry[]> {
  const key = KEYS.entries(date)
  const result = await chrome.storage.local.get(key)
  return (result[key] as TimeEntry[] | undefined) ?? []
}

export async function getEntriesByRange(startDate: string, endDate: string): Promise<TimeEntry[]> {
  const dates: string[] = []
  const current = new Date(startDate)
  const end = new Date(endDate)
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0])
    current.setDate(current.getDate() + 1)
  }

  const keys = dates.map(KEYS.entries)
  const result = await chrome.storage.local.get(keys)
  return dates.flatMap(date => (result[KEYS.entries(date)] as TimeEntry[] | undefined) ?? [])
}

export async function saveEntry(entry: TimeEntry): Promise<void> {
  const key = KEYS.entries(entry.date)
  const entries = await getEntries(entry.date)
  entries.push(entry)
  await chrome.storage.local.set({ [key]: entries })
}

export async function updateEntry(entry: TimeEntry): Promise<void> {
  const key = KEYS.entries(entry.date)
  const entries = await getEntries(entry.date)
  const index = entries.findIndex(e => e.id === entry.id)
  if (index !== -1) {
    entries[index] = entry
    await chrome.storage.local.set({ [key]: entries })
  }
}

export async function deleteEntry(id: string, date: string): Promise<void> {
  const key = KEYS.entries(date)
  const entries = await getEntries(date)
  const filtered = entries.filter(e => e.id !== id)
  await chrome.storage.local.set({ [key]: filtered })
}

// --- Projects ---

export async function getProjects(): Promise<Project[]> {
  const result = await chrome.storage.local.get(KEYS.projects)
  return (result[KEYS.projects] as Project[] | undefined) ?? []
}

export async function saveProject(project: Project): Promise<void> {
  const projects = await getProjects()
  projects.push(project)
  await chrome.storage.local.set({ [KEYS.projects]: projects })
}

export async function updateProject(project: Project): Promise<void> {
  const projects = await getProjects()
  const index = projects.findIndex(p => p.id === project.id)
  if (index !== -1) {
    projects[index] = project
    await chrome.storage.local.set({ [KEYS.projects]: projects })
  }
}

export async function archiveProject(id: string): Promise<void> {
  const projects = await getProjects()
  const index = projects.findIndex(p => p.id === id)
  if (index !== -1) {
    projects[index].archived = true
    await chrome.storage.local.set({ [KEYS.projects]: projects })
  }
}

// --- Settings ---

const DEFAULT_SETTINGS: Settings = {
  workingDays: 5,
  weekStartDay: 1,
  idleTimeout: 5,
  theme: 'light',
  language: 'en',
  notifications: true,
  dailyTarget: 8,
  weeklyTarget: 40,
  pomodoro: {
    workMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    sessionsBeforeLongBreak: 4,
    soundEnabled: true,
  },
}

export async function getSettings(): Promise<Settings> {
  const result = await chrome.storage.local.get(KEYS.settings)
  const stored = result[KEYS.settings] as Partial<Settings> | undefined
  return { ...DEFAULT_SETTINGS, ...stored }
}

export async function updateSettings(partial: Partial<Settings>): Promise<void> {
  const current = await getSettings()
  await chrome.storage.local.set({ [KEYS.settings]: { ...current, ...partial } })
}

// --- Timer State ---

const DEFAULT_TIMER_STATE: TimerState = {
  status: 'idle',
  projectId: null,
  description: '',
  startTime: null,
  elapsed: 0,
  pausedAt: null,
  continuingEntryId: null,
}

export async function getTimerState(): Promise<TimerState> {
  const result = await chrome.storage.local.get(KEYS.timerState)
  return (result[KEYS.timerState] as TimerState | undefined) ?? DEFAULT_TIMER_STATE
}

export async function setTimerState(state: TimerState): Promise<void> {
  await chrome.storage.local.set({ [KEYS.timerState]: state })
}

export async function clearTimerState(): Promise<void> {
  await chrome.storage.local.set({ [KEYS.timerState]: DEFAULT_TIMER_STATE })
}
