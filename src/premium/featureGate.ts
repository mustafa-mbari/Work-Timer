import type { SubscriptionInfo } from '@/types'
import { FREE_LIMITS, PREMIUM_LIMITS } from '@shared/constants'
import type { Limits } from '@shared/constants'
import { getCachedSubscription } from '@/auth/authState'

export function isPremiumSubscription(sub: SubscriptionInfo | null): boolean {
  if (!sub) return false
  return (
    sub.plan !== 'free' &&
    (sub.status === 'active' || sub.status === 'trialing')
  )
}

export function getLimits(sub: SubscriptionInfo | null): Limits {
  return isPremiumSubscription(sub) ? PREMIUM_LIMITS : FREE_LIMITS
}

export async function isCurrentUserPremium(): Promise<boolean> {
  const sub = await getCachedSubscription()
  return isPremiumSubscription(sub)
}

export async function getCurrentLimits(): Promise<Limits> {
  const sub = await getCachedSubscription()
  return getLimits(sub)
}
