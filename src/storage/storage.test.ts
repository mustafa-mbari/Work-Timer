import { describe, it, expect, vi, beforeEach } from 'vitest'
import { seedStore, getStore } from '../__tests__/setup'
import type { TimeEntry, Project, Tag } from '@/types'

// Mock sync dependencies to isolate storage logic
vi.mock('@/sync/syncQueue', () => ({
  enqueue: vi.fn(),
}))
vi.mock('@/sync/syncEngine', () => ({
  syncAll: vi.fn(),
}))
vi.mock('@/auth/authState', () => ({
  getSession: vi.fn().mockResolvedValue(null),
}))
vi.mock('@/premium/featureGate', () => ({
  isCurrentUserPremium: vi.fn().mockResolvedValue(false),
}))

// Import after mocks
import {
  getEntries,
  getEntriesByRange,
  saveEntry,
  updateEntry,
  deleteEntry,
  getProjects,
  saveProject,
  updateProject,
  archiveProject,
  deleteProject,
  setDefaultProject,
  reorderProjects,
  getTags,
  saveTags,
  getSettings,
  updateSettings,
  getTimerState,
  setTimerState,
  clearTimerState,
  getLocalUserId,
  setLocalUserId,
  hasAnyLocalData,
  clearAllLocalData,
  DEFAULT_SETTINGS,
  activateGuestMode,
  clearGuestMode,
  isGuestMode,
  getGuestStartedAt,
  getGuestDaysRemaining,
} from './index'

// --- Fixtures ---

const makeEntry = (overrides: Partial<TimeEntry> = {}): TimeEntry => ({
  id: 'entry-1',
  date: '2025-01-15',
  startTime: 1705312800000,
  endTime: 1705316400000,
  duration: 3600000,
  projectId: null,
  taskId: null,
  description: 'Test entry',
  type: 'manual',
  tags: [],
  ...overrides,
})

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'proj-1',
  name: 'Test Project',
  color: '#6366F1',
  targetHours: null,
  archived: false,
  createdAt: Date.now(),
  ...overrides,
})

const makeTag = (overrides: Partial<Tag> = {}): Tag => ({
  id: 'tag-1',
  name: 'Test Tag',
  color: '#6366F1',
  ...overrides,
})

// --- Time Entries ---

describe('Time Entries', () => {
  it('returns empty array when no entries exist', async () => {
    const result = await getEntries('2025-01-15')
    expect(result).toEqual([])
  })

  it('saves and retrieves an entry', async () => {
    const entry = makeEntry()
    await saveEntry(entry)
    const result = await getEntries('2025-01-15')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('entry-1')
  })

  it('stores entries under date-keyed storage key', async () => {
    const entry = makeEntry()
    await saveEntry(entry)
    const store = getStore()
    expect(store['entries_2025-01-15']).toBeDefined()
    expect((store['entries_2025-01-15'] as TimeEntry[]).length).toBe(1)
  })

  it('appends multiple entries for the same date', async () => {
    await saveEntry(makeEntry({ id: 'e1' }))
    await saveEntry(makeEntry({ id: 'e2' }))
    const result = await getEntries('2025-01-15')
    expect(result).toHaveLength(2)
  })

  it('updates an existing entry', async () => {
    await saveEntry(makeEntry())
    await updateEntry(makeEntry({ description: 'Updated' }))
    const result = await getEntries('2025-01-15')
    expect(result[0].description).toBe('Updated')
  })

  it('update does nothing for non-existent entry', async () => {
    await saveEntry(makeEntry({ id: 'e1' }))
    await updateEntry(makeEntry({ id: 'e-missing', description: 'Nope' }))
    const result = await getEntries('2025-01-15')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('e1')
  })

  it('deletes an entry', async () => {
    await saveEntry(makeEntry({ id: 'e1' }))
    await saveEntry(makeEntry({ id: 'e2' }))
    await deleteEntry('e1', '2025-01-15')
    const result = await getEntries('2025-01-15')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('e2')
  })

  it('filters out invalid entries from storage', async () => {
    seedStore({
      'entries_2025-01-15': [
        makeEntry({ id: 'valid' }),
        { id: 'bad', noDate: true },          // missing required fields
        { id: '', date: '2025-01-15' },        // empty id
        null,
        42,
      ],
    })
    const result = await getEntries('2025-01-15')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('valid')
  })

  it('getEntriesByRange fetches across multiple dates', async () => {
    await saveEntry(makeEntry({ id: 'e1', date: '2025-01-15' }))
    await saveEntry(makeEntry({ id: 'e2', date: '2025-01-16' }))
    await saveEntry(makeEntry({ id: 'e3', date: '2025-01-17' }))
    const result = await getEntriesByRange('2025-01-15', '2025-01-17')
    expect(result).toHaveLength(3)
  })

  it('getEntriesByRange returns empty for range with no data', async () => {
    const result = await getEntriesByRange('2025-06-01', '2025-06-03')
    expect(result).toEqual([])
  })
})

// --- Projects ---

describe('Projects', () => {
  it('returns empty array when no projects', async () => {
    expect(await getProjects()).toEqual([])
  })

  it('saves and retrieves a project', async () => {
    await saveProject(makeProject())
    const result = await getProjects()
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Test Project')
  })

  it('updates a project', async () => {
    await saveProject(makeProject())
    await updateProject(makeProject({ name: 'Renamed' }))
    const result = await getProjects()
    expect(result[0].name).toBe('Renamed')
  })

  it('archives a project', async () => {
    await saveProject(makeProject({ id: 'p1', archived: false }))
    await archiveProject('p1')
    const result = await getProjects()
    expect(result[0].archived).toBe(true)
  })

  it('deletes a project', async () => {
    await saveProject(makeProject({ id: 'p1' }))
    await saveProject(makeProject({ id: 'p2', name: 'Other' }))
    await deleteProject('p1')
    const result = await getProjects()
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('p2')
  })

  it('sets default project', async () => {
    await saveProject(makeProject({ id: 'p1' }))
    await saveProject(makeProject({ id: 'p2' }))
    await setDefaultProject('p2')
    const result = await getProjects()
    expect(result.find(p => p.id === 'p1')?.isDefault).toBeUndefined()
    expect(result.find(p => p.id === 'p2')?.isDefault).toBe(true)
  })

  it('reorders projects', async () => {
    await saveProject(makeProject({ id: 'a' }))
    await saveProject(makeProject({ id: 'b' }))
    await saveProject(makeProject({ id: 'c' }))
    await reorderProjects(['c', 'a', 'b'])
    const result = await getProjects()
    expect(result.find(p => p.id === 'c')?.order).toBe(0)
    expect(result.find(p => p.id === 'a')?.order).toBe(1)
    expect(result.find(p => p.id === 'b')?.order).toBe(2)
  })

  it('filters out invalid projects', async () => {
    seedStore({
      projects: [
        makeProject({ id: 'valid' }),
        { id: 'bad' },            // missing name, color, archived
        null,
      ],
    })
    const result = await getProjects()
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('valid')
  })
})

// --- Tags ---

describe('Tags', () => {
  it('returns empty array when no tags', async () => {
    expect(await getTags()).toEqual([])
  })

  it('saves and retrieves tags', async () => {
    await saveTags([makeTag({ id: 't1' }), makeTag({ id: 't2', name: 'Bug' })])
    const result = await getTags()
    expect(result).toHaveLength(2)
  })

  it('filters out invalid tags', async () => {
    seedStore({
      tags: [
        makeTag({ id: 'valid' }),
        { notATag: true },
        { id: '', name: 'empty-id' },   // empty id fails validation
      ],
    })
    const result = await getTags()
    expect(result).toHaveLength(1)
  })
})

// --- Settings ---

describe('Settings', () => {
  it('returns default settings when none stored', async () => {
    const settings = await getSettings()
    expect(settings).toEqual(DEFAULT_SETTINGS)
  })

  it('merges stored settings with defaults', async () => {
    seedStore({ settings: { dailyTarget: 6 } })
    const settings = await getSettings()
    expect(settings.dailyTarget).toBe(6)
    expect(settings.workingDays).toBe(5) // default
  })

  it('updates partial settings', async () => {
    await updateSettings({ theme: 'dark-midnight' })
    const settings = await getSettings()
    expect(settings.theme).toBe('dark-midnight')
    expect(settings.workingDays).toBe(5) // unchanged
  })
})

// --- Timer State ---

describe('Timer State', () => {
  it('returns default timer state when none stored', async () => {
    const state = await getTimerState()
    expect(state.status).toBe('idle')
    expect(state.elapsed).toBe(0)
    expect(state.startTime).toBeNull()
  })

  it('sets and retrieves timer state', async () => {
    await setTimerState({
      status: 'running',
      projectId: 'p1',
      description: 'Working',
      startTime: Date.now(),
      elapsed: 0,
      pausedAt: null,
      continuingEntryId: null,
    })
    const state = await getTimerState()
    expect(state.status).toBe('running')
    expect(state.projectId).toBe('p1')
  })

  it('clears timer state back to default', async () => {
    await setTimerState({
      status: 'running',
      projectId: 'p1',
      description: 'Working',
      startTime: Date.now(),
      elapsed: 5000,
      pausedAt: null,
      continuingEntryId: null,
    })
    await clearTimerState()
    const state = await getTimerState()
    expect(state.status).toBe('idle')
    expect(state.elapsed).toBe(0)
  })
})

// --- Local User ID ---

describe('Local User ID', () => {
  it('returns null when no user ID stored', async () => {
    expect(await getLocalUserId()).toBeNull()
  })

  it('sets and retrieves local user ID', async () => {
    await setLocalUserId('user-123')
    expect(await getLocalUserId()).toBe('user-123')
  })
})

// --- Data Management ---

describe('Data Management', () => {
  it('hasAnyLocalData returns false for empty store', async () => {
    expect(await hasAnyLocalData()).toBe(false)
  })

  it('hasAnyLocalData returns true when projects exist', async () => {
    await saveProject(makeProject())
    expect(await hasAnyLocalData()).toBe(true)
  })

  it('clearAllLocalData removes entries, projects, tags, settings', async () => {
    await saveEntry(makeEntry())
    await saveProject(makeProject())
    await saveTags([makeTag()])
    await updateSettings({ theme: 'dark-mocha' })
    await setTimerState({ status: 'running', projectId: null, description: '', startTime: Date.now(), elapsed: 0, pausedAt: null, continuingEntryId: null })
    seedStore({ syncQueue: [{ id: '1' }], syncCursor: 'abc' })

    await clearAllLocalData()

    expect(await getEntries('2025-01-15')).toEqual([])
    expect(await getProjects()).toEqual([])
    expect(await getTags()).toEqual([])
    const state = await getTimerState()
    expect(state.status).toBe('idle')
  })
})

// --- Storage retry / quota detection ---

describe('storageSet retry and quota', () => {
  it('retries on transient errors', async () => {
    const mockSet = chrome.storage.local.set as ReturnType<typeof vi.fn>
    let calls = 0
    mockSet.mockImplementation(async (data: Record<string, unknown>) => {
      calls++
      if (calls <= 2) throw new Error('transient error')
      // 3rd attempt succeeds — write to store manually
      const store = getStore()
      Object.assign(store, data)
    })

    await saveEntry(makeEntry())
    expect(calls).toBe(3) // 2 failures + 1 success
  })

  it('throws on quota exceeded without retry', async () => {
    const mockSet = chrome.storage.local.set as ReturnType<typeof vi.fn>
    mockSet.mockImplementation(async () => {
      throw new Error('QUOTA_BYTES quota exceeded')
    })

    await expect(saveEntry(makeEntry())).rejects.toThrow('QUOTA_BYTES')
  })
})

// --- Guest Mode ---
// Note: These tests use seedStore() to set up guest state directly because
// the quota test above leaves chrome.storage.local.set mocked. The activateGuestMode()
// integration is tested separately in featureGate.test.ts and useGuest.test.ts.

describe('Guest Mode', () => {
  it('isGuestMode returns false when not in guest mode', async () => {
    expect(await isGuestMode()).toBe(false)
  })

  it('getGuestStartedAt returns null when not in guest mode', async () => {
    expect(await getGuestStartedAt()).toBeNull()
  })

  it('isGuestMode returns true when guestStartedAt is set', async () => {
    seedStore({ guestStartedAt: Date.now() })
    expect(await isGuestMode()).toBe(true)
  })

  it('getGuestStartedAt returns the timestamp', async () => {
    const now = Date.now()
    seedStore({ guestStartedAt: now })
    expect(await getGuestStartedAt()).toBe(now)
  })

  it('clearGuestMode removes the guest flag', async () => {
    seedStore({ guestStartedAt: Date.now() })
    expect(await isGuestMode()).toBe(true)

    await clearGuestMode()
    expect(await isGuestMode()).toBe(false)
    expect(await getGuestStartedAt()).toBeNull()
  })

  it('getGuestDaysRemaining returns 5 for fresh guest', async () => {
    seedStore({ guestStartedAt: Date.now() })
    const days = await getGuestDaysRemaining()
    expect(days).toBe(5)
  })

  it('getGuestDaysRemaining returns 0 for expired guest', async () => {
    const sixDaysAgo = Date.now() - 6 * 24 * 60 * 60 * 1000
    seedStore({ guestStartedAt: sixDaysAgo })

    const days = await getGuestDaysRemaining()
    expect(days).toBe(0)
  })

  it('getGuestDaysRemaining returns null when not in guest mode', async () => {
    expect(await getGuestDaysRemaining()).toBeNull()
  })

  it('getGuestDaysRemaining returns partial days correctly', async () => {
    // Started 3.5 days ago → should have 2 days remaining (ceil of 1.5)
    const threeAndHalfDaysAgo = Date.now() - 3.5 * 24 * 60 * 60 * 1000
    seedStore({ guestStartedAt: threeAndHalfDaysAgo })

    const days = await getGuestDaysRemaining()
    expect(days).toBe(2) // Math.ceil(1.5)
  })

  it('getGuestDaysRemaining returns 4 after 1 day', async () => {
    const oneDayAgo = Date.now() - 1 * 24 * 60 * 60 * 1000
    seedStore({ guestStartedAt: oneDayAgo })

    const days = await getGuestDaysRemaining()
    expect(days).toBe(4)
  })

  it('clearAllLocalData does NOT remove guestStartedAt', async () => {
    seedStore({ guestStartedAt: Date.now(), projects: [makeProject()] })
    await clearAllLocalData()

    // Guest flag should still be present
    expect(await isGuestMode()).toBe(true)
    // But projects should be cleared
    expect(await getProjects()).toEqual([])
  })
})
