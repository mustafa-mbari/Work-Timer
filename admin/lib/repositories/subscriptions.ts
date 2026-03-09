import { createServiceClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/shared/types'

type Subscription = Database['public']['Tables']['subscriptions']['Row']
type SubscriptionInsert = Database['public']['Tables']['subscriptions']['Insert']

export async function getSubscriptionsForUserIds(userIds: string[]) {
  if (userIds.length === 0) return []
  const supabase = await createServiceClient()
  const { data } = await supabase
    .from('subscriptions')
    .select('user_id, plan, status, granted_by, created_at')
    .in('user_id', userIds)
    .returns<Pick<Subscription, 'user_id' | 'plan' | 'status' | 'granted_by' | 'created_at'>[]>()
  return data ?? []
}

export async function getAllSubscriptionsWithEmail(page = 1, pageSize = 50) {
  const supabase = await createServiceClient()
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data: subscriptions, count } = await supabase
    .from('subscriptions')
    .select('id, user_id, plan, status, stripe_customer_id, stripe_subscription_id, current_period_end, cancel_at_period_end, granted_by, promo_code_id, created_at, updated_at', { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range(from, to)
    .returns<Subscription[]>()

  // Only fetch profiles for user IDs in this page (not all profiles)
  const userIds = (subscriptions ?? []).map(s => s.user_id)
  const { data: profiles } = userIds.length > 0
    ? await supabase
        .from('profiles')
        .select('id, email, display_name')
        .in('id', userIds)
        .returns<Array<{ id: string; email: string; display_name: string | null }>>()
    : { data: [] as Array<{ id: string; email: string; display_name: string | null }> }

  const profileMap = new Map<string, { email: string; display_name: string | null }>()
  for (const p of profiles ?? []) {
    profileMap.set(p.id, { email: p.email, display_name: p.display_name })
  }

  return {
    data: (subscriptions ?? []).map(s => ({
      ...s,
      email: profileMap.get(s.user_id)?.email ?? null,
      display_name: profileMap.get(s.user_id)?.display_name ?? null,
    })),
    total: count ?? 0,
    page,
    pageSize,
  }
}

export async function upsertSubscription(sub: SubscriptionInsert) {
  const supabase = await createServiceClient()
  return supabase.from('subscriptions').upsert({
    ...sub,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })
}
