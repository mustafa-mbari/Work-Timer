import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/shared/types'

type Subscription = Database['public']['Tables']['subscriptions']['Row']
type SubscriptionInsert = Database['public']['Tables']['subscriptions']['Insert']

// -- User-scoped queries (RLS enforced) --

export async function getUserSubscription(userId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('subscriptions')
    .select('plan, status, current_period_end, cancel_at_period_end')
    .eq('user_id', userId)
    .single<Pick<Subscription, 'plan' | 'status' | 'current_period_end' | 'cancel_at_period_end'>>()
  return { data, error }
}

export async function getUserSubscriptionForBilling(userId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('subscriptions')
    .select('plan, status, current_period_end, cancel_at_period_end, stripe_customer_id, granted_by')
    .eq('user_id', userId)
    .single<Pick<Subscription, 'plan' | 'status' | 'current_period_end' | 'cancel_at_period_end' | 'stripe_customer_id' | 'granted_by'>>()
  return { data, error }
}

export async function getStripeSubscriptionInfo(userId: string): Promise<Pick<Subscription, 'stripe_subscription_id' | 'stripe_customer_id'> | null> {
  const supabase = await createServiceClient()
  const { data } = await supabase
    .from('subscriptions')
    .select('stripe_subscription_id, stripe_customer_id')
    .eq('user_id', userId)
    .single<Pick<Subscription, 'stripe_subscription_id' | 'stripe_customer_id'>>()
  return data ?? null
}

export async function getStripeCustomerId(userId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .single<Pick<Subscription, 'stripe_customer_id'>>()
  return data?.stripe_customer_id ?? null
}

// -- Service-role queries (bypass RLS) --

export async function getSubscriptionPlanStatus(userId: string) {
  const supabase = await createServiceClient()
  const { data } = await supabase
    .from('subscriptions')
    .select('plan, status')
    .eq('user_id', userId)
    .single<Pick<Subscription, 'plan' | 'status'>>()
  return data
}

// supabase-js v2.95 resolves Insert/Update types to `never` for hand-crafted Database types.
// We use `as any` on .from() for mutation operations only; data types are still validated
// via the SubscriptionInsert/Subscription types on the input parameters.

export async function upsertSubscription(sub: Partial<SubscriptionInsert> & { user_id: string }) {
  const supabase = await createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase.from('subscriptions') as any).upsert({
    ...sub,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })
}

export async function updateSubscriptionByStripeId(stripeSubscriptionId: string, updates: Partial<Subscription>) {
  const supabase = await createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (supabase.from('subscriptions') as any)
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', stripeSubscriptionId)
    .select('id')
  if (!result.error && (!result.data || result.data.length === 0)) {
    console.warn('[subscriptions] updateByStripeId matched 0 rows for:', stripeSubscriptionId)
  }
  return result
}

/**
 * Expire non-Stripe subscriptions where current_period_end has passed.
 * Used by the daily cron job. Only targets admin grants and promo subs
 * (Stripe manages its own lifecycle via webhooks).
 */
export async function expireOverdueSubscriptions() {
  const supabase = await createServiceClient()
  const { data, error } = await (supabase.from('subscriptions') as any)
    .update({ status: 'expired', plan: 'free', updated_at: new Date().toISOString() })
    .in('status', ['active', 'trialing'])
    .not('current_period_end', 'is', null)
    .lt('current_period_end', new Date().toISOString())
    .neq('granted_by', 'stripe')
    .select('user_id, plan, granted_by')
  return { expired: data ?? [], error }
}
