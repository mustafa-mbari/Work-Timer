import { supabase } from '@/auth/supabaseClient'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { dbEntryToLocal, dbProjectToLocal, dbTagToLocal, dbSettingsToLocal } from './conflictResolver'
import { getQueue } from './syncQueue'
import {
  getEntries, saveEntry, updateEntry,
  getProjects, saveProject, updateProject,
  getTags, saveTags,
  updateSettings,
  setSuppressEnqueue,
  getSyncPreferences,
} from '@/storage'
import type { DbTimeEntry, DbProject, DbTag, DbUserSettings } from '@shared/types'

let channel: RealtimeChannel | null = null

type ChangePayload<T> = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: T
  old: Partial<T>
}

async function handleTimeEntryChange(payload: ChangePayload<DbTimeEntry>): Promise<void> {
  const remote = payload.new
  if (!remote?.id) return

  const syncPrefs = await getSyncPreferences()
  if (!syncPrefs.entries) return

  // Skip if local has a pending change for this record — local wins
  const queue = await getQueue()
  if (queue.some(item => item.recordId === remote.id)) return

  setSuppressEnqueue(true)
  try {
    if (remote.deleted_at) {
      // Soft-deleted: remove from local storage
      const local = await getEntries(remote.date)
      const filtered = local.filter(e => e.id !== remote.id)
      if (filtered.length !== local.length) {
        await chrome.storage.local.set({ [`entries_${remote.date}`]: filtered })
      }
    } else {
      const localEntry = dbEntryToLocal(remote)
      const existing = (await getEntries(localEntry.date)).find(e => e.id === localEntry.id)
      if (existing) {
        await updateEntry(localEntry)
      } else {
        await saveEntry(localEntry)
      }
    }
  } finally {
    setSuppressEnqueue(false)
  }

  // Notify popup to re-fetch
  chrome.runtime.sendMessage({ action: 'SYNC_REMOTE_UPDATE', table: 'time_entries' }).catch(() => {})
}

async function handleProjectChange(payload: ChangePayload<DbProject>): Promise<void> {
  const remote = payload.new
  if (!remote?.id) return

  const syncPrefs = await getSyncPreferences()
  if (!syncPrefs.projects) return

  // Skip if local has a pending change for this record — local wins
  const queue = await getQueue()
  if (queue.some(item => item.recordId === remote.id)) return

  setSuppressEnqueue(true)
  try {
    if (remote.deleted_at) {
      // Project deleted on another device — archive locally
      const localProjects = await getProjects()
      const existing = localProjects.find(p => p.id === remote.id)
      if (existing && !existing.archived) {
        await updateProject({ ...existing, archived: true })
      }
    } else {
      const localProject = dbProjectToLocal(remote)
      const existing = (await getProjects()).find(p => p.id === localProject.id)
      if (existing) {
        await updateProject(localProject)
      } else {
        await saveProject(localProject)
      }
    }
  } finally {
    setSuppressEnqueue(false)
  }

  // Notify popup to re-fetch
  chrome.runtime.sendMessage({ action: 'SYNC_REMOTE_UPDATE', table: 'projects' }).catch(() => {})
}

async function handleTagChange(payload: ChangePayload<DbTag>): Promise<void> {
  const remote = payload.new
  if (!remote?.id) return

  const syncPrefs = await getSyncPreferences()
  if (!syncPrefs.tags) return

  // Skip if local has a pending change for this record — local wins
  const queue = await getQueue()
  if (queue.some(item => item.recordId === remote.id)) return

  setSuppressEnqueue(true)
  try {
    const localTags = await getTags()
    if (remote.deleted_at) {
      const filtered = localTags.filter(t => t.id !== remote.id)
      if (filtered.length !== localTags.length) {
        await saveTags(filtered)
      }
    } else {
      const localTag = dbTagToLocal(remote)
      const existing = localTags.find(t => t.id === localTag.id)
      if (existing) {
        existing.name = localTag.name
        existing.color = localTag.color
        await saveTags(localTags)
      } else {
        await saveTags([...localTags, localTag])
      }
    }
  } finally {
    setSuppressEnqueue(false)
  }

  chrome.runtime.sendMessage({ action: 'SYNC_REMOTE_UPDATE', table: 'tags' }).catch(() => {})
}

async function handleSettingsChange(payload: ChangePayload<DbUserSettings>): Promise<void> {
  const remote = payload.new
  if (!remote?.user_id) return

  // Skip if local has pending settings changes
  const queue = await getQueue()
  if (queue.some(item => item.table === 'user_settings')) return

  setSuppressEnqueue(true)
  try {
    const localSettings = dbSettingsToLocal(remote)
    await updateSettings(localSettings)
  } finally {
    setSuppressEnqueue(false)
  }

  chrome.runtime.sendMessage({ action: 'SYNC_REMOTE_UPDATE', table: 'user_settings' }).catch(() => {})
}

export function setupRealtime(userId: string): void {
  teardownRealtime()

  // Single multiplexed channel for all tables — uses 1 connection instead of 4
  channel = supabase
    .channel(`sync:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'time_entries', filter: `user_id=eq.${userId}` },
      (payload) => { void handleTimeEntryChange(payload as unknown as ChangePayload<DbTimeEntry>) }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'projects', filter: `user_id=eq.${userId}` },
      (payload) => { void handleProjectChange(payload as unknown as ChangePayload<DbProject>) }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tags', filter: `user_id=eq.${userId}` },
      (payload) => { void handleTagChange(payload as unknown as ChangePayload<DbTag>) }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'user_settings', filter: `user_id=eq.${userId}` },
      (payload) => { void handleSettingsChange(payload as unknown as ChangePayload<DbUserSettings>) }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[work-timer] Realtime: subscribed to all tables (single channel)')
      }
    })
}

export function teardownRealtime(): void {
  if (channel) {
    supabase.removeChannel(channel).catch(() => {})
    channel = null
  }
}
