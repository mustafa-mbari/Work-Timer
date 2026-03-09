import { createServiceClient } from '@/lib/supabase/server'
import type { Database, DbGroupSharingSettings } from '@/lib/shared/types'

export type SharingSettings = Pick<DbGroupSharingSettings, 'sharing_enabled' | 'shared_project_ids'>

export async function getSharingSettings(
  groupId: string,
  userId: string,
): Promise<SharingSettings> {
  const supabase = await createServiceClient()
  const { data } = await supabase
    .from('group_sharing_settings')
    .select('sharing_enabled, shared_project_ids')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .single<SharingSettings>()
  return data ?? { sharing_enabled: false, shared_project_ids: null }
}

export async function upsertSharingSettings(
  groupId: string,
  userId: string,
  settings: { sharing_enabled: boolean; shared_project_ids: string[] | null },
): Promise<{ error: { message: string } | null }> {
  const supabase = await createServiceClient()
  const { error } = await supabase.from('group_sharing_settings')
    .upsert({
      group_id: groupId,
      user_id: userId,
      sharing_enabled: settings.sharing_enabled,
      shared_project_ids: settings.shared_project_ids,
    }, { onConflict: 'group_id,user_id' })
  return { error }
}

// ─── Member Own Stats ────────────────────────────────────────────────────────

export interface OwnStats {
  today_hours: number
  week_hours: number
  month_hours: number
}

export async function getUserOwnStats(userId: string): Promise<OwnStats> {
  const supabase = await createServiceClient()
  const { data, error } = await supabase.rpc('get_user_own_stats', {
    p_user_id: userId,
  })
  
  if (error) {
    console.error('Error fetching own stats:', error)
    return { today_hours: 0, week_hours: 0, month_hours: 0 }
  }

  return data as OwnStats
}

// ─── Group Members Summary RPC ───────────────────────────────────────────────

type MemberSummary = Database['public']['Functions']['get_group_members_summary']['Returns']

export async function getGroupMembersSummary(
  groupId: string,
  adminId: string,
): Promise<MemberSummary> {
  const supabase = await createServiceClient()
  const { data, error } = await supabase.rpc('get_group_members_summary', {
    p_group_id: groupId,
    p_admin_id: adminId,
  })
  if (error) return { members: [], error: error.message }
  return data as MemberSummary
}

type MemberEntries = Database['public']['Functions']['get_group_member_entries']['Returns']

export async function getGroupMemberEntries(
  groupId: string,
  adminId: string,
  memberId: string,
  dateFrom?: string,
  dateTo?: string,
): Promise<MemberEntries> {
  const supabase = await createServiceClient()
  const { data, error } = await supabase.rpc('get_group_member_entries', {
    p_group_id: groupId,
    p_admin_id: adminId,
    p_member_id: memberId,
    ...(dateFrom && { p_date_from: dateFrom }),
    ...(dateTo && { p_date_to: dateTo }),
  })
  if (error) return { entries: [], error: error.message }
  return data as MemberEntries
}
