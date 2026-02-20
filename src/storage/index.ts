import type { TimeEntry, Project, Settings, TimerState, Tag } from '@/types'
import { getToday } from '@/utils/date'
import { getSession } from '@/auth/authState'
import { isCurrentUserPremium } from '@/premium/featureGate'
import { enqueue } from '@/sync/syncQueue'
import { syncAll } from '@/sync/syncEngine'

// Set to true during pull operations (pullDelta, Realtime handlers) to prevent
// re-enqueueing changes that originated from the server (would cause sync loops).
let suppressEnqueue = false

export function setSuppressEnqueue(val: boolean): void {
  suppressEnqueue = val
}

// Cached sync eligibility — avoids 2 async reads (getSession + isCurrentUserPremium) per write.
// Updated by chrome.storage.onChanged listener and on first check.
let _syncEligible: boolean | null = null

async function checkSyncEligible(): Promise<boolean> {
  if (_syncEligible !== null) return _syncEligible
  const [session, premium] = await Promise.all([getSession(), isCurrentUserPremium()])
  _syncEligible = !!(session && premium)
  return _syncEligible
}

// Invalidate cache when auth or subscription state changes in storage
if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes) => {
    if (changes['supabase.auth.token'] || changes['subscriptionInfo']) {
      _syncEligible = null
    }
  })
}

async function enqueueSyncItem(
  table: 'time_entries' | 'projects' | 'tags' | 'user_settings',
  recordId: string,
  action: 'upsert' | 'delete',
  date?: string
): Promise<void> {
  if (suppressEnqueue) return
  if (!(await checkSyncEligible())) return
  await enqueue(table, recordId, action, date)
}

const KEYS = {
  entries: (date: string) => `entries_${date}`,
  projects: 'projects',
  tags: 'tags',
  settings: 'settings',
  timerState: 'timerState',
} as const

// --- Retry + quota detection ---

function isQuotaError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  return err.message.includes('QUOTA_BYTES') || err.message.includes('quota') || err.name === 'QuotaExceededError'
}

async function storageSet(data: Record<string, unknown>): Promise<void> {
  const MAX = 3
  for (let attempt = 0; attempt < MAX; attempt++) {
    try {
      await chrome.storage.local.set(data)
      return
    } catch (err) {
      if (isQuotaError(err)) {
        self.dispatchEvent(new CustomEvent('storage-quota-exceeded'))
        throw err
      }
      if (attempt === MAX - 1) throw err
      await new Promise(r => setTimeout(r, 100 * Math.pow(2, attempt)))
    }
  }
}

// --- Data validation ---

function isValidEntry(e: unknown): e is TimeEntry {
  if (!e || typeof e !== 'object') return false
  const entry = e as Record<string, unknown>
  return (
    typeof entry.id === 'string' && entry.id.length > 0 &&
    typeof entry.date === 'string' &&
    typeof entry.startTime === 'number' &&
    typeof entry.endTime === 'number' &&
    typeof entry.duration === 'number' && entry.duration >= 0 &&
    (entry.type === 'manual' || entry.type === 'stopwatch' || entry.type === 'pomodoro') &&
    Array.isArray(entry.tags)
  )
}

function isValidProject(p: unknown): p is Project {
  if (!p || typeof p !== 'object') return false
  const proj = p as Record<string, unknown>
  return (
    typeof proj.id === 'string' && proj.id.length > 0 &&
    typeof proj.name === 'string' &&
    typeof proj.color === 'string' &&
    typeof proj.archived === 'boolean'
  )
}

// --- Time Entries ---

export async function getEntries(date: string = getToday()): Promise<TimeEntry[]> {
  const key = KEYS.entries(date)
  const result = await chrome.storage.local.get(key)
  const raw = (result[key] as unknown[] | undefined) ?? []
  return raw.filter(isValidEntry)
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
  return dates.flatMap(date => {
    const raw = (result[KEYS.entries(date)] as unknown[] | undefined) ?? []
    return raw.filter(isValidEntry)
  })
}

export async function saveEntry(entry: TimeEntry): Promise<void> {
  const key = KEYS.entries(entry.date)
  const entries = await getEntries(entry.date)
  entries.push(entry)
  await storageSet({ [key]: entries })
  await enqueueSyncItem('time_entries', entry.id, 'upsert', entry.date)
}

export async function updateEntry(entry: TimeEntry): Promise<void> {
  const key = KEYS.entries(entry.date)
  const entries = await getEntries(entry.date)
  const index = entries.findIndex(e => e.id === entry.id)
  if (index !== -1) {
    entries[index] = entry
    await storageSet({ [key]: entries })
    await enqueueSyncItem('time_entries', entry.id, 'upsert', entry.date)
  }
}



export async function deleteEntry(id: string, date: string): Promise<void> {
  const key = KEYS.entries(date)
  const entries = await getEntries(date)
  const filtered = entries.filter(e => e.id !== id)
  await storageSet({ [key]: filtered })
  await enqueueSyncItem('time_entries', id, 'delete', date)
  void syncAll()
}

// --- Projects ---

export async function getProjects(): Promise<Project[]> {
  const result = await chrome.storage.local.get(KEYS.projects)
  const raw = (result[KEYS.projects] as unknown[] | undefined) ?? []
  return raw.filter(isValidProject)
}

export async function saveProject(project: Project): Promise<void> {
  const projects = await getProjects()
  projects.push(project)
  await storageSet({ [KEYS.projects]: projects })
  await enqueueSyncItem('projects', project.id, 'upsert')
}

export async function updateProject(project: Project): Promise<void> {
  const projects = await getProjects()
  const index = projects.findIndex(p => p.id === project.id)
  if (index !== -1) {
    projects[index] = project
    await storageSet({ [KEYS.projects]: projects })
    await enqueueSyncItem('projects', project.id, 'upsert')
  }
}

export async function archiveProject(id: string): Promise<void> {
  const projects = await getProjects()
  const index = projects.findIndex(p => p.id === id)
  if (index !== -1) {
    projects[index].archived = true
    await storageSet({ [KEYS.projects]: projects })
    await enqueueSyncItem('projects', id, 'upsert')
  }
}

export async function deleteProject(id: string): Promise<void> {
  const projects = await getProjects()
  const filtered = projects.filter(p => p.id !== id)
  await storageSet({ [KEYS.projects]: filtered })
  await enqueueSyncItem('projects', id, 'delete')
}

export async function setDefaultProject(id: string): Promise<void> {
  const projects = await getProjects()
  for (const p of projects) {
    p.isDefault = p.id === id ? true : undefined
  }
  await storageSet({ [KEYS.projects]: projects })
  // Enqueue all projects because isDefault changed on multiple records
  for (const p of projects) {
    await enqueueSyncItem('projects', p.id, 'upsert')
  }
}

export async function reorderProjects(orderedIds: string[]): Promise<void> {
  const projects = await getProjects()
  for (const p of projects) {
    const idx = orderedIds.indexOf(p.id)
    p.order = idx !== -1 ? idx : undefined
  }
  await storageSet({ [KEYS.projects]: projects })
  // Enqueue all projects because order changed on multiple records
  for (const p of projects) {
    await enqueueSyncItem('projects', p.id, 'upsert')
  }
}

// --- Tags ---

function isValidTag(t: unknown): t is Tag {
  if (!t || typeof t !== 'object') return false
  const tag = t as Record<string, unknown>
  return typeof tag.id === 'string' && tag.id.length > 0 && typeof tag.name === 'string'
}

export async function getTags(): Promise<Tag[]> {
  const result = await chrome.storage.local.get(KEYS.tags)
  const raw = (result[KEYS.tags] as unknown[] | undefined) ?? []
  return raw.filter(isValidTag)
}

export async function saveTags(tags: Tag[]): Promise<void> {
  await storageSet({ [KEYS.tags]: tags })
  // Enqueue all tag IDs as upserts (tags are small, enqueue all on each save)
  for (const tag of tags) {
    await enqueueSyncItem('tags', tag.id, 'upsert')
  }
}

// --- Settings ---

export const DEFAULT_SETTINGS: Settings = {
  workingDays: 5,
  weekStartDay: 1,
  idleTimeout: 5,
  theme: 'light-soft',
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
  floatingTimerAutoShow: true,
  reminder: {
    enabled: true,
    dayOfWeek: 5,  // Friday
    hour: 14,      // 2:00 PM
    minute: 0,
  },
}

export async function getSettings(): Promise<Settings> {
  const result = await chrome.storage.local.get(KEYS.settings)
  const stored = result[KEYS.settings] as Partial<Settings> | undefined
  return { ...DEFAULT_SETTINGS, ...stored }
}

export async function updateSettings(partial: Partial<Settings>): Promise<void> {
  const current = await getSettings()
  await storageSet({ [KEYS.settings]: { ...current, ...partial } })
  await enqueueSyncItem('user_settings', 'self', 'upsert')
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
  await storageSet({ [KEYS.timerState]: state })
}

export async function clearTimerState(): Promise<void> {
  await storageSet({ [KEYS.timerState]: DEFAULT_TIMER_STATE })
}

// --- Local User Identity ---

const LOCAL_USER_ID_KEY = 'localUserId'

export async function getLocalUserId(): Promise<string | null> {
  const result = await chrome.storage.local.get(LOCAL_USER_ID_KEY)
  return (result[LOCAL_USER_ID_KEY] as string | undefined) ?? null
}

export async function setLocalUserId(userId: string): Promise<void> {
  await chrome.storage.local.set({ [LOCAL_USER_ID_KEY]: userId })
}

// --- Data Management ---

/** Check if there is any meaningful local data (entries or projects) */
export async function hasAnyLocalData(): Promise<boolean> {
  const all = await chrome.storage.local.get(null)
  const hasEntries = Object.keys(all).some(k => k.startsWith('entries_'))
  const hasProjects = Array.isArray(all[KEYS.projects]) && (all[KEYS.projects] as unknown[]).length > 0
  return hasEntries || hasProjects
}

/** Clear all user data from local storage (entries, projects, tags, settings, timer, sync state) */
export async function clearAllLocalData(): Promise<void> {
  const all = await chrome.storage.local.get(null)
  const keysToRemove = Object.keys(all).filter(k =>
    k.startsWith('entries_') ||
    k === KEYS.projects ||
    k === KEYS.tags ||
    k === KEYS.settings ||
    k === KEYS.timerState ||
    k === 'syncQueue' ||
    k === 'syncCursor'
  )
  if (keysToRemove.length > 0) {
    await chrome.storage.local.remove(keysToRemove)
  }
}
