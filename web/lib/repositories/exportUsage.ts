import { createServiceClient } from '@/lib/supabase/server'
import type { ExportRole, ExportType, ExportQuota, ExportQuotaItem, TrackExportResult } from '@/lib/shared/types'

/** Returns the current UTC year-month string, e.g. '2026-03' */
export function currentYearMonth(): string {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

/**
 * Resolve the export role for a user.
 * Returns 'free' | 'pro' | 'team'.
 */
export async function getUserExportRole(userId: string): Promise<ExportRole> {
  const supabase = await createServiceClient()
  const { data, error } = await supabase.rpc('get_user_export_role', {
    p_user_id: userId,
  })
  if (error) return 'free'
  return (data as ExportRole) ?? 'free'
}

/**
 * Fetch the full monthly quota for a user — used/limit/remaining per export type.
 * Uses the current UTC month.
 */
export async function getUserExportQuota(userId: string): Promise<ExportQuota> {
  const supabase = await createServiceClient()
  const ym = currentYearMonth()

  const [roleResult, quotaResult] = await Promise.all([
    supabase.rpc('get_user_export_role', { p_user_id: userId }),
    supabase.rpc('get_user_export_quota', {
      p_user_id: userId,
      p_year_month: ym,
    }),
  ])

  const role: ExportRole = (roleResult.data as ExportRole) ?? 'free'
  const items = (quotaResult.data ?? []) as ExportQuotaItem[]

  return { role, year_month: ym, items }
}

/**
 * Atomically check and increment the export counter.
 * Returns { allowed, used, limit }.
 * If allowed is false, the counter was NOT incremented.
 * Fails open on DB errors (logs error, returns allowed:true) to avoid
 * blocking paying users during outages.
 */
export async function trackExport(
  userId: string,
  type: ExportType,
): Promise<TrackExportResult> {
  const supabase = await createServiceClient()
  const ym = currentYearMonth()

  const { data, error } = await supabase.rpc('track_export_usage', {
    p_user_id:     userId,
    p_export_type: type,
    p_year_month:  ym,
  })

  if (error) {
    console.error('[trackExport] RPC error:', error)
    // Fail open — DB outage should not block legitimate exports
    return { allowed: true, used: 0, limit: 0 }
  }

  return data as TrackExportResult
}
