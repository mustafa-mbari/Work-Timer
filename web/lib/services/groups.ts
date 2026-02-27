import { getSubscriptionPlanStatus } from '@/lib/repositories/subscriptions'
import { getGroupMemberCount } from '@/lib/repositories/groups'

/**
 * Check if a user has an active Team/All-In subscription (includes group features).
 */
export async function isAllInUser(userId: string): Promise<boolean> {
  const sub = await getSubscriptionPlanStatus(userId)
  if (!sub) return false
  return (sub.plan.startsWith('allin') || sub.plan.startsWith('team_')) && sub.status === 'active'
}

/**
 * Check if the user can create a group (requires all-in subscription).
 */
export async function canCreateGroup(userId: string): Promise<boolean> {
  return isAllInUser(userId)
}

/**
 * Check if a group has room for more members.
 */
export async function canAddMember(groupId: string, maxMembers: number): Promise<boolean> {
  const count = await getGroupMemberCount(groupId)
  return count < maxMembers
}
