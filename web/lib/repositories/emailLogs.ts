import { createServiceClient } from '@/lib/supabase/server'
import type { DbEmailLog } from '@/lib/shared/types'

export async function getRecentLogs(
  limit = 50,
  offset = 0,
  typeFilter?: string
): Promise<{ logs: DbEmailLog[]; total: number }> {
  const supabase = await createServiceClient()

  let query = supabase.from('email_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (typeFilter) {
    query = query.eq('type', typeFilter)
  }

  const { data, count, error } = await query

  if (error) {
    console.error('[emailLogs] getRecentLogs error:', error)
    return { logs: [], total: 0 }
  }

  return { logs: (data || []) as DbEmailLog[], total: count || 0 }
}

export async function getEmailStats(): Promise<{
  today: number
  week: number
  month: number
  failed: number
}> {
  const supabase = await createServiceClient()

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30).toISOString()

  const [todayRes, weekRes, monthRes, failedRes] = await Promise.all([
    supabase.from('email_logs').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
    supabase.from('email_logs').select('id', { count: 'exact', head: true }).gte('created_at', weekStart),
    supabase.from('email_logs').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
    supabase.from('email_logs').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
  ])

  return {
    today: todayRes.count || 0,
    week: weekRes.count || 0,
    month: monthRes.count || 0,
    failed: failedRes.count || 0,
  }
}
