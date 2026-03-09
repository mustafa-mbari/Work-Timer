import { createServiceClient } from '@/lib/supabase/server'

export interface ApiQuotaLimit {
  role_name: string
  resource_type: string
  monthly_limit: number
}

/**
 * Get all API quota limits (all roles x resource types).
 */
export async function getAllApiQuotaLimits(): Promise<ApiQuotaLimit[]> {
  const supabase = await createServiceClient()

  const { data, error } = await supabase.rpc('get_all_api_quota_limits')

  if (error) {
    console.error('[admin/apiQuota] get_all_api_quota_limits RPC error:', error)
    return []
  }

  return (data ?? []) as ApiQuotaLimit[]
}

/**
 * Upsert a single quota limit.
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
    console.error('[admin/apiQuota] upsert_api_quota_limit RPC error:', error)
    return { error: error.message }
  }

  return {}
}
