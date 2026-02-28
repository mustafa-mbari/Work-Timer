import { createServiceClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/shared/types'

type Subscription = Database['public']['Tables']['subscriptions']['Row']
type SubscriptionInsert = Database['public']['Tables']['subscriptions']['Insert']

export async function getAllSubscriptions() {
  const supabase = await createServiceClient()
  const { data } = await supabase
    .from('subscriptions')
    .select('user_id, plan, status, granted_by, created_at')
    .range(0, 49999)
    .returns<Pick<Subscription, 'user_id' | 'plan' | 'status' | 'granted_by' | 'created_at'>[]>()
  return data ?? []
}

export async function getAllSubscriptionsWithEmail() {
  const supabase = await createServiceClient()
  const [{ data: subscriptions }, { data: profiles }] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('id, user_id, plan, status, stripe_customer_id, stripe_subscription_id, current_period_end, cancel_at_period_end, granted_by, promo_code_id, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .returns<Subscription[]>(),
    supabase
      .from('profiles')
      .select('id, email, display_name')
      .range(0, 49999)
      .returns<Array<{ id: string; email: string; display_name: string | null }>>(),
  ])

  const profileMap = new Map<string, { email: string; display_name: string | null }>()
  for (const p of profiles ?? []) {
    profileMap.set(p.id, { email: p.email, display_name: p.display_name })
  }

  return (subscriptions ?? []).map(s => ({
    ...s,
    email: profileMap.get(s.user_id)?.email ?? null,
    display_name: profileMap.get(s.user_id)?.display_name ?? null,
  }))
}

export async function upsertSubscription(sub: Partial<SubscriptionInsert> & { user_id: string }) {
  const supabase = await createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase.from('subscriptions') as any).upsert({
    ...sub,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })
}
