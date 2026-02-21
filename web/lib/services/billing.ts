import { getSubscriptionPlanStatus } from '@/lib/repositories/subscriptions'

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
