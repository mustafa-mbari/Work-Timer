import { createServiceClient } from '@/lib/supabase/server'
import type { DbEmailLog } from '@/lib/shared/types'

export async function getEmailLogs(
  limit = 50,
  offset = 0,
  typeFilter?: string
): Promise<{ logs: DbEmailLog[]; total: number }> {
  const supabase = await createServiceClient()

  let query = (supabase.from('email_logs') as any)
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
    (supabase.from('email_logs') as any).select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
    (supabase.from('email_logs') as any).select('id', { count: 'exact', head: true }).gte('created_at', weekStart),
    (supabase.from('email_logs') as any).select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
    (supabase.from('email_logs') as any).select('id', { count: 'exact', head: true }).eq('status', 'failed'),
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
  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await (supabase.from('email_logs') as any)
    .select('created_at, status')
    .gte('created_at', since.toISOString())
    .range(0, 49999)

  if (error || !data) return []

  const map = new Map<string, { sent: number; failed: number }>()
  for (const row of data as Array<{ created_at: string; status: string }>) {
    const d = new Date(row.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (!map.has(key)) map.set(key, { sent: 0, failed: 0 })
    const bucket = map.get(key)!
    if (row.status === 'sent') bucket.sent++
    else bucket.failed++
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

  const { data, error } = await (supabase.from('email_logs') as any)
    .select('type')
    .range(0, 49999)

  if (error || !data) return []

  const map = new Map<string, number>()
  for (const row of data as Array<{ type: string }>) {
    map.set(row.type, (map.get(row.type) || 0) + 1)
  }
  return Array.from(map.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
}

export async function getRecentFailures(limit = 5): Promise<DbEmailLog[]> {
  const supabase = await createServiceClient()

  const { data, error } = await (supabase.from('email_logs') as any)
    .select('*')
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return []
  return (data || []) as DbEmailLog[]
}
