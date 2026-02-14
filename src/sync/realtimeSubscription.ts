import { supabase } from '@/auth/supabaseClient'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { dbEntryToLocal, dbProjectToLocal } from './conflictResolver'
import {
  getEntries, saveEntry, updateEntry,
  getProjects, saveProject, updateProject,
  setSuppressEnqueue,
} from '@/storage'
import type { DbTimeEntry, DbProject } from '@shared/types'

let channels: RealtimeChannel[] = []

type ChangePayload<T> = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: T
  old: Partial<T>
}

async function handleTimeEntryChange(payload: ChangePayload<DbTimeEntry>): Promise<void> {
  const remote = payload.new
  if (!remote?.id) return

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

export function setupRealtime(userId: string): void {
  teardownRealtime()

  // Subscribe to time_entries changes for this user
  const entriesChannel = supabase
    .channel(`time_entries:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'time_entries', filter: `user_id=eq.${userId}` },
      (payload) => { void handleTimeEntryChange(payload as unknown as ChangePayload<DbTimeEntry>) }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[work-timer] Realtime: subscribed to time_entries')
      }
    })

  // Subscribe to projects changes for this user
  const projectsChannel = supabase
    .channel(`projects:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'projects', filter: `user_id=eq.${userId}` },
      (payload) => { void handleProjectChange(payload as unknown as ChangePayload<DbProject>) }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[work-timer] Realtime: subscribed to projects')
      }
    })

  channels = [entriesChannel, projectsChannel]
}

export function teardownRealtime(): void {
  for (const channel of channels) {
    supabase.removeChannel(channel).catch(() => {})
  }
  channels = []
}
