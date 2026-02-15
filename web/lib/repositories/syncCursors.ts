import { createClient } from '@/lib/supabase/server'
import type { Database } from '@shared/types'

type SyncCursor = Database['public']['Tables']['sync_cursors']['Row']

export async function getUserSyncCursors(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('sync_cursors')
    .select('device_id, last_sync')
    .eq('user_id', userId)
    .order('last_sync', { ascending: false })
    .returns<Pick<SyncCursor, 'device_id' | 'last_sync'>[]>()
  return data ?? []
}
