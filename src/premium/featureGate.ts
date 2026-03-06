import type { SubscriptionInfo } from '@/types'
import { FREE_LIMITS, PREMIUM_LIMITS, GUEST_LIMITS } from '@shared/constants'
import type { Limits } from '@shared/constants'
import { getCachedSubscription } from '@/auth/authState'
import { isGuestMode } from '@/storage'

export function isPremiumSubscription(sub: SubscriptionInfo | null): boolean {
  if (!sub) return false
  const isActive = sub.status === 'active' || sub.status === 'trialing'
  const isUnexpired = !sub.currentPeriodEnd || new Date(sub.currentPeriodEnd) > new Date()
  return sub.plan !== 'free' && isActive && isUnexpired
}

export function getLimits(sub: SubscriptionInfo | null): Limits {
  return isPremiumSubscription(sub) ? PREMIUM_LIMITS : FREE_LIMITS
}

export async function isCurrentUserPremium(): Promise<boolean> {
  const sub = await getCachedSubscription()
  return isPremiumSubscription(sub)
}

export async function getCurrentLimits(): Promise<Limits> {
  if (await isGuestMode()) return GUEST_LIMITS
  const sub = await getCachedSubscription()
  return getLimits(sub)
}
