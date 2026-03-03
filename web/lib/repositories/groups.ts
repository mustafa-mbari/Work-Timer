import { createServiceClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/shared/types'

type Group = Database['public']['Tables']['groups']['Row']
type GroupMember = Database['public']['Tables']['group_members']['Row']

export type GroupWithMeta = Group & { member_count: number; role: string }

export async function getUserGroups(userId: string): Promise<GroupWithMeta[]> {
  const supabase = await createServiceClient()

  interface MembershipWithGroup {
    group_id: string
    role: string
    groups: Group | null
  }
  
  const { data: memberships, error: memError } = await supabase
    .from('group_members')
    .select('group_id, role, groups(*)')
    .eq('user_id', userId)
    .returns<MembershipWithGroup[]>()

  if (memError || !memberships?.length) return []

  const groupIds = memberships.map(m => m.group_id)
  
  // Get counts for these groups in one query
  const { data: countRows } = await supabase
    .from('group_members')
    .select('group_id')
    .in('group_id', groupIds)
    .returns<Pick<GroupMember, 'group_id'>[]>()

  const counts = new Map<string, number>()
  for (const row of countRows ?? []) {
    counts.set(row.group_id, (counts.get(row.group_id) ?? 0) + 1)
  }

  return memberships
    .filter(m => m.groups)
    .map(m => {
      const g = m.groups!
      return {
        ...g,
        role: m.role,
        member_count: counts.get(m.group_id) ?? 0,
      }
    })
}

export async function getGroupById(groupId: string, userId: string) {
  const supabase = await createServiceClient()

  // Verify membership
  const { data: membership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .single<Pick<GroupMember, 'role'>>()

  if (!membership) return null

  const { data: group } = await supabase
    .from('groups')
    .select('*')
    .eq('id', groupId)
    .single<Group>()

  if (!group) return null

  return { ...group, userRole: membership.role }
}

export async function getGroupMembers(groupId: string) {
  const supabase = await createServiceClient()
  
  interface MemberWithProfile {
    user_id: string
    role: string
    created_at: string
    profiles: { email: string; display_name: string | null } | null
  }

  // Join with profiles to get data in one query
  const { data, error } = await supabase
    .from('group_members')
    .select('user_id, role, created_at, profiles(email, display_name)')
    .eq('group_id', groupId)
    .returns<MemberWithProfile[]>()

  if (error || !data?.length) return []

  return data.map(m => {
    return {
      user_id: m.user_id,
      role: m.role,
      created_at: m.created_at,
      email: m.profiles?.email ?? '',
      display_name: m.profiles?.display_name ?? null,
    }
  })
}

export async function createGroup(name: string, ownerId: string) {
  const supabase = await createServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: group, error: groupError } = await (supabase.from('groups') as any)
    .insert({ name, owner_id: ownerId })
    .select('*')
    .single()

  if (groupError) return { data: null, error: groupError }

  // Add owner as admin member
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: memberError } = await (supabase.from('group_members') as any)
    .insert({ group_id: group.id, user_id: ownerId, role: 'admin' })

  if (memberError) return { data: null, error: memberError }

  return { data: group as Group, error: null }
}

export async function updateGroup(groupId: string, userId: string, data: {
  name?: string
  share_frequency?: 'daily' | 'weekly' | 'monthly' | null
  share_deadline_day?: number | null
}) {
  const supabase = await createServiceClient()

  // Verify the user is an admin of this group (owner or admin role)
  const { data: membership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .single<Pick<GroupMember, 'role'>>()

  if (!membership || membership.role !== 'admin') {
    return { error: { message: 'Not authorized to update this group' } }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('groups') as any)
    .update(data)
    .eq('id', groupId)
  return { error }
}

export async function deleteGroup(groupId: string, ownerId: string) {
  const supabase = await createServiceClient()
  const { error } = await supabase
    .from('groups')
    .delete()
    .eq('id', groupId)
    .eq('owner_id', ownerId)
  return { error }
}

export async function addGroupMember(groupId: string, userId: string, role: string = 'member') {
  const supabase = await createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('group_members') as any)
    .insert({ group_id: groupId, user_id: userId, role })
  return { error }
}

export async function removeGroupMember(groupId: string, userId: string) {
  const supabase = await createServiceClient()
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId)
  return { error }
}

export async function updateMemberRole(groupId: string, userId: string, role: string) {
  const supabase = await createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('group_members') as any)
    .update({ role })
    .eq('group_id', groupId)
    .eq('user_id', userId)
  return { error }
}

export async function getGroupByJoinCode(code: string) {
  const supabase = await createServiceClient()
  const { data } = await supabase
    .from('groups')
    .select('*')
    .eq('join_code', code)
    .single<Group>()
  return data
}

export async function regenerateJoinCode(groupId: string, ownerId: string) {
  const supabase = await createServiceClient()
  const newCode = Math.random().toString(36).slice(2, 10)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('groups') as any)
    .update({ join_code: newCode })
    .eq('id', groupId)
    .eq('owner_id', ownerId)
  return { code: newCode, error }
}

export async function getGroupMemberCount(groupId: string): Promise<number> {
  const supabase = await createServiceClient()
  const { count } = await supabase
    .from('group_members')
    .select('group_id', { count: 'exact', head: true })
    .eq('group_id', groupId)
  return count ?? 0
}
