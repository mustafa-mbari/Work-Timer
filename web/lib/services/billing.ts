import { getSubscriptionPlanStatus } from '@/lib/repositories/subscriptions'

/**
 * Fetch subscription status once, derive both premium and allIn flags.
 * Avoids duplicate queries when both are needed on the same page.
 */
export async function getSubscriptionFlags(userId: string): Promise<{ isPremium: boolean; isAllIn: boolean }> {
  const sub = await getSubscriptionPlanStatus(userId)
  if (!sub || sub.status !== 'active') return { isPremium: false, isAllIn: false }
  return {
    isPremium: sub.plan !== 'free',
    isAllIn: sub.plan.startsWith('allin'),
  }
}

/**
 * Check if a user has an active premium subscription.
 * All-in plans are also premium.
 */
export async function isPremiumUser(userId: string): Promise<boolean> {
  const sub = await getSubscriptionPlanStatus(userId)
  if (!sub) return false
  return sub.plan !== 'free' && sub.status === 'active'
}

/**
 * Check if a user has an active All-In subscription (includes group features).
 */
export async function isAllInUser(userId: string): Promise<boolean> {
  const sub = await getSubscriptionPlanStatus(userId)
  if (!sub) return false
  return sub.plan.startsWith('allin') && sub.status === 'active'
}
