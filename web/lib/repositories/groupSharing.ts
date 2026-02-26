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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('group_sharing_settings') as any)
    .upsert({
      group_id: groupId,
      user_id: userId,
      sharing_enabled: settings.sharing_enabled,
      shared_project_ids: settings.shared_project_ids,
      updated_at: new Date().toISOString(),
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
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const today = `${yyyy}-${mm}-${dd}`

  // Week start (Monday)
  const mon = new Date(now)
  mon.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  const weekStart = `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, '0')}-${String(mon.getDate()).padStart(2, '0')}`

  // Month start
  const monthStart = `${yyyy}-${mm}-01`

  // Single query: all entries from month start covers today + week + month
  type Row = { date: string; duration: number | null }
  const { data } = await supabase
    .from('time_entries')
    .select('date, duration')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .gte('date', monthStart)
    .returns<Row[]>()

  let todayMs = 0, weekMs = 0, monthMs = 0
  for (const e of data ?? []) {
    const d = e.duration ?? 0
    monthMs += d
    if (e.date >= weekStart) weekMs += d
    if (e.date === today) todayMs += d
  }

  return {
    today_hours: Math.round((todayMs / 3_600_000) * 100) / 100,
    week_hours:  Math.round((weekMs / 3_600_000) * 100) / 100,
    month_hours: Math.round((monthMs / 3_600_000) * 100) / 100,
  }
}

// ─── Group Members Summary RPC ───────────────────────────────────────────────

type MemberSummary = Database['public']['Functions']['get_group_members_summary']['Returns']

export async function getGroupMembersSummary(
  groupId: string,
  adminId: string,
): Promise<MemberSummary> {
  const supabase = await createServiceClient()
  const { data, error } = await (supabase.rpc as Function)('get_group_members_summary', {
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
  const { data, error } = await (supabase.rpc as Function)('get_group_member_entries', {
    p_group_id: groupId,
    p_admin_id: adminId,
    p_member_id: memberId,
    ...(dateFrom && { p_date_from: dateFrom }),
    ...(dateTo && { p_date_to: dateTo }),
  })
  if (error) return { entries: [], error: error.message }
  return data as MemberEntries
}
