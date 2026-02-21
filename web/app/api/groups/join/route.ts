import { NextRequest, NextResponse } from 'next/server'
import { requireAuthApi } from '@/lib/services/auth'
import { getGroupByJoinCode, addGroupMember, getGroupMemberCount } from '@/lib/repositories/groups'
import { isAllInUser } from '@/lib/services/groups'
import { joinGroupSchema, parseBody } from '@/lib/validation'

export async function POST(request: NextRequest) {
  const user = await requireAuthApi()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const allIn = await isAllInUser(user.id)
  if (!allIn) {
    return NextResponse.json({ error: 'All-In subscription required to join groups' }, { status: 403 })
  }

  const parsed = parseBody(joinGroupSchema, await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const group = await getGroupByJoinCode(parsed.data.code)
  if (!group) return NextResponse.json({ error: 'Invalid join code' }, { status: 404 })

  // Check capacity
  const memberCount = await getGroupMemberCount(group.id)
  if (memberCount >= group.max_members) {
    return NextResponse.json({ error: 'Group is at maximum capacity' }, { status: 400 })
  }

  const { error } = await addGroupMember(group.id, user.id)
  if (error) {
    // Unique constraint = already a member
    if (error.code === '23505') {
      return NextResponse.json({ error: 'You are already a member of this group' }, { status: 400 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ group_id: group.id, group_name: group.name }, { status: 200 })
}
