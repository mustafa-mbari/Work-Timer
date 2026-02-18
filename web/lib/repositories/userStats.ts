import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/shared/types'

type UserStats = Database['public']['Tables']['user_stats']['Row']

export async function getUserStats(userId: string): Promise<UserStats | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .single<UserStats>()
  return data
}
