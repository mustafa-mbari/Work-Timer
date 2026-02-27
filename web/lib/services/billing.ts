import { getSubscriptionPlanStatus } from '@/lib/repositories/subscriptions'

/** Returns true for any plan that includes group/team features (allin_* or team_*). */
function isTeamPlan(plan: string): boolean {
  return plan.startsWith('allin') || plan.startsWith('team_')
}

/**
 * Fetch subscription status once, derive both premium and allIn flags.
 * Avoids duplicate queries when both are needed on the same page.
 */
export async function getSubscriptionFlags(userId: string): Promise<{ isPremium: boolean; isAllIn: boolean }> {
  const sub = await getSubscriptionPlanStatus(userId)
  if (!sub || sub.status !== 'active') return { isPremium: false, isAllIn: false }
  return {
    isPremium: sub.plan !== 'free',
    isAllIn: isTeamPlan(sub.plan),
  }
}

/**
 * Check if a user has an active premium subscription.
 * All-in and team plans are also premium.
 */
export async function isPremiumUser(userId: string): Promise<boolean> {
  const sub = await getSubscriptionPlanStatus(userId)
  if (!sub) return false
  return sub.plan !== 'free' && sub.status === 'active'
}

/**
 * Check if a user has an active Team/All-In subscription (includes group features).
 */
export async function isAllInUser(userId: string): Promise<boolean> {
  const sub = await getSubscriptionPlanStatus(userId)
  if (!sub) return false
  return isTeamPlan(sub.plan) && sub.status === 'active'
}
