/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase v2.95 type workaround for RPC calls */
import { createServiceClient } from '@/lib/supabase/server'

// Calls the RPC functions created in migration 002_admin_rpc.sql
// These replace 11 parallel queries + 80+ lines of JS aggregation

// Helper: supabase-js v2.95 cannot resolve RPC arg types from our manual Database definition.
// Return types are explicitly cast at each call site, preserving type safety.
async function callRpc(name: string, args?: Record<string, unknown>) {
  const supabase = await createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  return (supabase.rpc as Function)(name, args)
}

export async function getPlatformStats() {
  const { data, error } = await callRpc('get_platform_stats')
  if (error) throw new Error(`get_platform_stats failed: ${(error as any).message}`)
  return data as {
    total_entries: number
    total_hours: number
    entry_count_30d: number
    project_count: number
    avg_session_ms: number
  }
}

export async function getActiveUsers(period: string): Promise<number> {
  const { data, error } = await callRpc('get_active_users', { period })
  if (error) throw new Error(`get_active_users failed: ${(error as any).message}`)
  return (data as number) ?? 0
}

export async function getUserGrowth(weeks: number = 8) {
  const { data, error } = await callRpc('get_user_growth', { weeks })
  if (error) throw new Error(`get_user_growth failed: ${(error as any).message}`)
  return (data ?? []) as Array<{ week_start: string; signup_count: number }>
}

export async function getTopUsers(lim: number = 5) {
  const { data, error } = await callRpc('get_top_users', { lim })
  if (error) throw new Error(`get_top_users failed: ${(error as any).message}`)
  return (data ?? []) as Array<{ user_id: string; email: string; total_hours: number }>
}

export async function getEntryTypeBreakdown() {
  const { data, error } = await callRpc('get_entry_type_breakdown')
  if (error) throw new Error(`get_entry_type_breakdown failed: ${(error as any).message}`)
  return (data ?? []) as Array<{ entry_type: string; entry_count: number; total_hours: number }>
}

export async function getPremiumBreakdown() {
  const { data, error } = await callRpc('get_premium_breakdown')
  if (error) throw new Error(`get_premium_breakdown failed: ${(error as any).message}`)
  return data as {
    total_premium: number
    by_plan: Record<string, number> | null
    by_source: Record<string, number> | null
  }
}

export async function getPromoStats() {
  const { data, error } = await callRpc('get_promo_stats')
  if (error) throw new Error(`get_promo_stats failed: ${(error as any).message}`)
  return data as { active_promos: number; total_uses: number }
}

export async function getDomainStats() {
  const { data, error } = await callRpc('get_domain_stats')
  if (error) throw new Error(`get_domain_stats failed: ${(error as any).message}`)
  return data as { active_domains: number }
}

export async function getAuthUserCount(): Promise<number> {
  const supabase = await createServiceClient()
  const { data } = await supabase.auth.admin.listUsers({ perPage: 1 })
  return data?.users?.length ?? 0
}

export async function getAuthUsers(page: number = 1, perPage: number = 15) {
  const supabase = await createServiceClient()
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
  if (error) throw new Error(`listUsers failed: ${error.message}`)
  return data
}

export async function getAllAuthUsers() {
  const supabase = await createServiceClient()
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 10000 })
  if (error) throw new Error(`listUsers failed: ${error.message}`)
  return data?.users ?? []
}

export async function getAggregatedUserStats() {
  const supabase = await createServiceClient()
  const { data } = await supabase
    .from('user_stats')
    .select('total_hours, total_entries, total_projects, active_days, last_active_date')
    .range(0, 49999)
  return data ?? []
}

export async function findAuthUserByEmail(email: string) {
  const supabase = await createServiceClient()
  const { data } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  return data?.users?.find(u => u.email === email) ?? null
}
