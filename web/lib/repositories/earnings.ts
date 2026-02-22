import { createServiceClient } from '@/lib/supabase/server'

export type EarningsReport = {
  currency: string
  default_rate: number
  projects: Array<{
    id: string
    name: string
    color: string
    hours: number
    rate: number
    total: number
  }>
  grand_total: number
  total_hours: number
  total_projects: number
  daily_earnings: Array<{ date: string; total: number }> | null
}

export async function getEarningsReport(
  userId: string,
  dateFrom?: string,
  dateTo?: string,
): Promise<EarningsReport> {
  const supabase = await createServiceClient()
  const args: Record<string, string> = { p_user_id: userId }
  if (dateFrom) args.p_date_from = dateFrom
  if (dateTo) args.p_date_to = dateTo

  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  const { data, error } = await (supabase.rpc as Function)('get_earnings_report', args)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (error) throw new Error(`get_earnings_report failed: ${(error as any).message}`)
  return data as EarningsReport
}
