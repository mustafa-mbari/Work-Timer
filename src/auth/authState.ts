import { supabase } from './supabaseClient'
import type { AuthSession, SubscriptionInfo } from '@/types'

const SUBSCRIPTION_KEY = 'subscriptionInfo'

// --- Session ---

export async function getSession(): Promise<AuthSession | null> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  // If the access token is expired or about to expire (within 60s),
  // refresh it so subsequent Supabase requests carry a valid JWT.
  // Without this, auth.uid() resolves to NULL on the server and RLS blocks writes.
  const now = Math.floor(Date.now() / 1000)
  if ((session.expires_at ?? 0) - now < 60) {
    const { data: { session: refreshed } } = await supabase.auth.refreshSession()
    if (!refreshed) return null
    return {
      userId: refreshed.user.id,
      email: refreshed.user.email ?? '',
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token ?? '',
      expiresAt: refreshed.expires_at ?? 0,
    }
  }

  return {
    userId: session.user.id,
    email: session.user.email ?? '',
    accessToken: session.access_token,
    refreshToken: session.refresh_token ?? '',
    expiresAt: session.expires_at ?? 0,
  }
}

// Called by background onMessageExternal when website sends AUTH_LOGIN
export async function applyExternalSession(accessToken: string, refreshToken: string): Promise<AuthSession | null> {
  const { data, error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
  if (error || !data.session) return null
  return {
    userId: data.session.user.id,
    email: data.session.user.email ?? '',
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token ?? '',
    expiresAt: data.session.expires_at ?? 0,
  }
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
  await chrome.storage.local.remove([SUBSCRIPTION_KEY, 'syncQueue', 'syncCursor'])
}

// --- Subscription ---

export async function getCachedSubscription(): Promise<SubscriptionInfo | null> {
  const result = await chrome.storage.local.get(SUBSCRIPTION_KEY)
  return (result[SUBSCRIPTION_KEY] as SubscriptionInfo | undefined) ?? null
}

export async function setCachedSubscription(info: SubscriptionInfo): Promise<void> {
  await chrome.storage.local.set({ [SUBSCRIPTION_KEY]: info })
}

type SubscriptionRow = {
  plan: string
  status: string
  current_period_end: string | null
  cancel_at_period_end: boolean
  granted_by: string | null
}

export async function refreshSubscription(): Promise<SubscriptionInfo | null> {
  const session = await getSession()
  if (!session) return null

  const result = await supabase
    .from('subscriptions')
    .select('plan, status, current_period_end, cancel_at_period_end, granted_by')
    .eq('user_id', session.userId)
    .single()

  const data = result.data as SubscriptionRow | null
  if (!data) return null

  const info: SubscriptionInfo = {
    plan: data.plan as SubscriptionInfo['plan'],
    status: data.status as SubscriptionInfo['status'],
    currentPeriodEnd: data.current_period_end ?? null,
    cancelAtPeriodEnd: data.cancel_at_period_end ?? false,
    grantedBy: (data.granted_by as SubscriptionInfo['grantedBy']) ?? null,
  }

  await setCachedSubscription(info)
  return info
}
