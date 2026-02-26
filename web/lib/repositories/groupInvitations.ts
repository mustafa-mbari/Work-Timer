import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/shared/types'

type GroupInvitation = Database['public']['Tables']['group_invitations']['Row']

export type InvitationWithGroup = GroupInvitation & { group_name: string }

export async function createInvitation(groupId: string, email: string, invitedBy: string) {
  const supabase = await createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('group_invitations') as any)
    .insert({
      group_id: groupId,
      email: email.toLowerCase(),
      invited_by: invitedBy,
      status: 'pending',
    })
    .select('*')
    .single()
  return { data: data as GroupInvitation | null, error }
}

export async function getGroupInvitations(groupId: string) {
  const supabase = await createServiceClient()
  const { data } = await supabase
    .from('group_invitations')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .returns<GroupInvitation[]>()
  return data ?? []
}

export async function getUserPendingInvitations(email: string): Promise<InvitationWithGroup[]> {
  const supabase = await createServiceClient()
  const { data: invitations } = await supabase
    .from('group_invitations')
    .select('*')
    .eq('email', email.toLowerCase())
    .eq('status', 'pending')
    .returns<GroupInvitation[]>()

  if (!invitations?.length) return []

  // Fetch group names (use service client — invited user is not yet a member so
  // groups_select RLS would block this query with the regular client)
  const groupIds = [...new Set(invitations.map(i => i.group_id))]
  const { data: groups } = await supabase
    .from('groups')
    .select('id, name')
    .in('id', groupIds)
    .returns<Array<{ id: string; name: string }>>()

  const groupMap = new Map(groups?.map(g => [g.id, g.name]) ?? [])

  return invitations.map(inv => ({
    ...inv,
    group_name: groupMap.get(inv.group_id) ?? 'Unknown',
  }))
}

export async function acceptInvitation(invitationId: string, userId: string, userEmail: string) {
  const supabase = await createServiceClient()

  // Get the invitation
  const { data: invitation } = await supabase
    .from('group_invitations')
    .select('*')
    .eq('id', invitationId)
    .eq('email', userEmail.toLowerCase())
    .eq('status', 'pending')
    .single<GroupInvitation>()

  if (!invitation) return { error: { message: 'Invitation not found or already processed' } }

  // Mark invitation as accepted
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('group_invitations') as any)
    .update({ status: 'accepted' })
    .eq('id', invitationId)

  // Add user to group
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('group_members') as any)
    .insert({ group_id: invitation.group_id, user_id: userId, role: 'member' })

  return { error }
}

export async function declineInvitation(invitationId: string, userEmail: string) {
  const supabase = await createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('group_invitations') as any)
    .update({ status: 'declined' })
    .eq('id', invitationId)
    .eq('email', userEmail.toLowerCase())
    .eq('status', 'pending')
  return { error }
}
