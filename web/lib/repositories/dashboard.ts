import { createClient } from '@/lib/supabase/server'
import type { DbSubscription, DbSyncCursor, DbTimeEntry, DbProject, DbTag, DbUserStats, DbUserSettings } from '@/lib/shared/types'

export interface DashboardBootstrapData {
  subscription: DbSubscription | null
  cursors: DbSyncCursor[]
  recent_entries: DbTimeEntry[]
  projects: DbProject[]
  tags: DbTag[]
  stats: DbUserStats | null
  settings: DbUserSettings | null
  week_entries: DbTimeEntry[]
}

export async function getDashboardBootstrapData(userId: string, weekFrom: string, weekTo: string): Promise<DashboardBootstrapData> {
  const supabase = await createClient()
  
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  const { data, error } = await (supabase.rpc as Function)('get_dashboard_bootstrap_data', {
    p_user_id: userId,
    p_week_from: weekFrom,
    p_week_to: weekTo
  })

  if (error) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    throw new Error(`get_dashboard_bootstrap_data failed: ${(error as any).message}`)
  }

  return data as DashboardBootstrapData
}
