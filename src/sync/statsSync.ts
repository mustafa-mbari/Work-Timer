import { supabase } from '@/auth/supabaseClient'
import { getSession } from '@/auth/authState'
import { getProjects } from '@/storage'

/**
 * Lightweight stats push for ALL authenticated users (free and premium).
 * Computes aggregate numbers from local storage and upserts a single row
 * into the `user_stats` table. Does NOT use the sync queue or full sync engine.
 */
export async function pushUserStats(): Promise<void> {
  const session = await getSession()
  if (!session) return
  if (!navigator.onLine) return

  // Compute aggregates from local storage
  const allStorage = await chrome.storage.local.get(null)
  let totalEntries = 0
  let totalDuration = 0
  const activeDates = new Set<string>()

  for (const [key, value] of Object.entries(allStorage)) {
    if (!key.startsWith('entries_')) continue
    const entries = value as Array<{ duration?: number; date?: string }>
    for (const entry of entries) {
      totalEntries++
      totalDuration += entry.duration || 0
      if (entry.date) activeDates.add(entry.date)
    }
  }

  const projects = await getProjects()
  const totalHours = Math.round((totalDuration / 3_600_000) * 10) / 10

  // Find most recent date
  const sortedDates = [...activeDates].sort()
  const lastActiveDate = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase mutation type workaround
  await (supabase.from('user_stats') as any).upsert({
    user_id: session.userId,
    total_hours: totalHours,
    total_entries: totalEntries,
    total_projects: projects.length,
    active_days: activeDates.size,
    last_active_date: lastActiveDate,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })
}
