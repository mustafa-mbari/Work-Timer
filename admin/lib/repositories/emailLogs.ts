import { createServiceClient } from '@/lib/supabase/server'
import type { DbEmailLog } from '@/lib/shared/types'

export async function getEmailLogs(
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
    console.error('[emailLogs] getEmailLogs error:', error)
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

export async function getDailyEmailCounts(
  days = 30
): Promise<Array<{ date: string; sent: number; failed: number }>> {
  const supabase = await createServiceClient()

  const { data, error } = await supabase.rpc('get_daily_email_counts', { p_days: days })

  if (error || !data) return []

  const map = new Map<string, { sent: number; failed: number }>()
  for (const row of data as Array<{ day: string; sent: number; failed: number }>) {
    // RPC returns DATE type as 'YYYY-MM-DD' string
    map.set(row.day, { sent: Number(row.sent), failed: Number(row.failed) })
  }

  // Fill all days (including zero-count) for a continuous chart
  const result: Array<{ date: string; sent: number; failed: number }> = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const bucket = map.get(key) || { sent: 0, failed: 0 }
    result.push({ date: key, ...bucket })
  }
  return result
}

export async function getEmailCountByType(): Promise<Array<{ type: string; count: number }>> {
  const supabase = await createServiceClient()

  const { data, error } = await supabase.rpc('get_email_count_by_type')

  if (error || !data) return []

  return (data as Array<{ type: string; count: number }>).map(row => ({
    type: row.type,
    count: Number(row.count),
  }))
}

export async function getRecentFailures(limit = 5): Promise<DbEmailLog[]> {
  const supabase = await createServiceClient()

  const { data, error } = await supabase.from('email_logs')
    .select('*')
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return []
  return (data || []) as DbEmailLog[]
}
