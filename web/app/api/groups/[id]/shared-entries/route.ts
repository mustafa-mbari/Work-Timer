import { NextRequest, NextResponse } from 'next/server'
import { requireAuthApi } from '@/lib/services/auth'
import { getGroupMembersSummary, getGroupMemberEntries } from '@/lib/repositories/groupSharing'
import { getGroupById } from '@/lib/repositories/groups'
import { createServiceClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

// GET shared entries summary or detail
// ?memberId=xxx  → individual member entries (with optional dateFrom/dateTo)
// ?period=today  → adds today_hours to each member in the summary
export async function GET(request: NextRequest, { params }: Params) {
  const user = await requireAuthApi()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const group = await getGroupById(id, user.id)
  if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 })

  if (group.userRole !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { searchParams } = request.nextUrl
  const memberId = searchParams.get('memberId')

  // If memberId provided, return detailed entries for that member
  if (memberId) {
    const dateFrom = searchParams.get('dateFrom') ?? undefined
    const dateTo = searchParams.get('dateTo') ?? undefined
    const result = await getGroupMemberEntries(id, user.id, memberId, dateFrom, dateTo)
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json(result)
  }

  // Otherwise return members summary
  const result = await getGroupMembersSummary(id, user.id)
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })

  // If ?period=today, compute today's hours for each sharing member
  const period = searchParams.get('period')
  if (period === 'today' && result.members?.length) {
    const supabase = await createServiceClient()
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    // Get sharing settings for all members
    type SettingsRow = { user_id: string; shared_project_ids: string[] | null }
    const { data: settings } = await supabase
      .from('group_sharing_settings')
      .select('user_id, shared_project_ids')
      .eq('group_id', id)
      .returns<SettingsRow[]>()

    const settingsMap = new Map((settings ?? []).map(s => [s.user_id, s]))
    const sharingMembers = result.members.filter(
      (m: { user_id: string; sharing_enabled: boolean }) => m.sharing_enabled
    )

    if (sharingMembers.length > 0) {
      const memberIds = sharingMembers.map((m: { user_id: string }) => m.user_id)

      type EntryRow = { user_id: string; duration: number | null; project_id: string | null }
      const { data: entries } = await supabase
        .from('time_entries')
        .select('user_id, duration, project_id')
        .in('user_id', memberIds)
        .eq('date', today)
        .is('deleted_at', null)
        .returns<EntryRow[]>()

      // Aggregate per user, respecting shared_project_ids filter
      const todayMap = new Map<string, number>()
      for (const e of entries ?? []) {
        const ms = settingsMap.get(e.user_id)
        if (ms?.shared_project_ids && !ms.shared_project_ids.includes(e.project_id ?? '')) continue
        todayMap.set(e.user_id, (todayMap.get(e.user_id) ?? 0) + (e.duration ?? 0))
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(result as any).members = result.members.map(
        (m: { user_id: string }) => ({
          ...m,
          today_hours: Math.round(((todayMap.get(m.user_id) ?? 0) / 3_600_000) * 100) / 100,
        })
      )
    }
  }

  return NextResponse.json(result)
}
