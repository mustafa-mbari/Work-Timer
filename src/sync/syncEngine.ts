import { supabase } from '@/auth/supabaseClient'
import { getSession } from '@/auth/authState'
import { isCurrentUserPremium } from '@/premium/featureGate'
import { getQueue, dequeue } from './syncQueue'
import {
  localEntryToDb, localProjectToDb,
  dbEntryToLocal, dbProjectToLocal, dbTagToLocal,
} from './conflictResolver'
import {
  getEntries, updateEntry, saveEntry,
  getProjects, updateProject, saveProject,
  getTags, saveTags,
  setSuppressEnqueue,
} from '@/storage'
import type { SyncState } from '@/types'
import type { DbTimeEntry, DbProject, DbTag } from '@shared/types'

const SYNC_CURSOR_KEY = 'syncCursor'
const DEVICE_ID_KEY = 'deviceId'
const SYNC_STATE_KEY = 'syncState'

const BATCH_SIZE = 500

// --- Device ID ---

async function getDeviceId(): Promise<string> {
  const result = await chrome.storage.local.get(DEVICE_ID_KEY)
  if (result[DEVICE_ID_KEY]) return result[DEVICE_ID_KEY] as string
  // Generate a stable device ID for this browser profile
  const id = crypto.randomUUID()
  await chrome.storage.local.set({ [DEVICE_ID_KEY]: id })
  return id
}

// --- Sync State ---

export async function getSyncState(): Promise<SyncState> {
  const result = await chrome.storage.local.get(SYNC_STATE_KEY)
  return (result[SYNC_STATE_KEY] as SyncState | undefined) ?? {
    status: 'idle',
    lastSyncAt: null,
    pendingCount: 0,
    errorMessage: null,
  }
}

async function setSyncState(state: Partial<SyncState>): Promise<void> {
  const current = await getSyncState()
  await chrome.storage.local.set({ [SYNC_STATE_KEY]: { ...current, ...state } })
}

// --- Cursor ---

async function getLastSync(): Promise<string | null> {
  const result = await chrome.storage.local.get(SYNC_CURSOR_KEY)
  return (result[SYNC_CURSOR_KEY] as string | undefined) ?? null
}

async function setLastSync(isoTimestamp: string): Promise<void> {
  await chrome.storage.local.set({ [SYNC_CURSOR_KEY]: isoTimestamp })
}

// --- Push (local → Supabase) ---

export async function pushQueue(): Promise<void> {
  const session = await getSession()
  if (!session) return

  const queue = await getQueue()
  if (queue.length === 0) return

  // Process in batches
  for (let i = 0; i < queue.length; i += BATCH_SIZE) {
    const batch = queue.slice(i, i + BATCH_SIZE)

    const entryUpserts = batch
      .filter(item => item.table === 'time_entries' && item.action === 'upsert')
    const entryDeletes = batch
      .filter(item => item.table === 'time_entries' && item.action === 'delete')
    const projectUpserts = batch
      .filter(item => item.table === 'projects' && item.action === 'upsert')
    const projectDeletes = batch
      .filter(item => item.table === 'projects' && item.action === 'delete')
    const tagUpserts = batch
      .filter(item => item.table === 'tags' && item.action === 'upsert')

    // Push time entry upserts
    if (entryUpserts.length > 0) {
      const rows: Partial<DbTimeEntry>[] = []
      for (const item of entryUpserts) {
        if (!item.date) continue // skip items without date (old queue entries)
        const entries = await getEntries(item.date)
        const found = entries.find(e => e.id === item.recordId)
        if (found) rows.push(localEntryToDb(found, session.userId))
      }
      if (rows.length > 0) {
        const { error } = await supabase.from('time_entries').upsert(rows as any)
        if (error) throw new Error(`Sync push failed (entries upsert): ${error.message}`)
      }
    }

    // Push time entry deletes (soft delete)
    if (entryDeletes.length > 0) {
      const { error } = await (supabase.from('time_entries') as any)
        .update({ deleted_at: new Date().toISOString() })
        .in('id', entryDeletes.map(item => item.recordId))
        .eq('user_id', session.userId)
      if (error) throw new Error(`Sync push failed (entries delete): ${error.message}`)
    }

    // Push project upserts
    if (projectUpserts.length > 0) {
      const allProjects = await getProjects()
      const rows = projectUpserts
        .map(item => allProjects.find(p => p.id === item.recordId))
        .filter(Boolean)
        .map(p => localProjectToDb(p!, session.userId))
      if (rows.length > 0) {
        const { error } = await supabase.from('projects').upsert(rows as any)
        if (error) throw new Error(`Sync push failed (projects upsert): ${error.message}`)
      }
    }

    // Push project deletes (soft delete)
    if (projectDeletes.length > 0) {
      const { error } = await (supabase.from('projects') as any)
        .update({ deleted_at: new Date().toISOString() })
        .in('id', projectDeletes.map(item => item.recordId))
        .eq('user_id', session.userId)
      if (error) throw new Error(`Sync push failed (projects delete): ${error.message}`)
    }

    // Push tag upserts
    if (tagUpserts.length > 0) {
      const allTags = await getTags()
      const rows = allTags.map(tag => ({
        id: tag.id,
        user_id: session.userId,
        name: tag.name,
        updated_at: new Date().toISOString(),
      }))
      if (rows.length > 0) {
        const { error } = await supabase.from('tags').upsert(rows as any)
        if (error) throw new Error(`Sync push failed (tags upsert): ${error.message}`)
      }
    }

    await dequeue(batch.map(item => item.id))
  }
}

// --- Pull (Supabase → local) ---

export async function pullDelta(): Promise<void> {
  const session = await getSession()
  if (!session) return

  const lastSync = await getLastSync()
  const since = lastSync ?? new Date(0).toISOString()
  const now = new Date().toISOString()

  // Pull time entries
  const { data: remoteEntries } = await supabase
    .from('time_entries')
    .select('*')
    .eq('user_id', session.userId)
    .gt('updated_at', since)

  // Suppress enqueue during pull — remote changes must not loop back to the queue
  setSuppressEnqueue(true)
  try {
    if (remoteEntries) {
      for (const remote of remoteEntries as DbTimeEntry[]) {
        if (remote.deleted_at) {
          // Soft-deleted remotely — remove from local
          const local = await getEntries(remote.date)
          const filtered = local.filter(e => e.id !== remote.id)
          if (filtered.length !== local.length) {
            await chrome.storage.local.set({ [`entries_${remote.date}`]: filtered })
          }
        } else {
          // Upsert locally
          const localEntry = dbEntryToLocal(remote)
          const existing = (await getEntries(localEntry.date)).find(e => e.id === localEntry.id)
          if (existing) {
            await updateEntry(localEntry)
          } else {
            await saveEntry(localEntry)
          }
        }
      }
    }

    // Pull projects
    const { data: remoteProjects } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', session.userId)
      .gt('updated_at', since)

    if (remoteProjects) {
      const localProjects = await getProjects()
      for (const remote of remoteProjects as DbProject[]) {
        if (remote.deleted_at) {
          // Project deleted on another device — archive locally
          const existing = localProjects.find(p => p.id === remote.id)
          if (existing && !existing.archived) {
            await updateProject({ ...existing, archived: true })
          }
          continue
        }
        const localProject = dbProjectToLocal(remote)
        const existing = localProjects.find(p => p.id === localProject.id)
        if (existing) {
          await updateProject(localProject)
        } else {
          await saveProject(localProject)
        }
      }
    }

    // Pull tags
    const { data: remoteTags } = await supabase
      .from('tags')
      .select('*')
      .eq('user_id', session.userId)
      .gt('updated_at', since)

    if (remoteTags) {
      const localTags = await getTags()
      const mergedTags = [...localTags]
      for (const remote of remoteTags as DbTag[]) {
        if (remote.deleted_at) {
          const idx = mergedTags.findIndex(t => t.id === remote.id)
          if (idx !== -1) mergedTags.splice(idx, 1)
        } else {
          const localTag = dbTagToLocal(remote)
          const existing = mergedTags.find(t => t.id === localTag.id)
          if (!existing) mergedTags.push(localTag)
          else existing.name = localTag.name
        }
      }
      await saveTags(mergedTags)
    }
  } finally {
    setSuppressEnqueue(false)
  }

  await setLastSync(now)

  // Update cursor in Supabase
  const deviceId = await getDeviceId()
  await supabase.from('sync_cursors').upsert({
    user_id: session.userId,
    device_id: deviceId,
    last_sync: now,
  } as any)
}

// --- Full Sync ---

export async function syncAll(): Promise<void> {
  const premium = await isCurrentUserPremium()
  if (!premium) return

  const session = await getSession()
  if (!session) return

  if (!navigator.onLine) {
    await setSyncState({ status: 'offline' })
    return
  }

  try {
    await setSyncState({ status: 'syncing', errorMessage: null })
    await pushQueue()
    await pullDelta()
    await setSyncState({
      status: 'idle',
      lastSyncAt: new Date().toISOString(),
      pendingCount: 0,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed'
    await setSyncState({ status: 'error', errorMessage: message })
    console.error('[work-timer] Sync error:', err)
  }
}

// --- Initial Upload (first login with existing local data) ---

export async function uploadAllLocalData(): Promise<void> {
  const session = await getSession()
  if (!session) return

  // Upload all projects
  const projects = await getProjects()
  if (projects.length > 0) {
    const rows = projects.map(p => localProjectToDb(p, session.userId))
    await supabase.from('projects').upsert(rows as any)
  }

  // Upload all time entries (scan all entry_* keys)
  const allStorage = await chrome.storage.local.get(null)
  const entryBatches: Partial<DbTimeEntry>[][] = [[]]
  for (const [key, value] of Object.entries(allStorage)) {
    if (!key.startsWith('entries_')) continue
    const entries = value as Array<Parameters<typeof localEntryToDb>[0]>
    for (const entry of entries) {
      const lastBatch = entryBatches[entryBatches.length - 1]!
      lastBatch.push(localEntryToDb(entry, session.userId))
      if (lastBatch.length >= BATCH_SIZE) {
        entryBatches.push([])
      }
    }
  }
  for (const batch of entryBatches) {
    if (batch.length > 0) {
      await supabase.from('time_entries').upsert(batch as any)
    }
  }

  // Upload all tags
  const tags = await getTags()
  if (tags.length > 0) {
    const rows = tags.map(tag => ({
      id: tag.id,
      user_id: session.userId,
      name: tag.name,
      updated_at: new Date().toISOString(),
    }))
    await supabase.from('tags').upsert(rows as any)
  }
}
