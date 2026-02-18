import { createServiceClient } from '@/lib/supabase/server'

// Calls the RPC function created in migration 003_user_analytics_rpc.sql
// Replaces 150+ lines of JS aggregation in analytics/page.tsx

export async function getUserAnalytics(userId: string) {
  const supabase = await createServiceClient()
  // supabase-js v2.95 cannot resolve RPC arg types from manual Database definition
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  const { data, error } = await (supabase.rpc as Function)('get_user_analytics', { p_user_id: userId })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (error) throw new Error(`get_user_analytics failed: ${(error as any).message}`)
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
