import { getSubscriptionPlanStatus } from '@/lib/repositories/subscriptions'

/**
 * Check if a user has an active premium subscription.
 */
export async function isPremiumUser(userId: string): Promise<boolean> {
  const sub = await getSubscriptionPlanStatus(userId)
  if (!sub) return false
  return sub.plan !== 'free' && sub.status === 'active'
}
