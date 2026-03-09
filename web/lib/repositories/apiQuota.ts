import { createServiceClient } from '@/lib/supabase/server'
import type { ApiResourceType, ApiQuotaItem, ApiQuotaResult, DbApiQuotaLimit } from '@/lib/shared/types'
import { currentYearMonth } from '@/lib/repositories/exportUsage'

/**
 * Atomically check and increment the API quota counter for a resource.
 * Returns { allowed, used, limit, remaining }.
 * Fails open on DB errors — quota system should not block users during outages.
 */
export async function checkApiQuota(
  userId: string,
  resourceType: ApiResourceType,
): Promise<ApiQuotaResult> {
  const supabase = await createServiceClient()
  const ym = currentYearMonth()

  const { data, error } = await supabase.rpc('check_api_quota', {
    p_user_id: userId,
    p_resource_type: resourceType,
    p_year_month: ym,
  })

  if (error) {
    console.error('[apiQuota] check_api_quota RPC error:', error)
    // Fail open
    return { allowed: true, used: 0, limit: -1, remaining: -1 }
  }

  return data as ApiQuotaResult
}

/**
 * Get full quota overview for a user (all resource types).
 */
export async function getUserApiQuotas(userId: string): Promise<ApiQuotaItem[]> {
  const supabase = await createServiceClient()
  const ym = currentYearMonth()

  const { data, error } = await supabase.rpc('get_user_api_quotas', {
    p_user_id: userId,
    p_year_month: ym,
  })

  if (error) {
    console.error('[apiQuota] get_user_api_quotas RPC error:', error)
    return []
  }

  return (data ?? []) as ApiQuotaItem[]
}

/**
 * Get all quota limits (admin).
 */
export async function getAllApiQuotaLimits(): Promise<DbApiQuotaLimit[]> {
  const supabase = await createServiceClient()

  const { data, error } = await supabase.rpc('get_all_api_quota_limits')

  if (error) {
    console.error('[apiQuota] get_all_api_quota_limits RPC error:', error)
    return []
  }

  return (data ?? []) as DbApiQuotaLimit[]
}

/**
 * Upsert a single quota limit (admin).
 */
export async function upsertApiQuotaLimit(
  roleName: string,
  resourceType: string,
  monthlyLimit: number,
): Promise<{ error?: string }> {
  const supabase = await createServiceClient()

  const { error } = await supabase.rpc('upsert_api_quota_limit', {
    p_role_name: roleName,
    p_resource_type: resourceType,
    p_monthly_limit: monthlyLimit,
  })

  if (error) {
    console.error('[apiQuota] upsert_api_quota_limit RPC error:', error)
    return { error: error.message }
  }

  return {}
}
