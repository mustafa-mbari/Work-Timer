import { NextRequest, NextResponse } from 'next/server'
import { requireAuthApi } from '@/lib/services/auth'
import { getGroupMembersSummary, getGroupMemberEntries } from '@/lib/repositories/groupSharing'
import { getGroupById } from '@/lib/repositories/groups'

type Params = { params: Promise<{ id: string }> }

// GET shared entries summary or detail
// ?memberId=xxx for individual member entries
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
  return NextResponse.json(result)
}
