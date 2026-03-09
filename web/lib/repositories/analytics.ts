import { createClient } from '@/lib/supabase/server'

// Calls the RPC function created in migration 003_user_analytics_rpc.sql
// Updated in migration 010 to accept optional date-range parameters.
// Switched from service role to user client (043) so auth.uid() is populated.

export async function getUserAnalytics(userId: string, dateFrom?: string, dateTo?: string, timezone?: string) {
  const supabase = await createClient()
  const args: Record<string, string> = { p_user_id: userId }
  if (dateFrom)  args.p_date_from = dateFrom
  if (dateTo)    args.p_date_to   = dateTo
  // Always pass p_timezone to avoid PostgREST ambiguity between 3-param and 4-param overloads
  args.p_timezone = timezone || 'UTC'
  const { data, error } = await supabase.rpc('get_user_analytics', args)
  if (error) throw new Error(`get_user_analytics failed: ${error.message}`)
  return data as {
    total_hours: number
    total_entries: number
    unique_days: number
    avg_session_ms: number
    streak: number
    weekly_data: Array<{ week: string; hours: number }> | null
    type_data: Array<{ name: string; hours: number; count: number }> | null
    day_of_week_data: Array<{ name: string; hours: number }> | null
    daily_data: Array<{ date: string; hours: number }> | null
    daily_project_data: Array<{ date: string; project_id: string; project_name: string; project_color: string; hours: number }> | null
    peak_hours_data: Array<{ hour: string; count: number }> | null
    project_stats: Array<{
      name: string
      color: string
      hours: number
      entries: number
      target_hours: number | null
    }> | null
  }
}
