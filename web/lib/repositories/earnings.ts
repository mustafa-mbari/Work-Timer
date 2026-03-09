import { createServiceClient } from '@/lib/supabase/server'

export type EarningsReport = {
  currency: string
  default_rate: number
  group_by: 'tag' | 'project'
  items: Array<{
    id: string
    name: string
    color: string
    hours: number
    rate: number
    total: number
  }>
  grand_total: number
  total_hours: number
  total_items: number
  daily_earnings: Array<{ date: string; item_id: string; item_name: string; item_color: string; total: number }> | null
}

export async function getEarningsReport(
  userId: string,
  dateFrom?: string,
  dateTo?: string,
  groupBy: 'tag' | 'project' = 'tag',
): Promise<EarningsReport> {
  const supabase = await createServiceClient()
  const args: Record<string, string> = { p_user_id: userId, p_group_by: groupBy }
  if (dateFrom) args.p_date_from = dateFrom
  if (dateTo) args.p_date_to = dateTo

  const { data, error } = await supabase.rpc('get_earnings_report', args)
  if (error) throw new Error(`get_earnings_report failed: ${error.message}`)
  return data as EarningsReport
}
