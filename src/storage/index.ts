import type { TimeEntry, Project, Settings, TimerState, Tag, SyncPreferences } from '@/types'
import { DEFAULT_TIMER_STATE } from '@/utils/timer'
import { getToday } from '@/utils/date'
import { getSession } from '@/auth/authState'
import { isCurrentUserPremium } from '@/premium/featureGate'
import { enqueue } from '@/sync/syncQueue'
import { syncAll } from '@/sync/syncEngine'
import { generateId } from '@/utils/id'
import { GUEST_SESSION_MAX_MS } from '@shared/constants'

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

const TABLE_TO_PREF: Record<string, keyof SyncPreferences | null> = {
  time_entries: 'entries',
  projects: 'projects',
  tags: 'tags',
  user_settings: null, // always syncs
}

async function enqueueSyncItem(
  table: 'time_entries' | 'projects' | 'tags' | 'user_settings',
  recordId: string,
  action: 'upsert' | 'delete',
  date?: string
): Promise<void> {
  if (suppressEnqueue) return
  if (!(await checkSyncEligible())) return
  const prefKey = TABLE_TO_PREF[table]
  if (prefKey) {
    const prefs = await getSyncPreferences()
    if (!prefs[prefKey]) return
  }
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
  entrySaveTime: 10,
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

// --- Sync Preferences (local-only, never synced to cloud) ---

const SYNC_PREFS_KEY = 'syncPreferences'

export const DEFAULT_SYNC_PREFERENCES: SyncPreferences = {
  entries: true,
  statistics: true,
  projects: true,
  tags: true,
}

export async function getSyncPreferences(): Promise<SyncPreferences> {
  const result = await chrome.storage.local.get(SYNC_PREFS_KEY)
  const stored = result[SYNC_PREFS_KEY] as Partial<SyncPreferences> | undefined
  return { ...DEFAULT_SYNC_PREFERENCES, ...stored }
}

export async function updateSyncPreferences(prefs: SyncPreferences): Promise<void> {
  await chrome.storage.local.set({ [SYNC_PREFS_KEY]: prefs })
}

// --- Timer State ---

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

/** Check if there is any meaningful local data (entries or projects).
 *  Uses getBytesInUse for a lightweight check instead of reading all storage. */
export async function hasAnyLocalData(): Promise<boolean> {
  // Quick check: if projects exist, that's enough
  const result = await chrome.storage.local.get(KEYS.projects)
  if (Array.isArray(result[KEYS.projects]) && (result[KEYS.projects] as unknown[]).length > 0) {
    return true
  }
  // Check total storage usage — if > 1KB, there are likely entries
  const bytes = await chrome.storage.local.getBytesInUse(null)
  return bytes > 1024
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
    k === 'syncCursor' ||
    k === 'guestBannerDismissCount'
  )
  if (keysToRemove.length > 0) {
    await chrome.storage.local.remove(keysToRemove)
  }
}

// --- Guest Mode ---

const GUEST_STARTED_KEY = 'guestStartedAt'

export async function getGuestStartedAt(): Promise<number | null> {
  const result = await chrome.storage.local.get(GUEST_STARTED_KEY)
  return (result[GUEST_STARTED_KEY] as number | undefined) ?? null
}

export async function isGuestMode(): Promise<boolean> {
  return (await getGuestStartedAt()) !== null
}

export async function activateGuestMode(): Promise<void> {
  // Clear any residual data from a previous session
  await clearAllLocalData()
  await chrome.storage.local.remove(['localUserId', 'initialSyncDone'])
  // Create a starter project for the guest
  const projects = [{
    id: generateId(),
    name: 'Default',
    color: '#3b82f6',
    targetHours: null,
    archived: false,
    createdAt: Date.now(),
  }]
  await chrome.storage.local.set({
    [GUEST_STARTED_KEY]: Date.now(),
    projects,
  })
}

export async function clearGuestMode(): Promise<void> {
  await chrome.storage.local.remove(GUEST_STARTED_KEY)
}

export async function getGuestDaysRemaining(): Promise<number | null> {
  const startedAt = await getGuestStartedAt()
  if (startedAt === null) return null
  const remaining = GUEST_SESSION_MAX_MS - (Date.now() - startedAt)
  return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)))
}

// --- Guest Banner Dismiss ---

const GUEST_BANNER_DISMISS_KEY = 'guestBannerDismissCount'

export async function getGuestBannerDismissCount(): Promise<number> {
  const result = await chrome.storage.local.get(GUEST_BANNER_DISMISS_KEY)
  return (result[GUEST_BANNER_DISMISS_KEY] as number | undefined) ?? 0
}

export async function setGuestBannerDismissCount(count: number): Promise<void> {
  await chrome.storage.local.set({ [GUEST_BANNER_DISMISS_KEY]: count })
}

export async function countGuestEntries(): Promise<number> {
  const all = await chrome.storage.local.get(null)
  let count = 0
  for (const [key, value] of Object.entries(all)) {
    if (key.startsWith('entries_')) count += (value as unknown[]).length
  }
  return count
}
