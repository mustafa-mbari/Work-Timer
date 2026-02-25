/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase v2.95 type workaround for mutations */
import { supabase } from '@/auth/supabaseClient'
import { getSession, getCachedSubscription } from '@/auth/authState'
import { isPremiumSubscription } from '@/premium/featureGate'
import { pushUserStats } from './statsSync'
import { getQueue, dequeue } from './syncQueue'
import {
  localEntryToDb, localProjectToDb, localTagToDb, localSettingsToDb,
  dbEntryToLocal, dbProjectToLocal, dbTagToLocal, dbSettingsToLocal,
} from './conflictResolver'
import {
  getEntries, updateEntry, saveEntry,
  getProjects, updateProject, saveProject,
  getTags, saveTags,
  getSettings, updateSettings,
  setSuppressEnqueue,
} from '@/storage'
import type { SyncState, SyncDiagnostics } from '@/types'
import type { DbTimeEntry, DbProject, DbTag, DbUserSettings } from '@shared/types'

const SYNC_CURSOR_KEY = 'syncCursor'
const DEVICE_ID_KEY = 'deviceId'
const SYNC_STATE_KEY = 'syncState'

const BATCH_SIZE = 500

// Detect RLS "USING expression" errors caused by a user_id mismatch.
// This happens when a row already exists in Supabase under a different user_id
// (e.g. a previous account) and the current session's auth.uid() can't UPDATE it.
// These rows cannot be fixed from the client — they must be dequeued and skipped
// so that future syncs (for new data with the correct user_id) are not blocked.
function isRlsUsingError(error: { message: string }): boolean {
  return error.message.includes('(USING expression)')
}

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

    // Push projects FIRST — entries have a FK constraint on project_id,
    // so the referenced project must exist in Supabase before entries are pushed.

    // Push project upserts
    if (projectUpserts.length > 0) {
      const allProjects = await getProjects()
      const rows = projectUpserts
        .map(item => allProjects.find(p => p.id === item.recordId))
        .filter(Boolean)
        .map(p => localProjectToDb(p!, session.userId))
      if (rows.length > 0) {
        const { error } = await supabase.from('projects').upsert(rows as any)
        if (error) {
          if (isRlsUsingError(error)) {
            // Rows exist in Supabase under a different user_id — cannot update via RLS.
            // Dequeue and skip so future syncs are not permanently blocked.
            console.warn('[work-timer] Projects upsert skipped (user_id mismatch in Supabase):', error.message)
          } else {
            throw new Error(`Sync push failed (projects upsert): ${error.message}`)
          }
        }
      }
    }

    // Push project deletes (soft delete)
    if (projectDeletes.length > 0) {
      const now = new Date().toISOString()
      const { error } = await (supabase.from('projects') as any)
        .update({ deleted_at: now, updated_at: now })
        .in('id', projectDeletes.map(item => item.recordId))
        .eq('user_id', session.userId)
      if (error) throw new Error(`Sync push failed (projects delete): ${error.message}`)
    }

    // Dequeue projects immediately after successful push
    const projectIds = [...projectUpserts, ...projectDeletes].map(item => item.id)
    if (projectIds.length > 0) await dequeue(projectIds)

    // Push time entry upserts (after projects, to satisfy FK constraint)
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
        if (error) {
          if (isRlsUsingError(error)) {
            console.warn('[work-timer] Entries upsert skipped (user_id mismatch in Supabase):', error.message)
          } else {
            throw new Error(`Sync push failed (entries upsert): ${error.message}`)
          }
        }
      }
    }

    // Push time entry deletes (soft delete)
    if (entryDeletes.length > 0) {
      const now = new Date().toISOString()
      const { error } = await (supabase.from('time_entries') as any)
        .update({ deleted_at: now, updated_at: now })
        .in('id', entryDeletes.map(item => item.recordId))
        .eq('user_id', session.userId)
      if (error) throw new Error(`Sync push failed (entries delete): ${error.message}`)
    }

    // Dequeue entries immediately after successful push
    const entryIds = [...entryUpserts, ...entryDeletes].map(item => item.id)
    if (entryIds.length > 0) await dequeue(entryIds)

    // Push tag upserts — only push tags that are in the queue
    if (tagUpserts.length > 0) {
      const allTags = await getTags()
      const queuedIds = new Set(tagUpserts.map(item => item.recordId))
      const rows = allTags
        .filter(tag => queuedIds.has(tag.id))
        .map(tag => localTagToDb(tag, session.userId))
      if (rows.length > 0) {
        const { error } = await supabase.from('tags').upsert(rows as any)
        if (error) {
          // RLS errors can happen when switching accounts — tag IDs from a
          // previous account still exist locally. Log and continue instead
          // of failing the entire sync batch.
          console.warn('[work-timer] Tags sync skipped (RLS):', error.message)
        }
      }
    }

    // Dequeue tags after push
    const tagIds = tagUpserts.map(item => item.id)
    if (tagIds.length > 0) await dequeue(tagIds)

    // Push settings upserts
    const settingsUpserts = batch.filter(item => item.table === 'user_settings' && item.action === 'upsert')
    if (settingsUpserts.length > 0) {
      const settings = await getSettings()
      const row = localSettingsToDb(settings, session.userId)
      const { error } = await supabase.from('user_settings').upsert(row as any)
      if (error) console.warn('[work-timer] Settings sync push failed:', error.message)
    }

    // Dequeue settings after push
    const settingsIds = settingsUpserts.map(item => item.id)
    if (settingsIds.length > 0) await dequeue(settingsIds)
  }
}

// --- Pull (Supabase → local) ---

export async function pullDelta(): Promise<void> {
  const session = await getSession()
  if (!session) return

  const lastSync = await getLastSync()
  const since = lastSync ?? new Date(0).toISOString()
  const now = new Date().toISOString()

  // Quick check: skip full pull if nothing changed since last sync
  if (lastSync) {
    const { data: hasChanges } = await (supabase.rpc as Function)(
      'has_changes_since',
      { p_user_id: session.userId, p_since: since }
    )
    if (hasChanges === false) {
      // Update cursor timestamp even when skipping — keeps it fresh
      await setLastSync(now)
      return
    }
  }

  // Pull time entries (only columns needed by dbEntryToLocal + deleted_at for soft-delete check)
  const { data: remoteEntries } = await supabase
    .from('time_entries')
    .select('id, date, start_time, end_time, duration, project_id, task_id, description, type, tags, link, deleted_at')
    .eq('user_id', session.userId)
    .gt('updated_at', since)
    .range(0, 49999)

  // Build set of record IDs with pending local changes — skip overwriting these
  const queue = await getQueue()
  const pendingIds = new Set(queue.map(item => item.recordId))

  // Suppress enqueue during pull — remote changes must not loop back to the queue
  setSuppressEnqueue(true)
  try {
    if (remoteEntries) {
      for (const remote of remoteEntries as DbTimeEntry[]) {
        // Skip if local has pending changes for this entry — local wins
        if (pendingIds.has(remote.id)) continue

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

    // Pull projects (only columns needed by dbProjectToLocal + deleted_at)
    const { data: remoteProjects } = await supabase
      .from('projects')
      .select('id, name, color, target_hours, archived, created_at, is_default, default_tag_id, sort_order, deleted_at')
      .eq('user_id', session.userId)
      .gt('updated_at', since)
      .range(0, 49999)

    if (remoteProjects) {
      const localProjects = await getProjects()
      for (const remote of remoteProjects as DbProject[]) {
        // Skip if local has pending changes for this project — local wins
        if (pendingIds.has(remote.id)) continue

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

    // Pull tags (only columns needed by dbTagToLocal + deleted_at)
    const { data: remoteTags } = await supabase
      .from('tags')
      .select('id, name, color, is_default, sort_order, deleted_at')
      .eq('user_id', session.userId)
      .gt('updated_at', since)
      .range(0, 49999)

    if (remoteTags) {
      const localTags = await getTags()
      const mergedTags = [...localTags]
      for (const remote of remoteTags as DbTag[]) {
        // Skip if local has pending changes for this tag — local wins
        if (pendingIds.has(remote.id)) continue

        if (remote.deleted_at) {
          const idx = mergedTags.findIndex(t => t.id === remote.id)
          if (idx !== -1) mergedTags.splice(idx, 1)
        } else {
          const localTag = dbTagToLocal(remote)
          const existing = mergedTags.find(t => t.id === localTag.id)
          if (!existing) mergedTags.push(localTag)
          else Object.assign(existing, localTag)
        }
      }
      await saveTags(mergedTags)
    }

    // Pull settings (single row — always fetch latest unless local has pending changes)
    if (!pendingIds.has('self')) {
      const { data: remoteSettings } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', session.userId)
        .single()
      if (remoteSettings) {
        const localSettings = dbSettingsToLocal(remoteSettings as DbUserSettings)
        await updateSettings(localSettings)
      }
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
    void pushUserStats()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed'
    await setSyncState({ status: 'error', errorMessage: message })
    console.error('[work-timer] Sync error:', err)
  }
}

// --- Sync Diagnostics ---

export async function diagnoseSyncState(): Promise<SyncDiagnostics> {
  const now = Math.floor(Date.now() / 1000)
  const [session, sub, queue, syncState] = await Promise.all([
    getSession(),
    getCachedSubscription(),
    getQueue(),
    getSyncState(),
  ])
  return {
    hasSession: !!session,
    sessionEmail: session?.email ?? null,
    sessionUserId: session?.userId ?? null,
    tokenExpiresAt: session?.expiresAt ?? null,
    tokenExpiresInSeconds: session ? (session.expiresAt - now) : null,
    isPremium: isPremiumSubscription(sub),
    subscriptionPlan: sub?.plan ?? null,
    subscriptionStatus: sub?.status ?? null,
    queueLength: queue.length,
    lastSyncAt: syncState.lastSyncAt,
    syncStatus: syncState.status,
    syncErrorMessage: syncState.errorMessage,
    isOnline: navigator.onLine,
  }
}

// --- Initial Upload (first login with existing local data) ---

export async function uploadAllLocalData(): Promise<void> {
  const session = await getSession()
  if (!session) return

  const errors: string[] = []

  // Upload all projects
  const projects = await getProjects()
  if (projects.length > 0) {
    const rows = projects.map(p => localProjectToDb(p, session.userId))
    const { error } = await supabase.from('projects').upsert(rows as any)
    if (error) {
      if (isRlsUsingError(error)) {
        console.warn('[work-timer] Projects upload skipped (user_id mismatch in Supabase):', error.message)
      } else {
        errors.push(`Projects upload failed: ${error.message}`)
      }
    }
  }

  // Upload all time entries (scan all entry_* keys)
  const allStorage = await chrome.storage.local.get(null)
  const entryBatches: Partial<DbTimeEntry>[][] = [[]]
  let totalEntries = 0
  for (const [key, value] of Object.entries(allStorage)) {
    if (!key.startsWith('entries_')) continue
    const entries = value as Array<Parameters<typeof localEntryToDb>[0]>
    for (const entry of entries) {
      const lastBatch = entryBatches[entryBatches.length - 1]!
      lastBatch.push(localEntryToDb(entry, session.userId))
      totalEntries++
      if (lastBatch.length >= BATCH_SIZE) {
        entryBatches.push([])
      }
    }
  }
  let uploadedEntries = 0
  for (const batch of entryBatches) {
    if (batch.length > 0) {
      let { error } = await supabase.from('time_entries').upsert(batch as any)
      // Retry once with backoff on failure (non-RLS errors only)
      if (error && !isRlsUsingError(error)) {
        await new Promise(r => setTimeout(r, 1000))
        ;({ error } = await supabase.from('time_entries').upsert(batch as any))
      }
      if (error) {
        if (isRlsUsingError(error)) {
          console.warn('[work-timer] Entries batch skipped (user_id mismatch in Supabase):', error.message)
        } else {
          errors.push(`Entries batch upload failed (${batch.length} entries): ${error.message}`)
        }
      } else {
        uploadedEntries += batch.length
      }
    }
  }

  // Upload all tags
  const tags = await getTags()
  if (tags.length > 0) {
    const rows = tags.map(tag => localTagToDb(tag, session.userId))
    const { error } = await supabase.from('tags').upsert(rows as any)
    if (error) {
      if (isRlsUsingError(error)) {
        console.warn('[work-timer] Tags upload skipped (user_id mismatch in Supabase):', error.message)
      } else {
        errors.push(`Tags upload failed: ${error.message}`)
      }
    }
  }

  // Upload settings
  const settings = await getSettings()
  const settingsRow = localSettingsToDb(settings, session.userId)
  const { error: settingsError } = await supabase.from('user_settings').upsert(settingsRow as any)
  if (settingsError) {
    if (isRlsUsingError(settingsError)) {
      console.warn('[work-timer] Settings upload skipped (user_id mismatch in Supabase):', settingsError.message)
    } else {
      errors.push(`Settings upload failed: ${settingsError.message}`)
    }
  }

  console.log(`[work-timer] Upload complete: ${uploadedEntries}/${totalEntries} entries, ${projects.length} projects, ${tags.length} tags, settings`)

  if (errors.length > 0) {
    console.error('[work-timer] Upload errors:', errors)
    throw new Error(`Upload partially failed: ${errors.join('; ')}`)
  }
}
