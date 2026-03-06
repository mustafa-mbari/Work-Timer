import { createServiceClient } from '@/lib/supabase/server'

export interface WebhookLog {
  id: number
  event_id: string
  event_type: string
  status: string
  error_message: string | null
  user_id: string | null
  duration_ms: number | null
  created_at: string
}

export interface WebhookStats {
  total_24h: number
  success_24h: number
  error_24h: number
  signature_failures_24h: number
  total_7d: number
  success_rate_7d: number
}

export async function getWebhookStats(): Promise<WebhookStats> {
  const supabase = await createServiceClient()
  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // 24h counts by status
  const { data: day } = await supabase
    .from('webhook_logs')
    .select('status', { count: 'exact', head: false })
    .gte('created_at', oneDayAgo)
    .returns<{ status: string }[]>()

  const dayLogs = day ?? []
  const total_24h = dayLogs.length
  const success_24h = dayLogs.filter(l => l.status === 'success').length
  const error_24h = dayLogs.filter(l => l.status === 'error').length
  const signature_failures_24h = dayLogs.filter(l => l.status === 'signature_failed').length

  // 7d success rate
  const { count: total7d } = await supabase
    .from('webhook_logs')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', sevenDaysAgo)

  const { count: success7d } = await supabase
    .from('webhook_logs')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', sevenDaysAgo)
    .eq('status', 'success')

  const t7 = total7d ?? 0
  const s7 = success7d ?? 0
  const success_rate_7d = t7 > 0 ? Math.round((s7 / t7) * 100) : 100

  return { total_24h, success_24h, error_24h, signature_failures_24h, total_7d: t7, success_rate_7d }
}

export async function getRecentWebhookLogs(
  page = 1,
  pageSize = 25,
  statusFilter?: string
): Promise<{ logs: WebhookLog[]; total: number }> {
  const supabase = await createServiceClient()
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from('webhook_logs') as any)
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter)
  }

  const { data, count, error } = await query

  if (error) {
    console.error('[webhookLogs] getRecentWebhookLogs error:', error)
    return { logs: [], total: 0 }
  }

  return { logs: (data ?? []) as WebhookLog[], total: count ?? 0 }
}
